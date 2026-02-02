import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Package, Minus, Plus, TrendingUp } from "lucide-react";

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
  isBestSeller?: boolean;
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
  isAuthenticated,
  isBestSeller = false
}: ProductCardProps) => {
  return (
    <Card className="flex flex-col h-full relative bg-card">
      {isBestSeller && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground z-10 shadow-brutal-sm">
          <TrendingUp className="h-3 w-3 mr-1" />
          Best Seller
        </Badge>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
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
            <span className="font-medium">{duration_days} days validity</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span className="font-medium">Digital Redeem Code</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 pt-6 border-t-2 border-border">
        <div className="flex items-center justify-between w-full">
          <div className="text-3xl font-black text-primary">
            Rp {price.toLocaleString('id-ID')}
          </div>
          {isAuthenticated && stock > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => onQuantityChange(id, -1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-black min-w-[2ch] text-center text-lg">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => onQuantityChange(id, 1)}
                disabled={quantity >= stock}
              >
                <Plus className="h-4 w-4" />
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
