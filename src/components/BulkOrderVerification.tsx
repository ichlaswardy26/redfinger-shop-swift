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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, CheckCircle, AlertTriangle, RefreshCw, Zap, Package } from "lucide-react";
import { format } from "date-fns";

interface Order {
  id: string;
  quantity: number;
  payment_status: string;
  created_at: string;
  product_id: string;
  product_name: string;
  customer_name: string;
  customer_email: string;
}

interface InventoryCode {
  id: string;
  code: string;
}

interface OrderWithInventory extends Order {
  availableCodes: InventoryCode[];
  useAutoDelivery: boolean;
}

export interface BulkOrderVerificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const BulkOrderVerification = ({ open, onOpenChange, onSuccess }: BulkOrderVerificationProps) => {
  const [orders, setOrders] = useState<OrderWithInventory[]>([]);
  const [products, setProducts] = useState<{ id: string; stock: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [redeemCodes, setRedeemCodes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ id: string; success: boolean; error?: string }[]>([]);
  const [showStockConfirm, setShowStockConfirm] = useState(false);
  const [stockSummary, setStockSummary] = useState<{ product: string; current: number; reduce: number; after: number }[]>([]);
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

      const [productsRes, profilesRes, inventoryRes] = await Promise.all([
        supabase.from("products").select("id, name, stock").in("id", productIds),
        supabase.from("profiles").select("id, full_name, email").in("id", userIds),
        supabase.from("redeem_code_inventory").select("id, code, product_id").eq("is_used", false).in("product_id", productIds),
      ]);

      const productMap = new Map(productsRes.data?.map(p => [p.id, p]) || []);
      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      
      // Group inventory codes by product_id
      const inventoryByProduct = (inventoryRes.data || []).reduce((acc, code) => {
        if (!acc[code.product_id]) acc[code.product_id] = [];
        acc[code.product_id].push({ id: code.id, code: code.code });
        return acc;
      }, {} as Record<string, InventoryCode[]>);

      // Store products for stock update
      setProducts(productsRes.data || []);

      const enrichedOrders: OrderWithInventory[] = (ordersData || []).map(order => ({
        id: order.id,
        quantity: order.quantity,
        payment_status: order.payment_status,
        created_at: order.created_at,
        product_id: order.product_id,
        product_name: productMap.get(order.product_id)?.name || "Unknown Product",
        customer_name: profileMap.get(order.user_id)?.full_name || "",
        customer_email: profileMap.get(order.user_id)?.email || "",
        availableCodes: inventoryByProduct[order.product_id] || [],
        useAutoDelivery: false,
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
    // Disable auto-delivery when manually editing
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, useAutoDelivery: false } : o
    ));
  };

  const toggleAutoDelivery = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (!order.useAutoDelivery && order.availableCodes.length >= order.quantity) {
      // Enable auto-delivery and populate codes
      const codes = order.availableCodes.slice(0, order.quantity).map(c => c.code).join('\n');
      setRedeemCodes(prev => ({ ...prev, [orderId]: codes }));
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, useAutoDelivery: true } : o
      ));
    } else {
      // Disable auto-delivery
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, useAutoDelivery: false } : o
      ));
    }
  };

  const validateAllCodes = (): { valid: boolean; error?: string } => {
    const allCodes: string[] = [];
    
    for (const orderId of selectedOrders) {
      const order = pendingOrders.find(o => o.id === orderId);
      if (!order) continue;
      
      const rawCodes = redeemCodes[orderId]?.trim() || '';
      const codes = rawCodes.split('\n').map(c => c.trim()).filter(c => c.length > 0);
      
      // Check exact count
      if (codes.length !== order.quantity) {
        return { 
          valid: false, 
          error: `Order "${order.product_name}" requires exactly ${order.quantity} code(s), but ${codes.length} provided` 
        };
      }
      
      // Check duplicates within this order
      const uniqueInOrder = new Set(codes.map(c => c.toLowerCase()));
      if (uniqueInOrder.size !== codes.length) {
        return { 
          valid: false, 
          error: `Duplicate codes found within order for "${order.product_name}"` 
        };
      }
      
      // Collect for cross-order duplicate check
      allCodes.push(...codes.map(c => c.toLowerCase()));
    }
    
    // Check duplicates across all orders
    const uniqueAcrossAll = new Set(allCodes);
    if (uniqueAcrossAll.size !== allCodes.length) {
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const code of allCodes) {
        if (seen.has(code)) {
          duplicates.push(code);
        }
        seen.add(code);
      }
      return { 
        valid: false, 
        error: `Duplicate code(s) found across orders: ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? '...' : ''}` 
      };
    }
    
    return { valid: true };
  };

  const handleVerifyClick = () => {
    if (selectedOrders.length === 0) {
      toast({ title: "No orders selected", variant: "destructive" });
      return;
    }

    // Comprehensive code validation
    const validation = validateAllCodes();
    if (!validation.valid) {
      toast({ 
        title: "Code Validation Error", 
        description: validation.error,
        variant: "destructive" 
      });
      return;
    }

    // Calculate stock summary for confirmation
    const stockChanges: Record<string, { name: string; current: number; reduce: number }> = {};
    
    selectedOrders.forEach(orderId => {
      const order = pendingOrders.find(o => o.id === orderId);
      if (!order) return;
      
      const product = products.find(p => p.id === order.product_id);
      if (!product) return;
      
      if (!stockChanges[product.id]) {
        stockChanges[product.id] = { name: product.name, current: product.stock, reduce: 0 };
      }
      stockChanges[product.id].reduce += order.quantity;
    });

    const summary = Object.values(stockChanges).map(s => ({
      product: s.name,
      current: s.current,
      reduce: s.reduce,
      after: s.current - s.reduce
    }));

    // Check for low stock warnings
    const hasLowStock = summary.some(s => s.after <= 5);
    
    if (hasLowStock) {
      setStockSummary(summary);
      setShowStockConfirm(true);
    } else {
      handleBulkVerify();
    }
  };

  const handleBulkVerify = async () => {
    setShowStockConfirm(false);
    setProcessing(true);
    setResults([]);

    const { data: { user } } = await supabase.auth.getUser();
    const verificationResults: { id: string; success: boolean; error?: string }[] = [];

    for (const orderId of selectedOrders) {
      try {
        const order = pendingOrders.find(o => o.id === orderId);
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

        // If using auto-delivery, mark inventory codes as used
        if (order?.useAutoDelivery) {
          const usedCodes = order.availableCodes.slice(0, order.quantity);
          for (const code of usedCodes) {
            await supabase
              .from("redeem_code_inventory")
              .update({ 
                is_used: true, 
                used_at: new Date().toISOString(),
                order_id: orderId 
              })
              .eq("id", code.id);
          }
        }

        // Update product stock
        if (order) {
          const product = products.find(p => p.id === order.product_id);
          if (product) {
            const newStock = Math.max(0, product.stock - order.quantity);
            await supabase.from("products").update({ stock: newStock }).eq("id", product.id);
            // Update local products state
            setProducts(prev => prev.map(p => 
              p.id === product.id ? { ...p, stock: newStock } : p
            ));
          }
        }

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
    <>
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
                    const hasEnoughCodes = order.availableCodes.length >= order.quantity;
                    
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
                              <div className="text-right flex items-center gap-2">
                                <Badge variant="outline">Qty: {order.quantity}</Badge>
                                {hasEnoughCodes && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Package className="h-3 w-3" />
                                    {order.availableCodes.length}
                                  </Badge>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(order.created_at), "MMM dd, HH:mm")}
                                </p>
                              </div>
                            </div>

                            {selectedOrders.includes(order.id) && !result?.success && (
                              <div className="space-y-2">
                                {/* Auto-delivery toggle */}
                                {hasEnoughCodes && (
                                  <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded-md">
                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                      <Zap className="h-4 w-4" />
                                      <span className="text-sm font-medium">
                                        {order.availableCodes.length} inventory codes available
                                      </span>
                                    </div>
                                    <Button 
                                      variant={order.useAutoDelivery ? "default" : "outline"} 
                                      size="sm" 
                                      onClick={() => toggleAutoDelivery(order.id)}
                                      className="gap-1"
                                    >
                                      <Package className="h-3 w-3" />
                                      {order.useAutoDelivery ? "Using Inventory" : "Use Inventory"}
                                    </Button>
                                  </div>
                                )}
                                
                                {!hasEnoughCodes && order.availableCodes.length > 0 && (
                                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                                    <Package className="h-4 w-4" />
                                    <span>Only {order.availableCodes.length} codes in inventory (need {order.quantity})</span>
                                  </div>
                                )}

                                <div>
                                  <Label className="text-sm flex items-center justify-between">
                                    <span>Redeem Codes ({order.quantity} required, one per line)</span>
                                    {order.useAutoDelivery && (
                                      <Badge variant="secondary" className="text-xs gap-1">
                                        <Zap className="h-3 w-3" />
                                        Auto-filled
                                      </Badge>
                                    )}
                                  </Label>
                                  <Textarea
                                    placeholder={`Enter ${order.quantity} code(s), one per line`}
                                    value={redeemCodes[order.id] || ''}
                                    onChange={(e) => updateRedeemCodes(order.id, e.target.value)}
                                    rows={Math.min(order.quantity, 3)}
                                    className="mt-1"
                                    disabled={order.useAutoDelivery}
                                  />
                                  {/* Real-time code validation indicator */}
                                  {redeemCodes[order.id] && (
                                    <div className="flex items-center gap-2 text-sm mt-1">
                                      {(() => {
                                        const codes = redeemCodes[order.id].split('\n').map(c => c.trim()).filter(c => c.length > 0);
                                        const uniqueCodes = new Set(codes.map(c => c.toLowerCase()));
                                        const hasDuplicates = uniqueCodes.size !== codes.length;
                                        const countCorrect = codes.length === order.quantity;
                                        
                                        if (hasDuplicates) {
                                          return (
                                            <span className="text-destructive flex items-center gap-1">
                                              <AlertTriangle className="h-3 w-3" />
                                              Duplicate codes detected
                                            </span>
                                          );
                                        }
                                        if (!countCorrect) {
                                          return (
                                            <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1">
                                              <AlertTriangle className="h-3 w-3" />
                                              {codes.length}/{order.quantity} codes
                                            </span>
                                          );
                                        }
                                        return (
                                          <span className="text-green-600 dark:text-green-500 flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" />
                                            {codes.length}/{order.quantity} codes
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
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
                onClick={handleVerifyClick} 
                disabled={processing || selectedOrders.length === 0}
              >
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verify {selectedOrders.length} Order(s)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Confirmation Dialog */}
      <AlertDialog open={showStockConfirm} onOpenChange={setShowStockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Stock Reduction</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>The following stock changes will be made:</p>
                <div className="space-y-2">
                  {stockSummary.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="font-medium">{item.product}</span>
                      <div className="flex items-center gap-2 text-sm">
                        <span>{item.current}</span>
                        <span className="text-red-500">-{item.reduce}</span>
                        <span>=</span>
                        <span className={item.after <= 3 ? "text-red-500 font-bold" : ""}>
                          {item.after}
                        </span>
                        {item.after <= 3 && (
                          <Badge variant="destructive" className="text-xs">Low Stock!</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkVerify}>Confirm & Verify</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
