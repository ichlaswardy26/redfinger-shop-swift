import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePaymentGateway, QRPaymentData } from "@/hooks/usePaymentGateway";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { X, Layers, ShoppingBag, Package, Sparkles, TrendingUp } from "lucide-react";
import { OrderConfirmationDialog } from "@/components/OrderConfirmationDialog";
import { QRPaymentDialog } from "@/components/QRPaymentDialog";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
  parent_id: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  stock: number;
  is_active: boolean;
  category_id: string | null;
  average_rating?: number;
  rating_count?: number;
  isBestSeller?: boolean;
  created_at?: string;
}

interface ProductQuantity {
  [key: string]: number;
}

const ITEMS_PER_PAGE = 10;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

const Store = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<ProductQuantity>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [bestSellerId, setBestSellerId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [qrPaymentData, setQrPaymentData] = useState<QRPaymentData | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { settings: siteSettings } = useSiteSettings();
  const { createPayment, checkPaymentStatus, isCheckingStatus } = usePaymentGateway();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    fetchCategories();
    fetchProducts();
    fetchBestSeller();

    // Real-time stock updates
    const channel = supabase
      .channel('store-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_categories' }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Reset quantity if it exceeds stock
  useEffect(() => {
    products.forEach(product => {
      const currentQty = quantities[product.id] || 1;
      if (currentQty > product.stock && product.stock > 0) {
        setQuantities(prev => ({ ...prev, [product.id]: product.stock }));
      }
    });
  }, [products]);

  // Reset display count when category changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, created_at")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBestSeller = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("orders")
        .select("product_id")
        .eq("payment_status", "verified")
        .gte("created_at", startOfMonth.toISOString());

      if (error) throw error;

      if (data && data.length > 0) {
        const productCounts = data.reduce((acc, order) => {
          acc[order.product_id] = (acc[order.product_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const bestSeller = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];
        setBestSellerId(bestSeller[0]);
      }
    } catch (error) {
      console.error("Error fetching best seller:", error);
    }
  };

  const handleQuantityChange = (productId: string, change: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentQty = quantities[productId] || 1;
    const newQty = Math.max(1, Math.min(product.stock, currentQty + change));
    setQuantities({ ...quantities, [productId]: newQty });
  };

  const handlePurchase = async (productId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to purchase",
        variant: "destructive",
      });
      navigate("/auth/signin");
      return;
    }

    // Re-fetch latest stock to prevent race condition
    const { data: latestProduct, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error || !latestProduct) {
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive",
      });
      return;
    }

    const quantity = quantities[productId] || 1;
    
    if (latestProduct.stock < quantity) {
      toast({
        title: "Insufficient stock",
        description: `Only ${latestProduct.stock} items available. Quantity has been adjusted.`,
        variant: "destructive",
      });
      setQuantities({ ...quantities, [productId]: Math.max(1, latestProduct.stock) });
      // Update products state with latest data
      setProducts(prev => prev.map(p => p.id === productId ? latestProduct : p));
      return;
    }

    if (latestProduct.stock === 0) {
      toast({
        title: "Out of stock",
        description: "This product is currently out of stock",
        variant: "destructive",
      });
      fetchProducts();
      return;
    }

    setSelectedProduct(latestProduct);
    setConfirmDialogOpen(true);
  };

  const handleConfirmOrder = async (paymentMethod: "manual" | "qris" = "manual") => {
    if (!selectedProduct || !user) return;

    setIsCreatingOrder(true);
    try {
      const quantity = quantities[selectedProduct.id] || 1;

      // Double-check stock before creating order
      const { data: currentProduct, error: checkError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", selectedProduct.id)
        .single();

      if (checkError || !currentProduct) {
        throw new Error("Failed to verify product availability");
      }

      if (currentProduct.stock < quantity) {
        toast({
          title: "Stock changed",
          description: `Only ${currentProduct.stock} items available now. Please adjust your quantity.`,
          variant: "destructive",
        });
        setConfirmDialogOpen(false);
        fetchProducts();
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedProduct.duration_days);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: selectedProduct.id,
          quantity: quantity,
          expires_at: expiresAt.toISOString(),
          status: "pending",
          payment_status: "pending",
          payment_method: paymentMethod,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.id;
      setCreatedOrderId(orderId);

      // Handle QRIS payment
      if (paymentMethod === "qris") {
        const totalPrice = selectedProduct.price * quantity;
        const qrData = await createPayment(orderId, totalPrice);
        
        if (qrData) {
          setQrPaymentData(qrData);
          setConfirmDialogOpen(false);
          setShowQRDialog(true);
        } else {
          // If QR creation fails, let user know they can pay manually
          toast({
            title: "QR Payment Failed",
            description: "Order created. Please pay manually via bank transfer in My Transactions.",
            variant: "destructive",
          });
          setQuantities({ ...quantities, [selectedProduct.id]: 1 });
          setConfirmDialogOpen(false);
          setSelectedProduct(null);
          navigate("/transactions");
        }
      } else {
        // Manual payment flow
        toast({
          title: "Order created successfully!",
          description: "Please upload your payment proof in My Transactions to complete the order.",
        });

        setQuantities({ ...quantities, [selectedProduct.id]: 1 });
        setConfirmDialogOpen(false);
        setSelectedProduct(null);
        fetchProducts();
        
        navigate("/transactions");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleQRPaymentVerified = () => {
    setShowQRDialog(false);
    setQrPaymentData(null);
    setCreatedOrderId(null);
    setSelectedProduct(null);
    setQuantities(prev => selectedProduct ? { ...prev, [selectedProduct.id]: 1 } : prev);
    fetchProducts();
    
    toast({
      title: "Payment Successful!",
      description: "Your order has been verified. Check your transactions for redeem codes.",
    });
    
    navigate("/transactions");
  };

  const handleCheckQRStatus = async () => {
    if (!createdOrderId) return null;
    return await checkPaymentStatus(createdOrderId);
  };

  // Separate parent and child categories
  const parentCategories = categories.filter(c => !c.parent_id);
  const childCategories = categories.filter(c => c.parent_id);
  
  // Get child categories for selected parent
  const getChildCategories = (parentId: string) => {
    return childCategories.filter(c => c.parent_id === parentId);
  };
  
  // Selected parent for nested navigation
  const selectedParentId = selectedCategory 
    ? (categories.find(c => c.id === selectedCategory)?.parent_id || selectedCategory)
    : null;

  // Filter products by category
  const filteredProducts = (() => {
    if (!selectedCategory) return products;
    
    const selectedCat = categories.find(c => c.id === selectedCategory);
    if (!selectedCat) return products;
    
    // If this is a child category, filter exactly
    if (selectedCat.parent_id) {
      return products.filter(p => p.category_id === selectedCategory);
    }
    
    // If this is a parent category, include all child category products too
    const childCategoryIds = categories
      .filter(c => c.parent_id === selectedCategory)
      .map(c => c.id);
    
    const relevantCategoryIds = [selectedCategory, ...childCategoryIds];
    
    return products.filter(p => 
      p.category_id && relevantCategoryIds.includes(p.category_id)
    );
  })();

  // Pagination
  const displayedProducts = filteredProducts.slice(0, displayCount);
  const hasMore = displayCount < filteredProducts.length;
  const remainingCount = filteredProducts.length - displayCount;

  // Get product count per category
  const getProductCount = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return 0;
    
    if (cat.parent_id) {
      return products.filter(p => p.category_id === categoryId).length;
    }
    
    const childCategoryIds = categories
      .filter(c => c.parent_id === categoryId)
      .map(c => c.id);
    
    return products.filter(p => 
      p.category_id === categoryId || (p.category_id && childCategoryIds.includes(p.category_id))
    ).length;
  };

  const getCategoryImage = (imageUrl: string | null) => {
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt="" 
          className="h-4 w-4 sm:h-5 sm:w-5 object-cover rounded-sm"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    return <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEOHead 
        title={`Shop - ${siteSettings.name}`}
        description={`Browse and purchase cloud phone redeem codes at ${siteSettings.name}. Instant delivery, secure payment, 24/7 support.`}
        siteName={siteSettings.name}
      />
      <Navbar />
      
      {/* Enhanced Header */}
      <div className="relative overflow-hidden border-b-2 border-border bg-gradient-to-br from-background via-muted/30 to-background">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative container mx-auto px-4 py-8 sm:py-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-14 h-14 sm:w-16 sm:h-16 bg-primary border-2 border-border shadow-brutal flex items-center justify-center"
              >
                <ShoppingBag className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
              </motion.div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black flex items-center gap-2">
                  Our Products
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Premium cloud phone services
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-3 sm:gap-4"
            >
              <div className="text-center px-4 py-2 bg-background/80 backdrop-blur border-2 border-border rounded-lg shadow-brutal-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all">
                <p className="text-xl sm:text-2xl font-black text-primary">{products.length}</p>
                <p className="text-xs text-muted-foreground">Products</p>
              </div>
              <div className="text-center px-4 py-2 bg-background/80 backdrop-blur border-2 border-border rounded-lg shadow-brutal-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all">
                <p className="text-xl sm:text-2xl font-black text-primary">{parentCategories.length}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Sticky Category Filter */}
      {categories.length > 0 && (
        <div className="sticky top-16 z-20 bg-background/95 backdrop-blur border-b border-border shadow-sm">
          <div className="container mx-auto px-4 py-5 sm:py-6 space-y-4">
            {/* Parent Categories */}
            <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide mb-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-max">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="flex-shrink-0 text-sm h-9 sm:h-10 px-4 gap-2"
                >
                  All
                  <Badge variant="secondary" className="ml-1 text-xs bg-background/50">
                    {products.length}
                  </Badge>
                </Button>
                {parentCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedParentId === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="gap-1.5 flex-shrink-0 text-sm h-9 sm:h-10 px-4"
                  >
                    {getCategoryImage(category.image_url)}
                    {category.name}
                    <Badge variant="secondary" className="ml-1 text-xs bg-background/50">
                      {getProductCount(category.id)}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Child Categories - Show when parent is selected */}
            {selectedParentId && getChildCategories(selectedParentId).length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-x-auto -mx-4 px-4 scrollbar-hide"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
                  <Button
                    variant={selectedCategory === selectedParentId ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedCategory(selectedParentId)}
                    className="text-[10px] sm:text-xs flex-shrink-0 h-7 sm:h-8"
                  >
                    All {categories.find(c => c.id === selectedParentId)?.name}
                  </Button>
                  {getChildCategories(selectedParentId).map((child) => (
                    <Button
                      key={child.id}
                      variant={selectedCategory === child.id ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedCategory(child.id)}
                      className="gap-1 text-[10px] sm:text-xs flex-shrink-0 h-7 sm:h-8"
                    >
                      {getCategoryImage(child.image_url)}
                      {child.name}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}
            
            {selectedCategory && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="text-muted-foreground text-[10px] sm:text-xs h-6 sm:h-7"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear filter
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-10">
        {loading ? (
          // Skeleton Loading
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="p-4 space-y-3">
                  <Skeleton className="h-12 w-12 mx-auto rounded-lg" />
                  <Skeleton className="h-6 w-3/4 mx-auto" />
                  <Skeleton className="h-4 w-1/2 mx-auto" />
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-10 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          // Empty State
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 space-y-6"
          >
            <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center border-2 border-border">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">No Products Found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {selectedCategory 
                  ? "No products in this category yet. Try selecting a different category."
                  : "No products available at the moment. Check back soon!"}
              </p>
            </div>
            {selectedCategory && (
              <Button variant="outline" onClick={() => setSelectedCategory(null)} className="gap-2">
                <Layers className="h-4 w-4" />
                View All Products
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            {/* Showing count */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground mb-6 text-center"
            >
              Showing {displayedProducts.length} of {filteredProducts.length} products
            </motion.p>

            {/* Products Grid */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto"
            >
              <AnimatePresence mode="popLayout">
                {(() => {
                  // Calculate base price per day (from shortest duration product)
                  const basePricePerDay = filteredProducts.length > 0
                    ? Math.min(...filteredProducts.map(p => p.price / p.duration_days))
                    : 0;

                  return displayedProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      variants={itemVariants}
                      layout
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <ProductCard
                        {...product}
                        quantity={Math.min(quantities[product.id] || 1, product.stock || 1)}
                        onQuantityChange={handleQuantityChange}
                        onPurchase={handlePurchase}
                        isAuthenticated={!!user}
                        isBestSeller={product.id === bestSellerId}
                        basePrice={basePricePerDay}
                      />
                    </motion.div>
                  ));
                })()}
              </AnimatePresence>
            </motion.div>

            {/* Load More Button */}
            {hasMore && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4 mt-10"
              >
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setDisplayCount(prev => prev + ITEMS_PER_PAGE)}
                  className="gap-2 px-8 shadow-brutal-sm hover:shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                >
                  <TrendingUp className="h-4 w-4" />
                  Load More ({remainingCount} remaining)
                </Button>
              </motion.div>
            )}

            {/* All Loaded Indicator */}
            {!hasMore && filteredProducts.length > ITEMS_PER_PAGE && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-muted-foreground mt-10"
              >
                ✨ All {filteredProducts.length} products loaded
              </motion.p>
            )}
          </>
        )}
      </div>

      {/* Order Confirmation Dialog */}
      {selectedProduct && (
        <OrderConfirmationDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          product={{
            id: selectedProduct.id,
            name: selectedProduct.name,
            description: selectedProduct.description,
            price: selectedProduct.price,
            duration_days: selectedProduct.duration_days,
          }}
          quantity={quantities[selectedProduct.id] || 1}
          onConfirm={handleConfirmOrder}
          isLoading={isCreatingOrder}
          orderId={createdOrderId}
        />
      )}

      {/* QR Payment Dialog */}
      {qrPaymentData && selectedProduct && (
        <QRPaymentDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          paymentData={qrPaymentData}
          productName={selectedProduct.name}
          quantity={quantities[selectedProduct.id] || 1}
          onCheckStatus={handleCheckQRStatus}
          onPaymentVerified={handleQRPaymentVerified}
          isCheckingStatus={isCheckingStatus}
        />
      )}
    </div>
  );
};

export default Store;
