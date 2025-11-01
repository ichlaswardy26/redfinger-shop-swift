import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-cloud-phone.jpg";
import { Smartphone, Cloud, Shield, Zap } from "lucide-react";
import { OrderConfirmationDialog } from "@/components/OrderConfirmationDialog";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  stock: number;
  is_active: boolean;
}

interface ProductQuantity {
  [key: string]: number;
}

const Store = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<ProductQuantity>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    fetchProducts();

    return () => subscription.unsubscribe();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
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

  const handleQuantityChange = (productId: string, change: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentQty = quantities[productId] || 1;
    const newQty = Math.max(1, Math.min(product.stock, currentQty + change));
    setQuantities({ ...quantities, [productId]: newQty });
  };

  const handlePurchase = (productId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to purchase",
        variant: "destructive",
      });
      navigate("/auth/signin");
      return;
    }

    const product = products.find(p => p.id === productId);
    const quantity = quantities[productId] || 1;
    
    if (!product || product.stock < quantity) {
      toast({
        title: "Error",
        description: "Insufficient stock available",
        variant: "destructive",
      });
      return;
    }

    setSelectedProduct(product);
    setConfirmDialogOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!selectedProduct || !user) return;

    setIsCreatingOrder(true);
    try {
      const quantity = quantities[selectedProduct.id] || 1;
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
      
      // Navigate to transactions page
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-background z-0" />
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Redfinger Cloud Phone
                </span>
                <br />
                <span className="text-foreground">Redeem Codes</span>
              </h1>
              <p className="text-xl text-muted-foreground">
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
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30 blur-3xl" />
              <img 
                src={heroImage} 
                alt="Cloud Phone Technology" 
                className="relative rounded-2xl shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Cloud Based</h3>
              <p className="text-sm text-muted-foreground">Access anywhere with internet</p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Ultra Fast</h3>
              <p className="text-sm text-muted-foreground">High performance virtual device</p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">24/7 Runtime</h3>
              <p className="text-sm text-muted-foreground">Keep your apps running always</p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Secure</h3>
              <p className="text-sm text-muted-foreground">Your data is safe and private</p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold">Choose Your Plan</h2>
            <p className="text-xl text-muted-foreground">Select the perfect duration for your needs</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products available at the moment</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  quantity={quantities[product.id] || 1}
                  onQuantityChange={handleQuantityChange}
                  onPurchase={handlePurchase}
                  isAuthenticated={!!user}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <OrderConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        product={selectedProduct}
        quantity={selectedProduct ? (quantities[selectedProduct.id] || 1) : 1}
        onConfirm={handleConfirmOrder}
        isLoading={isCreatingOrder}
      />
    </div>
  );
};

export default Store;
