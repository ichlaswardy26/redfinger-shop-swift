import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroImage from "@/assets/hero-cloud-phone.jpg";
import { Smartphone, Cloud, Shield, Zap, Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

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

const Index = () => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const ratingsPerPage = 6;
  const navigate = useNavigate();

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from("product_ratings")
        .select("id, rating, review, created_at, user_id, product_id")
        .eq("is_visible", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const productIds = [...new Set(data?.map(r => r.product_id) || [])];

      const [profilesRes, productsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", userIds),
        supabase.from("products").select("id, name").in("id", productIds)
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const productMap = new Map(productsRes.data?.map(p => [p.id, p]) || []);

      const enrichedRatings = (data || []).map(rating => ({
        ...rating,
        profiles: { full_name: profileMap.get(rating.user_id)?.full_name || null },
        products: { name: productMap.get(rating.product_id)?.name || "" }
      }));

      setRatings(enrichedRatings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
    }
  };

  const totalPages = Math.ceil(ratings.length / ratingsPerPage);
  const displayedRatings = ratings.slice(
    currentPage * ratingsPerPage,
    (currentPage + 1) * ratingsPerPage
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Cloud Phone Hero"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background/90" />
        </div>
        
        <div className="relative container mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
              Premium Redfinger Cloud Phone Services
            </h1>
            <p className="text-xl text-muted-foreground">
              Experience seamless cloud gaming and app automation with our reliable Redfinger subscriptions
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/store")} className="text-lg px-8">
                Browse Store
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth/signin")}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why Choose Us?</h2>
          <p className="text-muted-foreground text-lg">Premium features for the best cloud phone experience</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-2 hover:border-primary/50 transition-all">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Multiple Devices</h3>
              <p className="text-sm text-muted-foreground">
                Run multiple cloud phones simultaneously
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">24/7 Uptime</h3>
              <p className="text-sm text-muted-foreground">
                Always-on cloud infrastructure
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Secure & Reliable</h3>
              <p className="text-sm text-muted-foreground">
                Enterprise-grade security standards
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">High Performance</h3>
              <p className="text-sm text-muted-foreground">
                Optimized for speed and efficiency
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials Section */}
      {ratings.length > 0 && (
        <section className="container mx-auto px-4 py-16 lg:py-24 bg-muted/30">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Customer Testimonials</h2>
            <p className="text-muted-foreground text-lg">See what our customers are saying</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {displayedRatings.map((rating) => (
              <Card key={rating.id} className="relative">
                <CardContent className="pt-6 space-y-4">
                  <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
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
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      "{rating.review}"
                    </p>
                  )}
                  <div className="pt-4 border-t">
                    <p className="font-semibold text-sm">
                      {rating.profiles.full_name || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rating.products.name}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>
      )}

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-12 space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of satisfied customers using our premium Redfinger cloud phone services
            </p>
            <Button size="lg" onClick={() => navigate("/store")} className="text-lg px-8">
              View Plans & Pricing
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;
