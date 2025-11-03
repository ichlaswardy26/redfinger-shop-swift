import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Minus } from "lucide-react";

interface StockManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    stock: number;
  } | null;
  onSuccess: () => void;
}

const StockManagement = ({ open, onOpenChange, product, onSuccess }: StockManagementProps) => {
  const [quantity, setQuantity] = useState("");
  const [operation, setOperation] = useState<"add" | "remove">("add");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for the stock change");
      return;
    }

    const newStock = operation === "add" ? product.stock + qty : product.stock - qty;
    
    if (newStock < 0) {
      toast.error("Insufficient stock");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", product.id);

      if (updateError) throw updateError;

      // Log the stock change with reason
      const { error: logError } = await supabase
        .from("stock_logs")
        .insert({
          product_id: product.id,
          user_id: user.id,
          operation,
          quantity: qty,
          previous_stock: product.stock,
          new_stock: newStock,
          reason: reason.trim(),
        });

      if (logError) throw logError;

      toast.success("Stock updated successfully");
      onSuccess();
      onOpenChange(false);
      setQuantity("");
      setReason("");
    } catch (error) {
      console.error("Stock update error:", error);
      toast.error("Failed to update stock");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Stock: {product?.name}</DialogTitle>
          <DialogDescription>
            Current stock: {product?.stock || 0} items
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={operation === "add" ? "default" : "outline"}
              onClick={() => setOperation("add")}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Stock
            </Button>
            <Button
              type="button"
              variant={operation === "remove" ? "default" : "outline"}
              onClick={() => setOperation("remove")}
              className="flex-1"
            >
              <Minus className="h-4 w-4 mr-2" />
              Remove Stock
            </Button>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              required
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason for Change</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Restock, Damaged, Sale, etc."
              required
            />
          </div>

          <div className="text-sm text-muted-foreground">
            New stock will be: {product && quantity ? (
              operation === "add" 
                ? product.stock + parseInt(quantity || "0")
                : Math.max(0, product.stock - parseInt(quantity || "0"))
            ) : product?.stock || 0} items
          </div>

          <Button type="submit" className="w-full">
            Update Stock
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockManagement;
