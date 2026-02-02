import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, ExternalLink, Copy, RefreshCw, Loader2, Zap, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSignedUrl } from "@/hooks/useSignedUrl";
import { supabase } from "@/integrations/supabase/client";

interface Order {
  id: string;
  quantity: number;
  product_id?: string;
  product_name?: string;
  customer_name?: string;
  customer_email?: string;
  payment_proof?: string | null;
  created_at: string;
  auto_delivery?: boolean;
}

interface InventoryCode {
  id: string;
  code: string;
}

interface OrderVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onVerify: (orderId: string, redeemCodes: string[], adminNotes: string) => Promise<void>;
  onReject: (orderId: string, reason: string) => Promise<void>;
}

export const OrderVerificationDialog = ({
  open,
  onOpenChange,
  order,
  onVerify,
  onReject
}: OrderVerificationDialogProps) => {
  const [activeTab, setActiveTab] = useState<"verify" | "reject">("verify");
  const [redeemCodes, setRedeemCodes] = useState<string[]>([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [inventoryCodes, setInventoryCodes] = useState<InventoryCode[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [useAutoDelivery, setUseAutoDelivery] = useState(false);
  const { toast } = useToast();

  // Fetch available codes from inventory for this product
  const fetchInventoryCodes = async () => {
    if (!order?.product_id) return;
    
    setLoadingInventory(true);
    try {
      const { data, error } = await supabase
        .from("redeem_code_inventory")
        .select("id, code")
        .eq("product_id", order.product_id)
        .eq("is_used", false)
        .limit(order.quantity);

      if (error) throw error;
      setInventoryCodes(data || []);
      
      // Auto-enable if enough codes available
      if (data && data.length >= order.quantity) {
        setUseAutoDelivery(true);
        setRedeemCodes(data.map(c => c.code));
      }
    } catch (error) {
      console.error("Error fetching inventory codes:", error);
    } finally {
      setLoadingInventory(false);
    }
  };

  // Generate codes manually when auto-delivery not available
  const generateCodes = () => {
    if (!order) return;
    const codes = Array.from({ length: order.quantity }, () =>
      `RF-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    );
    setRedeemCodes(codes);
    setUseAutoDelivery(false);
  };

  // Load signed URL for payment proof and fetch inventory
  useEffect(() => {
    if (open && order?.payment_proof) {
      setProofLoading(true);
      getSignedUrl("payment-proofs", order.payment_proof).then((url) => {
        setProofUrl(url);
        setProofLoading(false);
      });
    } else {
      setProofUrl(null);
    }

    // Fetch inventory codes when dialog opens
    if (open && order?.product_id) {
      fetchInventoryCodes();
    }
  }, [open, order?.payment_proof, order?.product_id]);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && order) {
      setAdminNotes("");
      setRejectReason("");
      setActiveTab("verify");
      setInventoryCodes([]);
      setUseAutoDelivery(false);
      setRedeemCodes([]);
    } else {
      setRedeemCodes([]);
    }
    onOpenChange(isOpen);
  };

  // Use inventory codes
  const useInventoryCodes = () => {
    setRedeemCodes(inventoryCodes.map(c => c.code));
    setUseAutoDelivery(true);
  };

  const handleVerify = async () => {
    if (!order) return;
    
    // Validate all codes are filled
    if (redeemCodes.length !== order.quantity) {
      toast({
        title: "Error",
        description: `Please provide exactly ${order.quantity} redeem codes`,
        variant: "destructive",
      });
      return;
    }
    
    if (redeemCodes.some(code => !code.trim())) {
      toast({
        title: "Error",
        description: "Please fill in all redeem codes",
        variant: "destructive",
      });
      return;
    }
    
    // Check for duplicate codes
    const uniqueCodes = new Set(redeemCodes.map(c => c.trim().toLowerCase()));
    if (uniqueCodes.size !== redeemCodes.length) {
      toast({
        title: "Error",
        description: "Duplicate codes detected. Each code must be unique.",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    try {
      await onVerify(order.id, redeemCodes, adminNotes);
      toast({ title: "Order verified successfully" });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify order",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!order) return;
    if (!rejectReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }
    
    // Confirm rejection
    if (!window.confirm(`Are you sure you want to reject this order? This will notify the customer.`)) {
      return;
    }
    
    setSubmitting(true);
    try {
      await onReject(order.id, rejectReason);
      toast({ title: "Order rejected", description: "Customer has been notified" });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject order",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateCode = (index: number, value: string) => {
    const newCodes = [...redeemCodes];
    newCodes[index] = value;
    setRedeemCodes(newCodes);
    setUseAutoDelivery(false); // Mark as modified when user edits
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied to clipboard" });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verify Payment</DialogTitle>
          <DialogDescription>
            Review and process this order
          </DialogDescription>
        </DialogHeader>

        {/* Order Info */}
        <Card className="p-4 bg-muted/50">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Customer:</span>
              <p className="font-medium">{order.customer_name || "Unknown"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium truncate">{order.customer_email || "Unknown"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Product:</span>
              <p className="font-medium">{order.product_name || "Unknown"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Quantity:</span>
              <Badge variant="secondary">{order.quantity}</Badge>
            </div>
          </div>
          {order.payment_proof && (
            <div className="mt-3 pt-3 border-t">
              {proofLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading proof...
                </div>
              ) : proofUrl ? (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Payment Proof
                </a>
              ) : (
                <span className="text-muted-foreground text-sm">Unable to load payment proof</span>
              )}
            </div>
          )}
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "verify" | "reject")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="verify" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Verify
            </TabsTrigger>
            <TabsTrigger value="reject" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Reject
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verify" className="space-y-4">
            {/* Auto-delivery indicator */}
            {loadingInventory ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 bg-muted/50 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking code inventory...
              </div>
            ) : inventoryCodes.length >= order.quantity ? (
              <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {inventoryCodes.length} codes available in inventory
                  </span>
                </div>
                {!useAutoDelivery && (
                  <Button variant="outline" size="sm" onClick={useInventoryCodes}>
                    <Package className="h-4 w-4 mr-1" />
                    Use Inventory
                  </Button>
                )}
              </div>
            ) : inventoryCodes.length > 0 ? (
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <Package className="h-4 w-4" />
                <span>Only {inventoryCodes.length} codes in inventory (need {order.quantity})</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <Label>Redeem Codes ({order.quantity} required)</Label>
              <div className="flex gap-1">
                {useAutoDelivery && (
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    From Inventory
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={generateCodes}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Generate New
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {redeemCodes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Click "Generate New" or "Use Inventory" to add codes
                </div>
              ) : (
                redeemCodes.map((code, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={code}
                      onChange={(e) => updateCode(index, e.target.value)}
                      placeholder={`Code ${index + 1}`}
                      disabled={useAutoDelivery}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => copyCode(code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div>
              <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes about this order..."
                rows={2}
              />
            </div>
            <Button 
              onClick={handleVerify} 
              disabled={submitting}
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {submitting ? "Processing..." : "Verify & Issue Codes"}
            </Button>
          </TabsContent>

          <TabsContent value="reject" className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Rejection Reason *</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please explain why this payment is being rejected..."
                rows={4}
              />
            </div>
            <Button 
              variant="destructive"
              onClick={handleReject} 
              disabled={submitting}
              className="w-full"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {submitting ? "Processing..." : "Reject Order"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
