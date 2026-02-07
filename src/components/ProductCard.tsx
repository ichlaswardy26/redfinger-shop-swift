import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Package, Minus, Plus, TrendingUp, Sparkles, AlertTriangle, Percent, Zap, Shield, ArrowRight } from "lucide-react";
import { t } from "@/lib/translations";

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
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="h-full"
    >
      <Card className={`group flex flex-col h-full relative bg-card overflow-hidden transition-all duration-300 hover:shadow-brutal-lg hover:border-primary/30 ${stockUrgency === "critical" ? "ring-2 ring-destructive/50" : ""}`}>
        {/* Shimmer overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
        
        {/* Badges Container with bounce animation */}
        <div className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2 flex gap-0.5 sm:gap-1 z-10">
          {isBestSeller && (
            <motion.div
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Badge className="bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-brutal-sm text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 animate-float">
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                {t.products.bestSeller}
              </Badge>
            </motion.div>
          )}
          {isNewProduct && !isBestSeller && (
            <motion.div
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-brutal-sm text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                {t.products.new}
              </Badge>
            </motion.div>
          )}
          {savingsPercent >= 10 && (
            <motion.div
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
            >
              <Badge className="bg-gradient-to-r from-green-600 to-green-500 text-white shadow-brutal-sm text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1">
                <Percent className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">{t.products.savePercent}</span> {savingsPercent}%
              </Badge>
            </motion.div>
          )}
        </div>

        <CardHeader className={`p-3 sm:p-4 md:p-6 ${isBestSeller || isNewProduct || savingsPercent >= 10 ? "pt-5 sm:pt-6" : ""}`}>
          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
            <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl group-hover:text-primary transition-colors duration-200">{name}</CardTitle>
            <Badge 
              variant={stock > 0 ? (stockUrgency === "critical" ? "destructive" : "default") : "destructive"}
              className={`text-[10px] sm:text-xs shrink-0 transition-all duration-200 ${stockUrgency === "low" ? "bg-yellow-600 hover:bg-yellow-700" : ""}`}
            >
              {stock === 0 ? t.status.outOfStock.split(' ')[0] : `${stock}`}
              <span className="hidden sm:inline ml-1">{stock === 0 ? t.status.outOfStock.split(' ').slice(1).join(' ') : t.status.available}</span>
            </Badge>
          </div>
          <CardDescription className="text-xs sm:text-sm md:text-base line-clamp-2">{description}</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 p-3 sm:p-4 md:p-6 pt-0">
          <div className="space-y-2 sm:space-y-3">
            {/* Features with icon backgrounds */}
            <div className="flex items-center gap-2 sm:gap-2.5 text-muted-foreground group-hover:text-foreground transition-colors">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <span className="font-medium text-xs sm:text-sm">{duration_days} {t.products.daysValidity}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5 text-muted-foreground group-hover:text-foreground transition-colors">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
              </div>
              <span className="font-medium text-xs sm:text-sm">{t.products.digitalRedeemCode}</span>
            </div>
            
            {/* Hidden features that reveal on hover */}
            <div className="overflow-hidden">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                whileInView={{ height: "auto", opacity: 1 }}
                className="flex items-center gap-2 sm:gap-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                </div>
                <span className="font-medium text-xs sm:text-sm">{t.products.instantDelivery}</span>
              </motion.div>
            </div>
            
            {/* Urgency Warning */}
            {stockUrgency === "critical" && stock > 0 && (
              <motion.div 
                initial={{ scale: 0.95 }}
                animate={{ scale: [0.95, 1, 0.95] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-1.5 sm:gap-2 text-destructive bg-destructive/10 p-1.5 sm:p-2 rounded-lg border border-destructive/20"
              >
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{t.products.onlyLeft} {stock}!</span>
              </motion.div>
            )}
            {stockUrgency === "low" && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-700 dark:text-yellow-500 bg-yellow-500/10 p-1.5 sm:p-2 rounded-lg border border-yellow-500/20">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{t.status.lowStock} - {stock} {t.stockManagement.inStock}</span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 md:p-6 pt-3 sm:pt-4 md:pt-6 border-t-2 border-border bg-gradient-to-b from-transparent to-muted/30">
          <div className="flex items-center justify-between w-full gap-2">
            <div className="min-w-0">
              <motion.div 
                className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-primary"
                whileHover={{ scale: 1.02 }}
              >
                Rp {price.toLocaleString('id-ID')}
              </motion.div>
              {savingsPercent >= 10 && basePrice && (
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                  <span className="line-through">Rp {(basePrice * duration_days).toLocaleString('id-ID')}</span>
                </div>
              )}
              {/* Per day price - shows on hover */}
              <div className="text-[10px] sm:text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                Rp {Math.round(price / duration_days).toLocaleString('id-ID')}/{t.products.perDay}
              </div>
            </div>
            {isAuthenticated && stock > 0 && (
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-lg"
                    onClick={() => onQuantityChange(id, -1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </motion.div>
                <span className="font-black min-w-[2ch] text-center text-sm sm:text-base md:text-lg">{quantity}</span>
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-lg"
                    onClick={() => onQuantityChange(id, 1)}
                    disabled={quantity >= stock}
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
          <motion.div 
            className="w-full"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Button 
              variant="hero" 
              size="default"
              className="w-full text-xs sm:text-sm gap-2 group/btn"
              disabled={stock === 0 || !isAuthenticated || quantity > stock}
              onClick={() => onPurchase(id)}
            >
              {!isAuthenticated ? (
                t.products.signInToPurchase
              ) : stock === 0 ? (
                t.products.outOfStock
              ) : (
                <>
                  {t.products.purchaseNow} {quantity > 1 ? `(x${quantity})` : ""}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </>
              )}
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default ProductCard;
