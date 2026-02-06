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
import { X, Layers, ShoppingBag, Package, Sparkles, TrendingUp, CheckCircle } from "lucide-react";
import { OrderConfirmationDialog } from "@/components/OrderConfirmationDialog";
import { QRPaymentDialog } from "@/components/QRPaymentDialog";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { t } from "@/lib/translations";

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

const ITEMS_PER_PAGE = 12;

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

// Animated counter component
const AnimatedCounter = ({ value, duration = 1 }: { value: number; duration?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const increment = value / (duration * 60);
      const timer = setInterval(() => {
        start += increment;
        if (start >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, 1000 / 60);
      return () => clearInterval(timer);
    }
  }, [isInView, value, duration]);

  return <span ref={ref}>{displayValue}</span>;
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
        title: t.additional.authRequired,
        description: t.additional.pleaseSignIn,
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
        title: t.toasts.error,
        description: t.store.noProductsFound,
        variant: "destructive",
      });
      return;
    }

    const quantity = quantities[productId] || 1;
    
    if (latestProduct.stock < quantity) {
      toast({
        title: t.status.lowStock,
        description: `${t.products.onlyLeft} ${latestProduct.stock} ${t.products.inStock}`,
        variant: "destructive",
      });
      setQuantities({ ...quantities, [productId]: Math.max(1, latestProduct.stock) });
      // Update products state with latest data
      setProducts(prev => prev.map(p => p.id === productId ? latestProduct : p));
      return;
    }

    if (latestProduct.stock === 0) {
      toast({
        title: t.status.outOfStock,
        description: t.products.outOfStock,
        variant: "destructive",
      });
      fetchProducts();
      return;
    }

    setSelectedProduct(latestProduct);
    setConfirmDialogOpen(true);
  };

  const handleConfirmOrder = async (paymentMethod: "manual" | "qris" = "manual", voucherId?: string, discountAmount?: number) => {
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
         throw new Error(t.toasts.error);
       }

       if (currentProduct.stock < quantity) {
         toast({
           title: t.status.lowStock,
           description: `${t.products.onlyLeft} ${currentProduct.stock} ${t.products.inStock}`,
           variant: "destructive",
         });
         setConfirmDialogOpen(false);
         fetchProducts();
         return;
       }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedProduct.duration_days);

     const originalAmount = selectedProduct.price * quantity;
     const finalAmount = originalAmount - (discountAmount || 0);
 
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
         voucher_id: voucherId || null,
         discount_amount: discountAmount || 0,
         original_amount: originalAmount,
         final_amount: finalAmount,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.id;
      setCreatedOrderId(orderId);

      // Handle QRIS payment
      if (paymentMethod === "qris") {
       const qrData = await createPayment(orderId, finalAmount);
        
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
          title: t.checkout.orderCreated,
          description: t.checkout.orderCreatedDesc,
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
      title: t.checkout.paymentVerified,
      description: t.checkout.orderCreatedDesc,
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
      <div className="relative overflow-hidden border-b-2 border-border mesh-gradient">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-primary/30 to-primary/20 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-20 -left-20 w-56 h-56 bg-gradient-to-tr from-accent/30 to-accent/10 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.15, 1],
              x: [0, 20, 0],
              y: [0, -20, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-1/3 left-1/4 w-40 h-40 bg-primary/10 rounded-full blur-3xl"
          />
          {/* Dot pattern overlay */}
          <div className="absolute inset-0 dot-pattern opacity-30" />
          {/* Floating geometric shapes */}
          <motion.div
            animate={{ y: [-10, 10, -10], rotate: [0, 90, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 right-1/4 w-8 h-8 border-2 border-primary/30 rotate-45"
          />
          <motion.div
            animate={{ y: [10, -10, 10], rotate: [0, -180, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-16 left-1/3 w-6 h-6 bg-accent/20 rounded-full"
          />
        </div>
        
        <div className="relative container mx-auto px-4 py-10 sm:py-14 md:py-16">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center text-center gap-8"
          >
            {/* Hero Icon with pulse ring */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 w-20 h-20 sm:w-24 sm:h-24 bg-primary/30 rounded-2xl"
              />
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-primary to-primary/80 border-2 border-border shadow-brutal-lg rounded-2xl flex items-center justify-center"
              >
                <ShoppingBag className="h-9 w-9 sm:h-11 sm:w-11 text-primary-foreground" />
              </motion.div>
            </div>
            
            {/* Title Section */}
            <div className="space-y-3">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight"
              >
                {t.store.title}{" "}
                <span className="gradient-text">Premium</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              >
                {t.products.instantDelivery}
              </motion.p>
            </div>

            {/* Animated Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-2"
            >
              {/* Products Stat */}
              <motion.div
                whileHover={{ y: -4, boxShadow: "6px 6px 0px hsl(var(--border))" }}
                className="group relative text-center px-5 sm:px-6 py-3 sm:py-4 bg-card/90 backdrop-blur-md border-2 border-border rounded-xl shadow-brutal transition-all cursor-default"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse-ring" />
                      <Package className="h-5 w-5 text-primary relative" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-primary">
                      <AnimatedCounter value={products.length} />
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">{t.store.products}</p>
                </div>
              </motion.div>

              {/* Categories Stat */}
              <motion.div
                whileHover={{ y: -4, boxShadow: "6px 6px 0px hsl(var(--border))" }}
                className="group relative text-center px-5 sm:px-6 py-3 sm:py-4 bg-card/90 backdrop-blur-md border-2 border-border rounded-xl shadow-brutal transition-all cursor-default"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="relative">
                      <div className="absolute inset-0 bg-accent/20 rounded-full animate-pulse-ring stagger-1" />
                      <Layers className="h-5 w-5 text-accent relative" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-accent">
                      <AnimatedCounter value={parentCategories.length} />
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">{t.store.stats.categories}</p>
                </div>
              </motion.div>

              {/* In Stock Stat */}
              <motion.div
                whileHover={{ y: -4, boxShadow: "6px 6px 0px hsl(var(--border))" }}
                className="group relative text-center px-5 sm:px-6 py-3 sm:py-4 bg-card/90 backdrop-blur-md border-2 border-border rounded-xl shadow-brutal transition-all cursor-default"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse-ring stagger-2" />
                      <CheckCircle className="h-5 w-5 text-green-500 relative" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-green-500">
                      <AnimatedCounter value={products.filter(p => p.stock > 0).length} />
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">{t.status.available}</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Sticky Category Filter */}
      {categories.length > 0 && (
        <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-lg border-b-2 border-border/30 shadow-lg">
          <div className="container mx-auto px-4 py-4 sm:py-5 space-y-4">
            {/* Parent Categories */}
            <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-max">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(null)}
                  className={`relative flex-shrink-0 flex items-center gap-2 text-sm font-bold h-10 sm:h-11 px-4 sm:px-5 rounded-xl border-2 transition-all duration-300 ${
                    selectedCategory === null 
                      ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-primary shadow-brutal-sm" 
                      : "bg-card border-border hover:border-primary/50 hover:shadow-brutal-sm"
                  }`}
                >
                  {selectedCategory === null && (
                    <motion.span
                      layoutId="categoryIndicator"
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent rounded-full shadow-lg"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  {t.ui.all}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedCategory === null 
                      ? "bg-primary-foreground/20 text-primary-foreground" 
                      : "bg-primary/10 text-primary"
                  }`}>
                    {products.length}
                  </span>
                </motion.button>

                {parentCategories.map((category) => (
                  <motion.button
                    key={category.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`relative flex-shrink-0 flex items-center gap-2 text-sm font-bold h-10 sm:h-11 px-4 sm:px-5 rounded-xl border-2 transition-all duration-300 ${
                      selectedParentId === category.id 
                        ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-primary shadow-brutal-sm" 
                        : "bg-card border-border hover:border-primary/50 hover:shadow-brutal-sm"
                    }`}
                  >
                    {selectedParentId === category.id && (
                      <motion.span
                        layoutId="categoryIndicator"
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent rounded-full shadow-lg"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    {getCategoryImage(category.image_url)}
                    {category.name}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedParentId === category.id 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-primary/10 text-primary"
                    }`}>
                      {getProductCount(category.id)}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
            
            {/* Child Categories - Show when parent is selected */}
            <AnimatePresence>
              {selectedParentId && getChildCategories(selectedParentId).length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-x-auto -mx-4 px-4 scrollbar-hide"
                >
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.05 } }
                    }}
                    className="flex items-center gap-2 sm:gap-2.5 min-w-max bg-muted/40 backdrop-blur-sm p-2 rounded-xl border border-border/30"
                  >
                    <motion.button
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedCategory(selectedParentId)}
                      className={`text-xs sm:text-sm font-medium flex-shrink-0 h-8 sm:h-9 px-3 sm:px-4 rounded-lg transition-all duration-200 ${
                        selectedCategory === selectedParentId 
                          ? "bg-secondary text-secondary-foreground shadow-brutal-sm" 
                          : "hover:bg-muted"
                      }`}
                    >
                      {t.ui.all} {categories.find(c => c.id === selectedParentId)?.name}
                    </motion.button>
                    {getChildCategories(selectedParentId).map((child) => (
                      <motion.button
                        key={child.id}
                        variants={{
                          hidden: { opacity: 0, x: -10 },
                          visible: { opacity: 1, x: 0 }
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedCategory(child.id)}
                        className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium flex-shrink-0 h-8 sm:h-9 px-3 sm:px-4 rounded-lg transition-all duration-200 ${
                          selectedCategory === child.id 
                            ? "bg-secondary text-secondary-foreground shadow-brutal-sm" 
                            : "hover:bg-muted"
                        }`}
                      >
                        {getCategoryImage(child.image_url)}
                        {child.name}
                      </motion.button>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {selectedCategory && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium h-7 px-3 rounded-full hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                >
                  <X className="h-3.5 w-3.5" />
                  {t.table.reset}
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-10 md:py-12">
        {loading ? (
          // Skeleton Loading
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-7xl mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="overflow-hidden shimmer">
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
              </motion.div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          // Empty State
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 space-y-8"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-28 h-28 mx-auto bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center border-2 border-border shadow-brutal"
            >
              <Package className="h-14 w-14 text-muted-foreground" />
            </motion.div>
            <div>
              <h3 className="text-2xl font-black mb-3">{t.store.noProductsFound}</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {t.ui.noResults}
                {selectedCategory 
                  ? t.store.noProductsFound
                  : t.store.noProductsFound}
              </p>
            </div>
            {selectedCategory && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button variant="default" onClick={() => setSelectedCategory(null)} className="gap-2 shadow-brutal">
                <Layers className="h-4 w-4" />
                {t.store.allProducts}
              </Button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <>
            {/* Showing count */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground mb-8 text-center font-medium"
            >
              {t.store.showing} <span className="text-foreground font-bold">{displayedProducts.length}</span> {t.store.of}{" "}
              <span className="text-foreground font-bold">{filteredProducts.length}</span> {t.store.products}
            </motion.p>

            {/* Products Grid */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7 max-w-7xl mx-auto"
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 mt-12"
              >
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                  variant="default" 
                  size="lg"
                  onClick={() => setDisplayCount(prev => prev + ITEMS_PER_PAGE)}
                  className="gap-3 px-8 h-12 text-base shadow-brutal hover:shadow-brutal-lg transition-all bg-gradient-to-r from-primary to-primary/80"
                >
                    <motion.span
                      animate={{ y: [0, 3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <TrendingUp className="h-5 w-5" />
                    </motion.span>
                    {t.store.loadMore}
                    <span className="px-2 py-0.5 bg-primary-foreground/20 rounded-full text-sm">
                      {remainingCount}
                    </span>
                </Button>
                </motion.div>
              </motion.div>
            )}

            {/* All Loaded Indicator */}
            {!hasMore && filteredProducts.length > ITEMS_PER_PAGE && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 mt-12"
              >
                <Sparkles className="h-4 w-4 text-accent" />
                <p className="text-sm font-medium text-muted-foreground">
                  All <span className="text-foreground font-bold">{filteredProducts.length}</span> products loaded
                </p>
                <Sparkles className="h-4 w-4 text-accent" />
              </motion.div>
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
