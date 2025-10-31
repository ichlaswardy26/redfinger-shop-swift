import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Package, Minus, Plus } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  stock: number;
  quantity: number;
  onQuantityChange: (id: string, change: number) => void;
  onPurchase: (id: string) => void;
  isAuthenticated: boolean;
}

const ProductCard = ({ 
  name, 
  description, 
  price, 
  duration_days, 
  stock,
  quantity,
  onQuantityChange, 
  onPurchase,
  id,
  isAuthenticated 
}: ProductCardProps) => {
  return (
    <Card className="flex flex-col h-full transition-all duration-300 hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.2)] hover:-translate-y-1">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-2xl">{name}</CardTitle>
          <Badge variant={stock > 0 ? "default" : "destructive"}>
            {stock > 0 ? `${stock} Available` : "Out of Stock"}
          </Badge>
        </div>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{duration_days} days validity</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>Digital Redeem Code</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-6 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Rp {price.toLocaleString('id-ID')}
          </div>
          {isAuthenticated && stock > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onQuantityChange(id, -1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-semibold min-w-[2ch] text-center text-lg">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onQuantityChange(id, 1)}
                disabled={quantity >= stock}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <Button 
          variant="hero" 
          size="lg"
          className="w-full"
          disabled={stock === 0 || !isAuthenticated || quantity > stock}
          onClick={() => onPurchase(id)}
        >
          {!isAuthenticated ? "Sign In to Buy" : stock === 0 ? "Out of Stock" : `Purchase ${quantity > 1 ? `(x${quantity})` : "Now"}`}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
