import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QrCode, ExternalLink, RefreshCw, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { QRPaymentData } from "@/hooks/usePaymentGateway";
import { t } from "@/lib/translations";

interface QRPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentData: QRPaymentData | null;
  productName: string;
  quantity: number;
  onCheckStatus: () => Promise<{ status: string; message: string } | null>;
  onPaymentVerified: () => void;
  isCheckingStatus?: boolean;
}

export const QRPaymentDialog = ({
  open,
  onOpenChange,
  paymentData,
  productName,
  quantity,
  onCheckStatus,
  onPaymentVerified,
  isCheckingStatus = false,
}: QRPaymentDialogProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "verified" | "expired">("pending");

  // Calculate time remaining
  useEffect(() => {
    if (!paymentData?.expired_at) return;

    const calculateTimeRemaining = () => {
      const expiry = new Date(paymentData.expired_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        setPaymentStatus("expired");
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [paymentData?.expired_at]);

  // Auto-check status periodically
  useEffect(() => {
    if (!open || !paymentData || paymentStatus !== "pending" || isExpired) return;

    const checkInterval = setInterval(async () => {
      const result = await onCheckStatus();
      if (result?.status === "verified") {
        setPaymentStatus("verified");
        setTimeout(() => {
          onPaymentVerified();
        }, 2000);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInterval);
  }, [open, paymentData, paymentStatus, isExpired, onCheckStatus, onPaymentVerified]);

  const handleManualCheck = async () => {
    const result = await onCheckStatus();
    if (result?.status === "verified") {
      setPaymentStatus("verified");
      setTimeout(() => {
        onPaymentVerified();
      }, 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!paymentData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t.qrPayment.title}
          </DialogTitle>
          <DialogDescription>
            {t.qrPayment.scanToComplete}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Banner */}
          {paymentStatus === "verified" && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 text-primary rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Payment Verified!</span>
            </div>
          )}

          {isExpired && paymentStatus !== "verified" && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">{t.qrPayment.expired}</span>
            </div>
          )}

          {/* Order Summary */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.checkout.product}:</span>
              <span className="font-medium">{productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.checkout.quantity}:</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.qrPayment.amount}:</span>
              <span className="font-bold text-primary">
                Rp {paymentData.nominal.toLocaleString()}
              </span>
            </div>
          </div>

          <Separator />

          {/* QR Code */}
          <div className="flex flex-col items-center space-y-3">
            <div className={`p-4 bg-white rounded-lg border-2 ${isExpired ? "opacity-50 grayscale" : ""}`}>
              <img
                src={paymentData.qr_link}
                alt="QRIS Payment Code"
                className="w-48 h-48 object-contain"
              />
            </div>

            {/* Timer */}
            {!isExpired && paymentStatus === "pending" && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t.qrPayment.expiresIn}:</span>
                <Badge variant={timeRemaining < 300 ? "destructive" : "secondary"}>
                  {formatTime(timeRemaining)}
                </Badge>
              </div>
            )}

            {/* Open in browser button */}
            {!isExpired && paymentStatus === "pending" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(paymentData.pay_url, "_blank")}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {t.qrPayment.openPaymentPage}
              </Button>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {paymentStatus === "pending" && !isExpired && (
              <Button
                onClick={handleManualCheck}
                disabled={isCheckingStatus}
                className="w-full"
              >
                {isCheckingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t.qrPayment.checking}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t.qrPayment.ivePaid}
                  </>
                )}
              </Button>
            )}

            {paymentStatus === "verified" && (
              <Button
                onClick={() => {
                  onPaymentVerified();
                  onOpenChange(false);
                }}
                className="w-full"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t.qrPayment.continue}
              </Button>
            )}

            {isExpired && paymentStatus !== "verified" && (
              <p className="text-sm text-center text-muted-foreground">
                {t.qrPayment.closeAndRetry}
              </p>
            )}
          </div>

          {/* Instructions */}
          {paymentStatus === "pending" && !isExpired && (
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">{t.qrPayment.howToPay}</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>{t.qrPayment.step1}</li>
                <li>{t.qrPayment.step2}</li>
                <li>{t.qrPayment.step3}</li>
                <li>{t.qrPayment.step4}</li>
                <li>{t.qrPayment.step5}</li>
              </ol>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
