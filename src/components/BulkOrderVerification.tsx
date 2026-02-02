import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Order {
  id: string;
  quantity: number;
  payment_status: string;
  created_at: string;
  product_name: string;
  customer_name: string;
  customer_email: string;
}

export interface BulkOrderVerificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const BulkOrderVerification = ({ open, onOpenChange, onSuccess }: BulkOrderVerificationProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [redeemCodes, setRedeemCodes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ id: string; success: boolean; error?: string }[]>([]);
  const { toast } = useToast();

  const pendingOrders = orders.filter(o => o.payment_status === "pending");

  useEffect(() => {
    if (open) {
      fetchPendingOrders();
    }
  }, [open]);

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("id, quantity, payment_status, created_at, product_id, user_id")
        .eq("payment_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch product and user details
      const productIds = [...new Set(ordersData?.map(o => o.product_id) || [])];
      const userIds = [...new Set(ordersData?.map(o => o.user_id) || [])];

      const [productsRes, profilesRes] = await Promise.all([
        supabase.from("products").select("id, name").in("id", productIds),
        supabase.from("profiles").select("id, full_name, email").in("id", userIds),
      ]);

      const productMap = new Map(productsRes.data?.map(p => [p.id, p]) || []);
      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);

      const enrichedOrders = (ordersData || []).map(order => ({
        id: order.id,
        quantity: order.quantity,
        payment_status: order.payment_status,
        created_at: order.created_at,
        product_name: productMap.get(order.product_id)?.name || "Unknown Product",
        customer_name: profileMap.get(order.user_id)?.full_name || "",
        customer_email: profileMap.get(order.user_id)?.email || "",
      }));

      setOrders(enrichedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({ title: "Error loading orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleAll = () => {
    if (selectedOrders.length === pendingOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map(o => o.id));
    }
  };

  const updateRedeemCodes = (orderId: string, codes: string) => {
    setRedeemCodes(prev => ({ ...prev, [orderId]: codes }));
  };

  const handleBulkVerify = async () => {
    if (selectedOrders.length === 0) {
      toast({ title: "No orders selected", variant: "destructive" });
      return;
    }

    // Validate all selected orders have redeem codes
    const missingCodes = selectedOrders.filter(orderId => {
      const order = pendingOrders.find(o => o.id === orderId);
      const codes = redeemCodes[orderId]?.trim().split('\n').filter(c => c.trim());
      return !codes || codes.length < (order?.quantity || 1);
    });

    if (missingCodes.length > 0) {
      toast({ 
        title: "Missing redeem codes", 
        description: `${missingCodes.length} order(s) don't have enough redeem codes`,
        variant: "destructive" 
      });
      return;
    }

    setProcessing(true);
    setResults([]);

    const { data: { user } } = await supabase.auth.getUser();
    const verificationResults: { id: string; success: boolean; error?: string }[] = [];

    for (const orderId of selectedOrders) {
      try {
        const codes = redeemCodes[orderId]?.trim().split('\n').filter(c => c.trim()) || [];
        
        const { error } = await supabase
          .from("orders")
          .update({
            payment_status: "verified",
            redeem_codes: codes,
            verified_at: new Date().toISOString(),
            verified_by: user?.id,
          })
          .eq("id", orderId);

        if (error) throw error;

        // Send notification
        try {
          await supabase.functions.invoke("send-notification", {
            body: { type: "order_verified", orderId },
          });
        } catch (notifError) {
          console.error("Notification error:", notifError);
        }

        verificationResults.push({ id: orderId, success: true });
      } catch (error) {
        verificationResults.push({ 
          id: orderId, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    setResults(verificationResults);
    setProcessing(false);

    const successCount = verificationResults.filter(r => r.success).length;
    const failCount = verificationResults.filter(r => !r.success).length;

    if (successCount > 0) {
      toast({ 
        title: "Bulk verification complete", 
        description: `${successCount} order(s) verified${failCount > 0 ? `, ${failCount} failed` : ''}` 
      });
    }

    if (successCount === selectedOrders.length) {
      setSelectedOrders([]);
      setRedeemCodes({});
      onSuccess?.();
      fetchPendingOrders();
    }
  };

  const handleClose = () => {
    setSelectedOrders([]);
    setRedeemCodes({});
    setResults([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Order Verification</DialogTitle>
          <DialogDescription>
            Select orders to verify and provide redeem codes for each order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedOrders.length === pendingOrders.length && pendingOrders.length > 0}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm">Select All ({pendingOrders.length} pending)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchPendingOrders} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant="secondary">
                {selectedOrders.length} selected
              </Badge>
            </div>
          </div>

          <ScrollArea className="h-[400px] border rounded-lg p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending orders to verify</p>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => {
                  const result = results.find(r => r.id === order.id);
                  return (
                    <div 
                      key={order.id} 
                      className={`border rounded-lg p-4 transition-colors ${
                        selectedOrders.includes(order.id) ? 'border-primary bg-primary/5' : ''
                      } ${result?.success ? 'border-green-500 bg-green-500/5' : ''} ${
                        result && !result.success ? 'border-red-500 bg-red-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={() => toggleOrder(order.id)}
                          disabled={result?.success}
                        />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{order.product_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.customer_name || order.customer_email}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">Qty: {order.quantity}</Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(order.created_at), "MMM dd, HH:mm")}
                              </p>
                            </div>
                          </div>

                          {selectedOrders.includes(order.id) && !result?.success && (
                            <div>
                              <Label className="text-sm">
                                Redeem Codes ({order.quantity} required, one per line)
                              </Label>
                              <Textarea
                                placeholder={`Enter ${order.quantity} code(s), one per line`}
                                value={redeemCodes[order.id] || ''}
                                onChange={(e) => updateRedeemCodes(order.id, e.target.value)}
                                rows={Math.min(order.quantity, 3)}
                                className="mt-1"
                              />
                            </div>
                          )}

                          {result && (
                            <div className={`flex items-center gap-2 text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                              {result.success ? (
                                <>
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Verified successfully</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>{result.error}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkVerify} 
              disabled={processing || selectedOrders.length === 0}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify {selectedOrders.length} Order(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
