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
import { ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
}

interface OrderConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  quantity: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const OrderConfirmationDialog = ({
  open,
  onOpenChange,
  product,
  quantity,
  onConfirm,
  isLoading,
}: OrderConfirmationDialogProps) => {
  if (!product) return null;

  const totalPrice = product.price * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Confirm Your Order
          </DialogTitle>
          <DialogDescription>
            Review your order details before proceeding to payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product:</span>
              <span className="font-medium">{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{product.duration_days} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price per item:</span>
              <span className="font-medium">Rp {product.price.toLocaleString()}</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-primary">Rp {totalPrice.toLocaleString()}</span>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-1">Next Steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Confirm your order</li>
              <li>Upload payment proof in My Transactions</li>
              <li>Wait for admin verification</li>
              <li>Receive your redeem codes</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Creating Order..." : "Confirm Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
