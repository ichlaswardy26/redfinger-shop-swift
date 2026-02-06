import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Wallet, CreditCard, Loader2, QrCode } from "lucide-react";
import { usePaymentGateway, QRPaymentData } from "@/hooks/usePaymentGateway";
import { QRPaymentDialog } from "@/components/QRPaymentDialog";
import { VoucherInput } from "@/components/VoucherInput";
import { ValidatedVoucher } from "@/hooks/useVoucher";
import { t } from "@/lib/translations";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
   category_id?: string | null;
}

interface OrderConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  quantity: number;
   onConfirm: (paymentMethod: "manual" | "qris", voucherId?: string, discountAmount?: number) => void;
  isLoading?: boolean;
  orderId?: string | null;
}

export const OrderConfirmationDialog = ({
  open,
  onOpenChange,
  product,
  quantity,
  onConfirm,
  isLoading,
  orderId,
}: OrderConfirmationDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<"manual" | "qris">("manual");
  const [qrPaymentData, setQrPaymentData] = useState<QRPaymentData | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
   const [appliedVoucher, setAppliedVoucher] = useState<ValidatedVoucher | null>(null);
   const [discountAmount, setDiscountAmount] = useState(0);
  
  const { 
    config, 
    isQRISEnabled, 
    isCreatingPayment, 
    createPayment, 
    checkPaymentStatus,
    isCheckingStatus 
  } = usePaymentGateway();

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPaymentMethod("manual");
      setQrPaymentData(null);
      setShowQRDialog(false);
       setAppliedVoucher(null);
       setDiscountAmount(0);
    }
  }, [open]);

  if (!product) return null;

  const totalPrice = product.price * quantity;
   const finalPrice = totalPrice - discountAmount;

  const handleConfirm = async () => {
     onConfirm(paymentMethod, appliedVoucher?.id, discountAmount);
  };

  const handleCreateQRISPayment = async (newOrderId: string) => {
     const qrData = await createPayment(newOrderId, finalPrice);
    if (qrData) {
      setQrPaymentData(qrData);
      setShowQRDialog(true);
    }
  };

  const handleCheckStatus = async () => {
    if (!orderId) return null;
    return await checkPaymentStatus(orderId);
  };

  const handlePaymentVerified = () => {
    setShowQRDialog(false);
    onOpenChange(false);
    // Redirect will be handled by parent component
  };

   const handleVoucherApplied = (voucher: ValidatedVoucher | null, discount: number) => {
     setAppliedVoucher(voucher);
     setDiscountAmount(discount);
   };
 
  return (
    <>
      <Dialog open={open && !showQRDialog} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t.checkout.title}
            </DialogTitle>
            <DialogDescription>
              {t.additional.reviewDetails}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.checkout.product}:</span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.products.duration}:</span>
                <span className="font-medium">{product.duration_days} {t.products.days}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.checkout.quantity}:</span>
                <span className="font-medium">{quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.checkout.unitPrice}:</span>
                <span className="font-medium">Rp {product.price.toLocaleString()}</span>
              </div>
            </div>

            <Separator />

             {/* Voucher Input */}
             <VoucherInput
               orderAmount={totalPrice}
               productId={product.id}
               categoryId={product.category_id || undefined}
               onVoucherApplied={handleVoucherApplied}
               disabled={isLoading || isCreatingPayment}
             />
 
             <Separator />
 
             {/* Price Summary */}
             <div className="space-y-2">
               <div className="flex justify-between">
                 <span className="text-muted-foreground">{t.checkout.subtotal}:</span>
                 <span className="font-medium">Rp {totalPrice.toLocaleString()}</span>
               </div>
               {discountAmount > 0 && (
                 <div className="flex justify-between text-primary">
                   <span>{t.checkout.discount} ({appliedVoucher?.code}):</span>
                   <span className="font-medium">-Rp {discountAmount.toLocaleString()}</span>
                 </div>
               )}
               <Separator />
               <div className="flex justify-between text-lg font-bold">
                 <span>{t.checkout.total}:</span>
                 <span className="text-primary">Rp {finalPrice.toLocaleString()}</span>
               </div>
             </div>

            <Separator />

            {/* Payment Method Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t.checkout.paymentMethod}</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as "manual" | "qris")}
                className="grid gap-3"
              >
                {/* Manual Payment */}
                <div className="flex items-center space-x-3 border-2 border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span className="font-medium">{t.additional.bankTransfer}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t.additional.bankTransferDesc}
                    </p>
                  </Label>
                </div>

                {/* QRIS Payment */}
                {isQRISEnabled && (
                  <div className="flex items-center space-x-3 border-2 border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="qris" id="qris" />
                    <Label htmlFor="qris" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        <span className="font-medium">{t.additional.qrisInstant}</span>
                        <Badge variant="secondary" className="text-xs">{t.additional.recommended}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t.additional.qrisDesc}
                      </p>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>

            {/* Instructions */}
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              {paymentMethod === "manual" ? (
                <>
                  <p className="font-medium mb-1">{t.additional.nextSteps}:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Konfirmasi pesanan Anda</li>
                    <li>Transfer ke rekening bank kami</li>
                    <li>Unggah bukti pembayaran di Pesanan Saya</li>
                    <li>Tunggu verifikasi admin</li>
                    <li>Terima kode redeem Anda</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">{t.additional.nextSteps}:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Konfirmasi pesanan Anda</li>
                    <li>Pindai kode QR dengan e-wallet Anda</li>
                    <li>Selesaikan pembayaran secara instan</li>
                    <li>Terima kode redeem Anda secara otomatis</li>
                  </ol>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isCreatingPayment}
            >
              {t.actions.cancel}
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isLoading || isCreatingPayment}
            >
              {isLoading || isCreatingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.checkout.creatingOrder}
                </>
              ) : paymentMethod === "qris" ? (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  {t.additional.payNow} Rp {finalPrice.toLocaleString()}
                </>
              ) : (
                 `${t.additional.confirmOrderAmount} - Rp ${finalPrice.toLocaleString()}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Payment Dialog */}
      {qrPaymentData && (
        <QRPaymentDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          paymentData={qrPaymentData}
          productName={product.name}
          quantity={quantity}
          onCheckStatus={handleCheckStatus}
          onPaymentVerified={handlePaymentVerified}
          isCheckingStatus={isCheckingStatus}
        />
      )}
    </>
  );
};

// Export function to trigger QRIS payment after order creation
export const triggerQRISPayment = async (
  orderId: string,
  amount: number,
  createPayment: (orderId: string, amount: number) => Promise<QRPaymentData | null>
): Promise<QRPaymentData | null> => {
  return await createPayment(orderId, amount);
};
