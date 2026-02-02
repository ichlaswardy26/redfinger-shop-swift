import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, ExternalLink, Copy, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSignedUrl } from "@/hooks/useSignedUrl";

interface Order {
  id: string;
  quantity: number;
  product_name?: string;
  customer_name?: string;
  customer_email?: string;
  payment_proof?: string | null;
  created_at: string;
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
  const { toast } = useToast();

  // Generate codes when order changes
  const generateCodes = () => {
    if (!order) return;
    const codes = Array.from({ length: order.quantity }, () =>
      `RF-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    );
    setRedeemCodes(codes);
  };

  // Load signed URL for payment proof
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
  }, [open, order?.payment_proof]);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && order) {
      generateCodes();
      setAdminNotes("");
      setRejectReason("");
      setActiveTab("verify");
    }
    onOpenChange(isOpen);
  };

  const handleVerify = async () => {
    if (!order) return;
    if (redeemCodes.some(code => !code.trim())) {
      toast({
        title: "Error",
        description: "Please fill in all redeem codes",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    try {
      await onVerify(order.id, redeemCodes, adminNotes);
      onOpenChange(false);
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
    
    setSubmitting(true);
    try {
      await onReject(order.id, rejectReason);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const updateCode = (index: number, value: string) => {
    const newCodes = [...redeemCodes];
    newCodes[index] = value;
    setRedeemCodes(newCodes);
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
            <div className="flex items-center justify-between">
              <Label>Redeem Codes ({order.quantity} required)</Label>
              <Button variant="ghost" size="sm" onClick={generateCodes}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {redeemCodes.map((code, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={code}
                    onChange={(e) => updateCode(index, e.target.value)}
                    placeholder={`Code ${index + 1}`}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => copyCode(code)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
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
