import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Package, Minus, Plus, TrendingUp, Sparkles, AlertTriangle, Percent } from "lucide-react";

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
  isNew?: boolean;
  created_at?: string;
  basePrice?: number; // Price per day of shortest duration product for savings calculation
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
  isBestSeller = false,
  isNew = false,
  created_at,
  basePrice
}: ProductCardProps) => {
  // Check if product is new (created within last 7 days)
  const isNewProduct = useMemo(() => {
    if (isNew) return true;
    if (!created_at) return false;
    const createdDate = new Date(created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate > sevenDaysAgo;
  }, [isNew, created_at]);

  // Calculate savings percentage compared to base price per day
  const savingsPercent = useMemo(() => {
    if (!basePrice || basePrice <= 0) return 0;
    const pricePerDay = price / duration_days;
    const savings = ((basePrice - pricePerDay) / basePrice) * 100;
    return Math.round(savings);
  }, [basePrice, price, duration_days]);

  // Stock urgency levels
  const stockUrgency = useMemo(() => {
    if (stock === 0) return "out";
    if (stock <= 3) return "critical";
    if (stock <= 10) return "low";
    return "normal";
  }, [stock]);

  return (
    <Card className={`flex flex-col h-full relative bg-card ${stockUrgency === "critical" ? "ring-2 ring-destructive/50" : ""}`}>
      {/* Badges Container */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
        {isBestSeller && (
          <Badge className="bg-accent text-accent-foreground shadow-brutal-sm">
            <TrendingUp className="h-3 w-3 mr-1" />
            Best Seller
          </Badge>
        )}
        {isNewProduct && !isBestSeller && (
          <Badge className="bg-primary text-primary-foreground shadow-brutal-sm">
            <Sparkles className="h-3 w-3 mr-1" />
            New
          </Badge>
        )}
        {savingsPercent >= 10 && (
          <Badge className="bg-green-600 text-white shadow-brutal-sm">
            <Percent className="h-3 w-3 mr-1" />
            Save {savingsPercent}%
          </Badge>
        )}
      </div>

      <CardHeader className={isBestSeller || isNewProduct || savingsPercent >= 10 ? "pt-6" : ""}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-2xl">{name}</CardTitle>
          <Badge 
            variant={stock > 0 ? (stockUrgency === "critical" ? "destructive" : "default") : "destructive"}
            className={stockUrgency === "low" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
          >
            {stock === 0 ? "Out of Stock" : `${stock} Available`}
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
          
          {/* Urgency Warning */}
          {stockUrgency === "critical" && stock > 0 && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-2 rounded-md border border-destructive/20">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Only {stock} left! Order soon</span>
            </div>
          )}
          {stockUrgency === "low" && (
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500 bg-yellow-500/10 p-2 rounded-md border border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Low stock - {stock} remaining</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 pt-6 border-t-2 border-border">
        <div className="flex items-center justify-between w-full">
          <div>
            <div className="text-3xl font-black text-primary">
              Rp {price.toLocaleString('id-ID')}
            </div>
            {savingsPercent >= 10 && basePrice && (
              <div className="text-sm text-muted-foreground">
                <span className="line-through">Rp {(basePrice * duration_days).toLocaleString('id-ID')}</span>
              </div>
            )}
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
