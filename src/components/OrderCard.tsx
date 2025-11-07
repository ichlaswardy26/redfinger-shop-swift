import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Upload, X, Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import CopyButton from "./CopyButton";

interface OrderCardProps {
  order: {
    id: string;
    product_id: string;
    product: { name: string; duration_days: number };
    quantity: number;
    status: string;
    payment_status: string;
    payment_proof: string | null;
    created_at: string;
    expires_at: string;
    redeem_codes: string[] | null;
    ticket?: { id: string; status: string } | null;
  };
  onUploadProof: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  onRate: (orderId: string, productId: string, productName: string) => void;
  onCreateTicket: (orderId: string) => void;
}

export const OrderCard = ({ order, onUploadProof, onCancelOrder, onRate, onCreateTicket }: OrderCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{order.product.name}</h3>
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

        {order.payment_status === 'verified' && order.redeem_codes && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium">Redeem Codes:</p>
            {order.redeem_codes.map((code, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-background px-3 py-1 rounded border">
                  {code}
                </code>
                <CopyButton text={code} />
              </div>
            ))}
          </div>
        )}

        {order.ticket && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Support Ticket: {order.ticket.status}
            </p>
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
              className="flex-1"
            >
              <Star className="h-4 w-4 mr-2" />
              Rate Product
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open('https://www.redfinger.com', '_blank')}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Redeem
            </Button>
          </>
        )}

        {order.payment_status === 'pending' && (
          <>
            <Button 
              size="sm" 
              variant="default"
              onClick={() => onUploadProof(order.id)}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Proof
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onCancelOrder(order.id)}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </>
        )}

        {order.payment_status === 'rejected' && !order.ticket && (
          <Button 
            size="sm" 
            variant="default"
            onClick={() => onCreateTicket(order.id)}
            className="w-full"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Create Support Ticket
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
