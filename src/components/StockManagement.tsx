import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const amount = parseInt(quantity);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    const newStock = operation === "add" 
      ? product.stock + amount 
      : Math.max(0, product.stock - amount);

    try {
      const { error } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", product.id);

      if (error) throw error;

      toast({
        title: "Stock updated",
        description: `${operation === "add" ? "Added" : "Removed"} ${amount} items`,
      });

      setQuantity("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update stock",
        variant: "destructive",
      });
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
