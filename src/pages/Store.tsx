import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-cloud-phone.jpg";
import { Smartphone, Cloud, Shield, Zap, Star, ChevronLeft, ChevronRight, Filter, X, Layers } from "lucide-react";
import { OrderConfirmationDialog } from "@/components/OrderConfirmationDialog";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
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

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
  };
  products: {
    name: string;
  };
}

interface ProductQuantity {
  [key: string]: number;
}

const Store = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<ProductQuantity>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [currentRatingPage, setCurrentRatingPage] = useState(0);
  const [bestSellerId, setBestSellerId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const ratingsPerPage = 6;
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    fetchCategories();
    fetchProducts();
    fetchRatings();
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

  const fetchRatings = async () => {
    try {
      // Use the secure public_product_ratings view instead of product_ratings table
      const { data, error } = await supabase
        .from("public_product_ratings")
        .select("id, rating, review, created_at, product_id, reviewer_name, product_name")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;

      // Transform to match expected format
      const enrichedRatings = (data || []).map(rating => ({
        ...rating,
        profiles: { full_name: rating.reviewer_name || null },
        products: { name: rating.product_name || "" }
      }));

      setRatings(enrichedRatings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
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

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  const getCategoryIcon = (iconName: string | null) => {
    switch (iconName) {
      case "smartphone": return <Smartphone className="h-4 w-4" />;
      case "cloud": return <Cloud className="h-4 w-4" />;
      case "shield": return <Shield className="h-4 w-4" />;
      case "zap": return <Zap className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEOHead 
        title="Shop - Redfinger Cloud Phone Codes"
        description="Browse and purchase Redfinger cloud phone redeem codes. Instant delivery, secure payment, 24/7 support."
      />
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/30 z-0" />
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-24 h-24 bg-primary/20 border-2 border-border rotate-12" />
          <div className="absolute bottom-20 left-20 w-20 h-20 bg-accent/30 border-2 border-border -rotate-6" />
        </div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-black leading-tight">
                <span className="bg-primary text-primary-foreground px-2 inline-block border-2 border-border shadow-brutal">
                  Redfinger Cloud Phone
                </span>
                <br />
                <span className="text-foreground mt-2 inline-block">Redeem Codes</span>
              </h1>
              <p className="text-xl text-muted-foreground font-medium">
                Access your virtual Android device anywhere, anytime. Run apps 24/7 in the cloud with premium performance.
              </p>
              <div className="flex gap-4">
                <Button variant="hero" size="lg" onClick={() => {
                  const productsSection = document.getElementById("products");
                  productsSection?.scrollIntoView({ behavior: "smooth" });
                }}>
                  Browse Products
                </Button>
                {!user && (
                  <Button variant="outline" size="lg" onClick={() => navigate("/auth/signup")}>
                    Sign Up Free
                  </Button>
                )}
              </div>
            </div>
            <div className="relative">
              <div className="border-2 border-border shadow-brutal-lg overflow-hidden">
                <img 
                  src={heroImage} 
                  alt="Cloud Phone Technology" 
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 bg-primary border-2 border-border shadow-brutal-sm flex items-center justify-center">
                <Cloud className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-bold">Cloud Based</h3>
              <p className="text-sm text-muted-foreground">Access anywhere with internet</p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 bg-accent border-2 border-border shadow-brutal-sm flex items-center justify-center">
                <Zap className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-bold">Ultra Fast</h3>
              <p className="text-sm text-muted-foreground">High performance virtual device</p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 bg-secondary border-2 border-border shadow-brutal-sm flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="font-bold">24/7 Runtime</h3>
              <p className="text-sm text-muted-foreground">Keep your apps running always</p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 bg-primary border-2 border-border shadow-brutal-sm flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-bold">Secure</h3>
              <p className="text-sm text-muted-foreground">Your data is safe and private</p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-4xl font-bold">Choose Your Plan</h2>
            <p className="text-xl text-muted-foreground">Select the perfect duration for your needs</p>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-2 justify-center">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All Products
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="gap-1"
                  >
                    {getCategoryIcon(category.icon)}
                    {category.name}
                  </Button>
                ))}
              </div>
              {selectedCategory && (
                <div className="text-center mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear filter
                  </Button>
                </div>
              )}
            </div>
          )}

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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
      </section>

      {/* Testimonials Section */}
      {ratings.length > 0 && (
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl font-bold">What Our Customers Say</h2>
              <p className="text-xl text-muted-foreground">Real reviews from verified customers</p>
            </div>
            
            <div className="flex justify-center items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentRatingPage(Math.max(0, currentRatingPage - 1))}
                disabled={currentRatingPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentRatingPage + 1} of {Math.ceil(ratings.length / ratingsPerPage)}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentRatingPage(Math.min(Math.ceil(ratings.length / ratingsPerPage) - 1, currentRatingPage + 1))}
                disabled={currentRatingPage >= Math.ceil(ratings.length / ratingsPerPage) - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {ratings
                .slice(currentRatingPage * ratingsPerPage, (currentRatingPage + 1) * ratingsPerPage)
                .map((rating) => (
                  <Card key={rating.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < rating.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      {rating.review && (
                        <p className="text-sm text-foreground line-clamp-4">{rating.review}</p>
                      )}
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium">{rating.profiles?.full_name || "Anonymous"}</p>
                        <p className="text-xs text-muted-foreground">{rating.products?.name}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </section>
      )}

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
