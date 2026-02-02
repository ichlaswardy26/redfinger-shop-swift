import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import heroImage from "@/assets/hero-cloud-phone.jpg";
import { Smartphone, Cloud, Shield, Zap, Star, Quote, TrendingUp, Mail, Phone, MessageCircle, Facebook, Instagram, Twitter, ArrowRight, CheckCircle, Layers } from "lucide-react";

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
}

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  profiles: { full_name: string | null };
  products: { name: string };
}

interface WebSettings {
  site: {
    name: string;
    tagline: string;
    description: string;
  };
  hero: {
    title: string;
    subtitle: string;
    buttonText: string;
    secondaryButtonText: string;
    trustedText: string;
    badges: string[];
  };
  features: {
    title: string;
    subtitle: string;
    items: Array<{ icon: string; title: string; description: string }>;
  };
  products: {
    title: string;
    subtitle: string;
    showCategories: boolean;
  };
  testimonials: {
    title: string;
    subtitle: string;
  };
  cta: {
    title: string;
    subtitle: string;
    buttonText: string;
  };
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
  };
  social: {
    facebook: string;
    instagram: string;
    twitter: string;
  };
  footer: {
    copyrightText: string;
  };
}

const defaultSettings: WebSettings = {
  site: {
    name: "Redfinger Store",
    tagline: "Cloud Phone Services",
    description: "Premium cloud gaming and app automation services"
  },
  hero: {
    title: "Premium Redfinger Cloud Phone Services",
    subtitle: "Experience seamless cloud gaming and app automation with our reliable Redfinger subscriptions",
    buttonText: "Browse Store",
    secondaryButtonText: "Sign In",
    trustedText: "Trusted by 10,000+ customers",
    badges: ["Instant Delivery", "24/7 Support", "Secure Payment"]
  },
  features: {
    title: "Why Choose Us?",
    subtitle: "Premium features for the best cloud phone experience",
    items: [
      { icon: "smartphone", title: "Multiple Devices", description: "Run multiple cloud phones simultaneously" },
      { icon: "cloud", title: "24/7 Uptime", description: "Always-on cloud infrastructure" },
      { icon: "shield", title: "Secure & Reliable", description: "Enterprise-grade security standards" },
      { icon: "zap", title: "High Performance", description: "Optimized for speed and efficiency" },
    ]
  },
  products: {
    title: "Our Plans",
    subtitle: "Choose the perfect plan for your needs",
    showCategories: true
  },
  testimonials: {
    title: "Customer Testimonials",
    subtitle: "See what our customers are saying"
  },
  cta: {
    title: "Ready to Get Started?",
    subtitle: "Join thousands of satisfied customers using our premium Redfinger cloud phone services",
    buttonText: "View Plans & Pricing"
  },
  contact: { email: "support@redfinger.store", phone: "+62812345678", whatsapp: "+62812345678" },
  social: { facebook: "", instagram: "", twitter: "" },
  footer: { copyrightText: "© 2024 Redfinger Store. All rights reserved." }
};

const iconMap: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="h-6 w-6 text-primary" />,
  cloud: <Cloud className="h-6 w-6 text-primary" />,
  shield: <Shield className="h-6 w-6 text-primary" />,
  zap: <Zap className="h-6 w-6 text-primary" />,
  layers: <Layers className="h-6 w-6 text-primary" />,
};

const Index = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [bestSellerId, setBestSellerId] = useState<string | null>(null);
  const [settings, setSettings] = useState<WebSettings>(defaultSettings);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchRatings();
    fetchBestSeller();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("web_settings")
        .select("key, value");
      
      if (!error && data) {
        const settingsObj: Record<string, any> = {};
        data.forEach(item => {
          settingsObj[item.key] = item.value;
        });
        setSettings(prev => ({
          ...prev,
          ...settingsObj,
        }));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

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
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

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

  const getCategoryIcon = (iconName: string | null) => {
    return iconMap[iconName || "layers"] || iconMap.layers;
  };

  // Group products by category
  const productsByCategory = categories.reduce((acc, cat) => {
    acc[cat.id] = products.filter(p => p.category_id === cat.id);
    return acc;
  }, {} as Record<string, Product[]>);

  // Products without category
  const uncategorizedProducts = products.filter(p => !p.category_id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Cloud Phone Hero" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background/90" />
        </div>
        
        <div className="relative container mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="px-4 py-2">
              <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
              {settings.hero.trustedText || defaultSettings.hero.trustedText}
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {settings.hero.title || defaultSettings.hero.title}
            </h1>
            <p className="text-xl text-muted-foreground">{settings.hero.subtitle || defaultSettings.hero.subtitle}</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/store")} className="text-lg px-8 gap-2">
                {settings.hero.buttonText || defaultSettings.hero.buttonText} <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth/signin")}>
                {settings.hero.secondaryButtonText || defaultSettings.hero.secondaryButtonText}
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 justify-center pt-4">
              {(settings.hero.badges || defaultSettings.hero.badges).map((badge, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" /> {badge}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">{settings.features.title || defaultSettings.features.title}</h2>
          <p className="text-muted-foreground text-lg">{settings.features.subtitle || defaultSettings.features.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(settings.features.items?.length > 0 ? settings.features.items : defaultSettings.features.items).map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  {iconMap[feature.icon] || <Zap className="h-6 w-6 text-primary" />}
                </div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Products by Category Section */}
      {(settings.products?.showCategories !== false) && categories.length > 0 && (
        <section className="container mx-auto px-4 py-16 lg:py-24 bg-muted/20">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{settings.products?.title || defaultSettings.products.title}</h2>
            <p className="text-muted-foreground text-lg">{settings.products?.subtitle || defaultSettings.products.subtitle}</p>
          </div>

          <div className="space-y-16">
            {categories.map((category) => {
              const categoryProducts = productsByCategory[category.id] || [];
              if (categoryProducts.length === 0) return null;
              
              return (
                <div key={category.id}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      {getCategoryIcon(category.icon)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{category.name}</h3>
                      {category.description && (
                        <p className="text-muted-foreground text-sm">{category.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryProducts.slice(0, 3).map((product) => (
                      <Card key={product.id} className="relative border-2 hover:border-primary/50 transition-all hover:shadow-xl">
                        {bestSellerId === product.id && (
                          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                            <TrendingUp className="h-3 w-3 mr-1" />Best Seller
                          </Badge>
                        )}
                        <CardContent className="pt-6 space-y-4">
                          <div className="text-center space-y-2">
                            <h4 className="text-xl font-bold">{product.name}</h4>
                            {product.description && <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>}
                          </div>
                          <div className="text-center py-4">
                            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              Rp {product.price.toLocaleString('id-ID')}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{product.duration_days} days validity</p>
                          </div>
                          <Badge variant={product.stock > 0 ? "default" : "secondary"} className="w-full justify-center">
                            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                          </Badge>
                          <Button className="w-full" onClick={() => navigate("/store")} disabled={product.stock === 0}>
                            {product.stock > 0 ? "Order Now" : "Out of Stock"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {categoryProducts.length > 3 && (
                    <div className="text-center mt-4">
                      <Button variant="outline" onClick={() => navigate("/store")}>
                        View All {category.name} Products ({categoryProducts.length})
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized products */}
            {uncategorizedProducts.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Layers className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Other Products</h3>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {uncategorizedProducts.slice(0, 3).map((product) => (
                    <Card key={product.id} className="relative border-2 hover:border-primary/50 transition-all hover:shadow-xl">
                      {bestSellerId === product.id && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                          <TrendingUp className="h-3 w-3 mr-1" />Best Seller
                        </Badge>
                      )}
                      <CardContent className="pt-6 space-y-4">
                        <div className="text-center space-y-2">
                          <h4 className="text-xl font-bold">{product.name}</h4>
                          {product.description && <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>}
                        </div>
                        <div className="text-center py-4">
                          <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                            Rp {product.price.toLocaleString('id-ID')}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{product.duration_days} days validity</p>
                        </div>
                        <Badge variant={product.stock > 0 ? "default" : "secondary"} className="w-full justify-center">
                          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                        </Badge>
                        <Button className="w-full" onClick={() => navigate("/store")} disabled={product.stock === 0}>
                          {product.stock > 0 ? "Order Now" : "Out of Stock"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" variant="outline" onClick={() => navigate("/store")}>View All Products</Button>
          </div>
        </section>
      )}

      {/* Fallback if no categories - show all products */}
      {(settings.products?.showCategories === false || categories.length === 0) && products.length > 0 && (
        <section className="container mx-auto px-4 py-16 lg:py-24 bg-muted/20">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{settings.products?.title || defaultSettings.products.title}</h2>
            <p className="text-muted-foreground text-lg">{settings.products?.subtitle || defaultSettings.products.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {products.slice(0, 3).map((product) => (
              <Card key={product.id} className="relative border-2 hover:border-primary/50 transition-all hover:shadow-xl">
                {bestSellerId === product.id && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                    <TrendingUp className="h-3 w-3 mr-1" />Best Seller
                  </Badge>
                )}
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">{product.name}</h3>
                    {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
                  </div>
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      Rp {product.price.toLocaleString('id-ID')}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{product.duration_days} days validity</p>
                  </div>
                  <Badge variant={product.stock > 0 ? "default" : "secondary"} className="w-full justify-center">
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </Badge>
                  <Button className="w-full" onClick={() => navigate("/store")} disabled={product.stock === 0}>
                    {product.stock > 0 ? "Order Now" : "Out of Stock"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button size="lg" variant="outline" onClick={() => navigate("/store")}>View All Products</Button>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {ratings.length > 0 && (
        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{settings.testimonials?.title || defaultSettings.testimonials.title}</h2>
            <p className="text-muted-foreground text-lg">{settings.testimonials?.subtitle || defaultSettings.testimonials.subtitle}</p>
          </div>

          <div className="max-w-6xl mx-auto">
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent>
                {ratings.map((rating) => (
                  <CarouselItem key={rating.id} className="md:basis-1/2 lg:basis-1/3">
                    <Card className="relative h-full border-2">
                      <CardContent className="pt-6 space-y-4 h-full flex flex-col">
                        <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < rating.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                        {rating.review && <p className="text-sm text-muted-foreground line-clamp-4 flex-grow">"{rating.review}"</p>}
                        <div className="pt-4 border-t mt-auto">
                          <p className="font-semibold text-sm">{rating.profiles.full_name || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">{rating.products.name}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="py-12 space-y-6 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold">{settings.cta?.title || defaultSettings.cta.title}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{settings.cta?.subtitle || defaultSettings.cta.subtitle}</p>
            <Button size="lg" onClick={() => navigate("/store")} className="text-lg px-8 gap-2">
              {settings.cta?.buttonText || defaultSettings.cta.buttonText} <ArrowRight className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Contact Section */}
      <section className="container mx-auto px-4 py-16 border-t">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {(settings.contact?.email || defaultSettings.contact.email) && (
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Email</h3>
              <a href={`mailto:${settings.contact?.email || defaultSettings.contact.email}`} className="text-muted-foreground hover:text-primary transition-colors">
                {settings.contact?.email || defaultSettings.contact.email}
              </a>
            </div>
          )}
          {(settings.contact?.phone || defaultSettings.contact.phone) && (
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Phone</h3>
              <a href={`tel:${settings.contact?.phone || defaultSettings.contact.phone}`} className="text-muted-foreground hover:text-primary transition-colors">
                {settings.contact?.phone || defaultSettings.contact.phone}
              </a>
            </div>
          )}
          {(settings.contact?.whatsapp || defaultSettings.contact.whatsapp) && (
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">WhatsApp</h3>
              <a 
                href={`https://wa.me/${(settings.contact?.whatsapp || defaultSettings.contact.whatsapp).replace(/[^0-9]/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Chat with us
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{settings.footer?.copyrightText || defaultSettings.footer.copyrightText}</p>
            <div className="flex items-center gap-4">
              {(settings.social?.facebook || defaultSettings.social.facebook) && (
                <a href={settings.social?.facebook || defaultSettings.social.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {(settings.social?.instagram || defaultSettings.social.instagram) && (
                <a href={settings.social?.instagram || defaultSettings.social.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {(settings.social?.twitter || defaultSettings.social.twitter) && (
                <a href={settings.social?.twitter || defaultSettings.social.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
