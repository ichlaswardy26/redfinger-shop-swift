import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { X, Layers, ShoppingBag } from "lucide-react";
import { OrderConfirmationDialog } from "@/components/OrderConfirmationDialog";

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { settings: siteSettings } = useSiteSettings();

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

  const handleConfirmOrder = async () => {
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

      const { error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: selectedProduct.id,
          quantity: quantity,
          expires_at: expiresAt.toISOString(),
          status: "pending",
          payment_status: "pending",
        });

      if (orderError) throw orderError;

      toast({
        title: "Order created successfully!",
        description: "Please upload your payment proof in My Transactions to complete the order.",
      });

      setQuantities({ ...quantities, [selectedProduct.id]: 1 });
      setConfirmDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
      
      navigate("/transactions");
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

  // Fix: When parent category selected, include products from all child categories
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
      
      {/* Simple Header */}
      <div className="border-b-2 border-border bg-muted/30">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary border-2 border-border shadow-brutal-sm flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black">Products</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Category Filter */}
      {categories.length > 0 && (
        <div className="sticky top-16 z-20 bg-background/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-5 sm:py-6 space-y-4">
            {/* Parent Categories */}
            <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide mb-2">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-max">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="flex-shrink-0 text-xs sm:text-sm h-8 sm:h-9"
                >
                  All
                </Button>
                {parentCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedParentId === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="gap-1 flex-shrink-0 text-xs sm:text-sm h-8 sm:h-9"
                  >
                    {getCategoryImage(category.image_url)}
                    <span className="hidden xs:inline sm:inline">{category.name}</span>
                    <span className="xs:hidden sm:hidden">{category.name.substring(0, 4)}{category.name.length > 4 ? '…' : ''}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Child Categories - Show when parent is selected */}
            {selectedParentId && getChildCategories(selectedParentId).length > 0 && (
              <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
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
              </div>
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {selectedCategory ? "No products in this category" : "No products available at the moment"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 max-w-6xl mx-auto">
            {(() => {
              // Calculate base price per day (from shortest duration product)
              const basePricePerDay = filteredProducts.length > 0
                ? Math.min(...filteredProducts.map(p => p.price / p.duration_days))
                : 0;

              return filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  quantity={Math.min(quantities[product.id] || 1, product.stock || 1)}
                  onQuantityChange={handleQuantityChange}
                  onPurchase={handlePurchase}
                  isAuthenticated={!!user}
                  isBestSeller={product.id === bestSellerId}
                  basePrice={basePricePerDay}
                />
              ));
            })()}
          </div>
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
        />
      )}
    </div>
  );
};

export default Store;
