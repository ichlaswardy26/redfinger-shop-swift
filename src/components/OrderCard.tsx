import { useState } from "react";
import { CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Upload, X, Star, MessageSquare, Download, QrCode, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import CopyButton from "./CopyButton";
import { MotionCard } from "@/components/ui/motion";
import { QRPaymentDialog } from "@/components/QRPaymentDialog";
import { usePaymentGateway, QRPaymentData } from "@/hooks/usePaymentGateway";

interface OrderCardProps {
  order: {
    id: string;
    product_id: string;
    product: { name: string; duration_days: number; price?: number };
    quantity: number;
    status: string;
    payment_status: string;
    payment_proof: string | null;
    payment_method?: string | null;
    gateway_trx_id?: string | null;
    qr_link?: string | null;
    payment_url?: string | null;
    gateway_expired_at?: string | null;
    created_at: string;
    expires_at: string;
    redeem_codes: string[] | null;
    admin_notes?: string | null;
    ticket?: { id: string; status: string } | null;
  };
  onUploadProof: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  onRate: (orderId: string, productId: string, productName: string) => void;
  onCreateTicket: (orderId: string) => void;
  onOrderUpdated?: () => void;
}

export const OrderCard = ({ order, onUploadProof, onCancelOrder, onRate, onCreateTicket, onOrderUpdated }: OrderCardProps) => {
  const [showQRDialog, setShowQRDialog] = useState(false);
  const { checkPaymentStatus, createPayment, isCheckingStatus, isCreatingPayment } = usePaymentGateway();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'secondary';
      case 'resolved': return 'outline';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  // Check if QRIS payment is expired
  const isQRISExpired = order.payment_method === 'qris' && order.gateway_expired_at 
    ? new Date(order.gateway_expired_at) < new Date()
    : false;

  // Build QR payment data from order
  const qrPaymentData: QRPaymentData | null = order.qr_link && order.payment_url && order.gateway_expired_at
    ? {
        trx_id: order.gateway_trx_id || '',
        qr_link: order.qr_link,
        pay_url: order.payment_url,
        nominal: (order.product.price || 0) * order.quantity,
        expired_at: order.gateway_expired_at,
      }
    : null;

  const handleCheckStatus = async () => {
    const result = await checkPaymentStatus(order.id);
    if (result?.status === 'verified') {
      onOrderUpdated?.();
    }
    return result;
  };

  const handlePaymentVerified = () => {
    setShowQRDialog(false);
    onOrderUpdated?.();
  };

  const handleRetryQRIS = async () => {
    const totalPrice = (order.product.price || 0) * order.quantity;
    const result = await createPayment(order.id, totalPrice);
    if (result) {
      // Force refresh the order data
      onOrderUpdated?.();
      setShowQRDialog(true);
    }
  };

  const downloadRedeemCodes = () => {
    if (!order.redeem_codes || order.redeem_codes.length === 0) return;
    
    const content = [
      `Redeem Codes for ${order.product.name}`,
      `Order Date: ${format(new Date(order.created_at), 'PPP')}`,
      `Quantity: ${order.quantity}`,
      `Duration: ${order.product.duration_days} days`,
      `Expires: ${format(new Date(order.expires_at), 'PPP')}`,
      '',
      '--- REDEEM CODES ---',
      '',
      ...order.redeem_codes.map((code, i) => `${i + 1}. ${code}`),
      '',
      '--- HOW TO REDEEM ---',
      '1. Go to https://www.redfinger.com',
      '2. Login to your account or create new one',
      '3. Navigate to "Redeem Code" section',
      '4. Enter each code one by one',
      '',
      'Thank you for your purchase!'
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redeem-codes-${order.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <MotionCard className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">{order.product.name}</h3>
            <p className="text-sm text-muted-foreground">
              Quantity: {order.quantity} × {order.product.duration_days} days
            </p>
          </div>
          <Badge variant={getStatusColor(order.payment_status)}>
            {order.payment_status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Order Date</p>
            <p className="font-medium">{format(new Date(order.created_at), 'PP')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expires</p>
            <p className="font-medium">{format(new Date(order.expires_at), 'PP')}</p>
          </div>
        </div>

        {order.payment_status === 'verified' && order.redeem_codes && order.redeem_codes.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Redeem Codes:</p>
              {order.redeem_codes.length > 1 && (
                <Button variant="ghost" size="sm" onClick={downloadRedeemCodes}>
                  <Download className="h-4 w-4 mr-1" />
                  Download TXT
                </Button>
              )}
            </div>
            {order.redeem_codes.length === 1 ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-background px-3 py-1 rounded border">
                  {order.redeem_codes[0]}
                </code>
                <CopyButton text={order.redeem_codes[0]} />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {order.redeem_codes.length} codes available - click download to get all codes
              </div>
            )}
          </div>
        )}

        {order.payment_status === 'rejected' && order.admin_notes && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
            <p className="text-sm text-muted-foreground mt-1">{order.admin_notes}</p>
          </div>
        )}

        {order.ticket && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Support Ticket
              </p>
              <Badge variant={getTicketStatusColor(order.ticket.status)}>
                {order.ticket.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
        )}

        {/* QRIS Payment Indicator */}
        {order.payment_method === 'qris' && order.payment_status === 'pending' && (
          <div className={`border rounded-lg p-3 ${isQRISExpired ? 'bg-destructive/10 border-destructive/20' : 'bg-accent/10 border-accent/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                <p className="text-sm font-medium">
                  {isQRISExpired ? 'QRIS Expired' : 'Waiting for QRIS Payment'}
                </p>
              </div>
              {!isQRISExpired && order.gateway_expired_at && (
                <Badge variant="secondary" className="text-xs">
                  Expires {format(new Date(order.gateway_expired_at), 'HH:mm')}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-muted/30 flex gap-2 flex-wrap">
        {order.payment_status === 'verified' && (
          <>
            <Button 
              size="sm" 
              variant="default"
              onClick={() => onRate(order.id, order.product_id, order.product.name)}
              className="flex-1 min-w-0"
            >
              <Star className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">Rate</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open('https://www.redfinger.com', '_blank')}
              className="flex-1 min-w-0"
            >
              <ExternalLink className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">Redeem</span>
            </Button>
          </>
        )}

        {order.payment_status === 'pending' && order.payment_method !== 'qris' && (
          <>
            <Button 
              size="sm" 
              variant="default"
              onClick={() => onUploadProof(order.id)}
              className="flex-1 min-w-0"
            >
              <Upload className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">Upload</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onCancelOrder(order.id)}
              className="flex-1 min-w-0"
            >
              <X className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">Cancel</span>
            </Button>
          </>
        )}

        {/* QRIS Pending - Show Pay Now or Retry */}
        {order.payment_status === 'pending' && order.payment_method === 'qris' && (
          <>
            {!isQRISExpired && qrPaymentData ? (
              <>
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => setShowQRDialog(true)}
                  className="flex-1 min-w-0"
                >
                  <QrCode className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">Pay Now</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus}
                  className="flex-1 min-w-0"
                >
                  {isCheckingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">Check</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={handleRetryQRIS}
                  disabled={isCreatingPayment}
                  className="flex-1 min-w-0"
                >
                  {isCreatingPayment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">New QR</span>
                    </>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onCancelOrder(order.id)}
                  className="flex-1 min-w-0"
                >
                  <X className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">Cancel</span>
                </Button>
              </>
            )}
          </>
        )}

        {order.payment_status === 'rejected' && !order.ticket && (
          <Button 
            size="sm" 
            variant="default"
            onClick={() => onCreateTicket(order.id)}
            className="w-full min-w-0"
          >
            <MessageSquare className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="truncate">Create Ticket</span>
          </Button>
        )}
      </CardFooter>

      {/* QR Payment Dialog */}
      {qrPaymentData && (
        <QRPaymentDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          paymentData={qrPaymentData}
          productName={order.product.name}
          quantity={order.quantity}
          onCheckStatus={handleCheckStatus}
          onPaymentVerified={handlePaymentVerified}
          isCheckingStatus={isCheckingStatus}
        />
      )}
    </MotionCard>
  );
};