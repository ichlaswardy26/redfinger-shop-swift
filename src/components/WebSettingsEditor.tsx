import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, Loader2 } from "lucide-react";

interface WebSettings {
  site: {
    name: string;
    tagline: string;
    description: string;
    logo: string;
    favicon: string;
  };
  header: {
    showLogo: boolean;
    showTagline: boolean;
    backgroundColor: string;
    textColor: string;
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
    items: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
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
    youtube: string;
  };
  footer: {
    copyrightText: string;
    links: Array<{ label: string; url: string }>;
  };
  trustIndicators: {
    happyCustomers: string;
    ordersCompleted: string;
    successRate: string;
    supportAvailability: string;
  };
  faq: {
    title: string;
    subtitle: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
}

const defaultSettings: WebSettings = {
  site: {
    name: "Redfinger Store",
    tagline: "Cloud Phone Services",
    description: "Premium cloud gaming and app automation services",
    logo: "",
    favicon: ""
  },
  header: {
    showLogo: true,
    showTagline: false,
    backgroundColor: "",
    textColor: ""
  },
  hero: {
    title: "Premium Redfinger Cloud Phone Services",
    subtitle: "Experience seamless cloud gaming and app automation",
    buttonText: "Browse Store",
    secondaryButtonText: "Sign In",
    trustedText: "Trusted by 10,000+ customers",
    badges: ["Instant Delivery", "24/7 Support", "Secure Payment"]
  },
  features: {
    title: "Why Choose Us?",
    subtitle: "Premium features for the best experience",
    items: []
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
    subtitle: "Join thousands of satisfied customers",
    buttonText: "View Plans & Pricing"
  },
  contact: { email: "", phone: "", whatsapp: "" },
  social: { facebook: "", instagram: "", twitter: "", youtube: "" },
  footer: { copyrightText: "", links: [] },
  trustIndicators: {
    happyCustomers: "10,000+",
    ordersCompleted: "50,000+",
    successRate: "99.9%",
    supportAvailability: "24/7"
  },
  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Find answers to common questions",
    items: []
  }
};

export const WebSettingsEditor = () => {
  const [settings, setSettings] = useState<WebSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("web_settings")
        .select("key, value");

      if (error) throw error;

      const settingsMap: any = { ...defaultSettings };
      data?.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: keyof WebSettings) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("web_settings")
        .upsert({
          key,
          value: settings[key],
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, { onConflict: 'key' });

      if (error) throw error;

      toast({ title: "Settings saved successfully" });
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof WebSettings>(
    section: K, 
    field: keyof WebSettings[K], 
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const addFeatureItem = () => {
    setSettings(prev => ({
      ...prev,
      features: {
        ...prev.features,
        items: [...prev.features.items, { icon: "star", title: "", description: "" }]
      }
    }));
  };

  const updateFeatureItem = (index: number, field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      features: {
        ...prev.features,
        items: prev.features.items.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }
    }));
  };

  const removeFeatureItem = (index: number) => {
    setSettings(prev => ({
      ...prev,
      features: {
        ...prev.features,
        items: prev.features.items.filter((_, i) => i !== index)
      }
    }));
  };

  const addFooterLink = () => {
    setSettings(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        links: [...prev.footer.links, { label: "", url: "" }]
      }
    }));
  };

  const updateFooterLink = (index: number, field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        links: prev.footer.links.map((link, i) => 
          i === index ? { ...link, [field]: value } : link
        )
      }
    }));
  };

  const removeFooterLink = (index: number) => {
    setSettings(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        links: prev.footer.links.filter((_, i) => i !== index)
      }
    }));
  };

  const addHeroBadge = () => {
    setSettings(prev => ({
      ...prev,
      hero: {
        ...prev.hero,
        badges: [...(prev.hero.badges || []), "New Badge"]
      }
    }));
  };

  const updateHeroBadge = (index: number, value: string) => {
    setSettings(prev => ({
      ...prev,
      hero: {
        ...prev.hero,
        badges: prev.hero.badges.map((badge, i) => i === index ? value : badge)
      }
    }));
  };

  const removeHeroBadge = (index: number) => {
    setSettings(prev => ({
      ...prev,
      hero: {
        ...prev.hero,
        badges: prev.hero.badges.filter((_, i) => i !== index)
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="site" className="w-full">
      <div className="overflow-x-auto pb-2">
        <TabsList className="inline-flex w-auto">
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="trust">Trust Stats</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="cta">CTA</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>
      </div>

      {/* Site Settings */}
      <TabsContent value="site">
        <Card>
          <CardHeader>
            <CardTitle>Site Settings</CardTitle>
            <CardDescription>Configure your website's basic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="site-name">Site Name</Label>
              <Input
                id="site-name"
                value={settings.site.name}
                onChange={(e) => updateSetting('site', 'name', e.target.value)}
                placeholder="Your Store Name"
              />
            </div>
            <div>
              <Label htmlFor="site-tagline">Tagline</Label>
              <Input
                id="site-tagline"
                value={settings.site.tagline}
                onChange={(e) => updateSetting('site', 'tagline', e.target.value)}
                placeholder="Short tagline for your store"
              />
            </div>
            <div>
              <Label htmlFor="site-description">Site Description (SEO)</Label>
              <Textarea
                id="site-description"
                value={settings.site.description}
                onChange={(e) => updateSetting('site', 'description', e.target.value)}
                placeholder="A brief description of your website for search engines"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="site-logo">Logo URL</Label>
                <Input
                  id="site-logo"
                  value={settings.site.logo}
                  onChange={(e) => updateSetting('site', 'logo', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="site-favicon">Favicon URL</Label>
                <Input
                  id="site-favicon"
                  value={settings.site.favicon}
                  onChange={(e) => updateSetting('site', 'favicon', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <Button onClick={() => handleSave('site')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Site Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Header Settings */}
      <TabsContent value="header">
        <Card>
          <CardHeader>
            <CardTitle>Header Settings</CardTitle>
            <CardDescription>Customize the header appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-logo"
                  checked={settings.header.showLogo}
                  onCheckedChange={(checked) => updateSetting('header', 'showLogo', checked)}
                />
                <Label htmlFor="show-logo">Show Logo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-tagline"
                  checked={settings.header.showTagline}
                  onCheckedChange={(checked) => updateSetting('header', 'showTagline', checked)}
                />
                <Label htmlFor="show-tagline">Show Tagline</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="header-bg">Background Color (HSL)</Label>
                <Input
                  id="header-bg"
                  value={settings.header.backgroundColor}
                  onChange={(e) => updateSetting('header', 'backgroundColor', e.target.value)}
                  placeholder="e.g., 220 14% 10%"
                />
              </div>
              <div>
                <Label htmlFor="header-text">Text Color (HSL)</Label>
                <Input
                  id="header-text"
                  value={settings.header.textColor}
                  onChange={(e) => updateSetting('header', 'textColor', e.target.value)}
                  placeholder="e.g., 0 0% 100%"
                />
              </div>
            </div>
            <Button onClick={() => handleSave('header')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Header Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Hero Settings */}
      <TabsContent value="hero">
        <Card>
          <CardHeader>
            <CardTitle>Hero Section</CardTitle>
            <CardDescription>Customize the main hero section of your landing page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hero-title">Title</Label>
              <Input
                id="hero-title"
                value={settings.hero.title}
                onChange={(e) => updateSetting('hero', 'title', e.target.value)}
                placeholder="Main headline"
              />
            </div>
            <div>
              <Label htmlFor="hero-subtitle">Subtitle</Label>
              <Textarea
                id="hero-subtitle"
                value={settings.hero.subtitle}
                onChange={(e) => updateSetting('hero', 'subtitle', e.target.value)}
                placeholder="Supporting text"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="hero-trusted">Trusted Text (Badge)</Label>
              <Input
                id="hero-trusted"
                value={settings.hero.trustedText || ''}
                onChange={(e) => updateSetting('hero', 'trustedText', e.target.value)}
                placeholder="e.g., Trusted by 10,000+ customers"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hero-btn">Primary Button Text</Label>
                <Input
                  id="hero-btn"
                  value={settings.hero.buttonText}
                  onChange={(e) => updateSetting('hero', 'buttonText', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="hero-btn2">Secondary Button Text</Label>
                <Input
                  id="hero-btn2"
                  value={settings.hero.secondaryButtonText}
                  onChange={(e) => updateSetting('hero', 'secondaryButtonText', e.target.value)}
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Trust Badges (below buttons)</Label>
                <Button variant="outline" size="sm" onClick={addHeroBadge}>
                  <Plus className="h-4 w-4 mr-1" /> Add Badge
                </Button>
              </div>
              {(settings.hero.badges || []).map((badge, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={badge}
                    onChange={(e) => updateHeroBadge(index, e.target.value)}
                    placeholder="e.g., Instant Delivery"
                  />
                  <Button variant="destructive" size="icon" onClick={() => removeHeroBadge(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={() => handleSave('hero')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Hero Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Features Settings */}
      <TabsContent value="features">
        <Card>
          <CardHeader>
            <CardTitle>Features Section</CardTitle>
            <CardDescription>Customize the features displayed on your landing page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="features-title">Section Title</Label>
              <Input
                id="features-title"
                value={settings.features.title}
                onChange={(e) => updateSetting('features', 'title', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="features-subtitle">Section Subtitle</Label>
              <Input
                id="features-subtitle"
                value={settings.features.subtitle}
                onChange={(e) => updateSetting('features', 'subtitle', e.target.value)}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Feature Items</Label>
                <Button variant="outline" size="sm" onClick={addFeatureItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Feature
                </Button>
              </div>
              
              {settings.features.items.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label>Icon</Label>
                      <Input
                        value={item.icon}
                        onChange={(e) => updateFeatureItem(index, 'icon', e.target.value)}
                        placeholder="smartphone, cloud, shield, zap"
                      />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={item.title}
                        onChange={(e) => updateFeatureItem(index, 'title', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateFeatureItem(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => removeFeatureItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button onClick={() => handleSave('features')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Features Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Products Settings */}
      <TabsContent value="products">
        <Card>
          <CardHeader>
            <CardTitle>Products Section</CardTitle>
            <CardDescription>Customize the products section on your landing page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="products-title">Section Title</Label>
              <Input
                id="products-title"
                value={settings.products?.title || ''}
                onChange={(e) => updateSetting('products', 'title', e.target.value)}
                placeholder="Our Plans"
              />
            </div>
            <div>
              <Label htmlFor="products-subtitle">Section Subtitle</Label>
              <Input
                id="products-subtitle"
                value={settings.products?.subtitle || ''}
                onChange={(e) => updateSetting('products', 'subtitle', e.target.value)}
                placeholder="Choose the perfect plan for your needs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-categories"
                checked={settings.products?.showCategories !== false}
                onCheckedChange={(checked) => updateSetting('products', 'showCategories', checked)}
              />
              <Label htmlFor="show-categories">Show products grouped by categories</Label>
            </div>
            <Button onClick={() => handleSave('products')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Products Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Testimonials Settings */}
      <TabsContent value="testimonials">
        <Card>
          <CardHeader>
            <CardTitle>Testimonials Section</CardTitle>
            <CardDescription>Customize the testimonials section on your landing page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="testimonials-title">Section Title</Label>
              <Input
                id="testimonials-title"
                value={settings.testimonials?.title || ''}
                onChange={(e) => updateSetting('testimonials', 'title', e.target.value)}
                placeholder="Customer Testimonials"
              />
            </div>
            <div>
              <Label htmlFor="testimonials-subtitle">Section Subtitle</Label>
              <Input
                id="testimonials-subtitle"
                value={settings.testimonials?.subtitle || ''}
                onChange={(e) => updateSetting('testimonials', 'subtitle', e.target.value)}
                placeholder="See what our customers are saying"
              />
            </div>
            <Button onClick={() => handleSave('testimonials')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Testimonials Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Trust Indicators Settings */}
      <TabsContent value="trust">
        <Card>
          <CardHeader>
            <CardTitle>Trust Indicators</CardTitle>
            <CardDescription>Configure the trust statistics displayed on your landing page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trust-customers">Happy Customers</Label>
                <Input
                  id="trust-customers"
                  value={settings.trustIndicators?.happyCustomers || ''}
                  onChange={(e) => updateSetting('trustIndicators', 'happyCustomers', e.target.value)}
                  placeholder="10,000+"
                />
              </div>
              <div>
                <Label htmlFor="trust-orders">Orders Completed</Label>
                <Input
                  id="trust-orders"
                  value={settings.trustIndicators?.ordersCompleted || ''}
                  onChange={(e) => updateSetting('trustIndicators', 'ordersCompleted', e.target.value)}
                  placeholder="50,000+"
                />
              </div>
              <div>
                <Label htmlFor="trust-success">Success Rate</Label>
                <Input
                  id="trust-success"
                  value={settings.trustIndicators?.successRate || ''}
                  onChange={(e) => updateSetting('trustIndicators', 'successRate', e.target.value)}
                  placeholder="99.9%"
                />
              </div>
              <div>
                <Label htmlFor="trust-support">Support Availability</Label>
                <Input
                  id="trust-support"
                  value={settings.trustIndicators?.supportAvailability || ''}
                  onChange={(e) => updateSetting('trustIndicators', 'supportAvailability', e.target.value)}
                  placeholder="24/7"
                />
              </div>
            </div>
            <Button onClick={() => handleSave('trustIndicators')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Trust Indicators
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* FAQ Settings */}
      <TabsContent value="faq">
        <Card>
          <CardHeader>
            <CardTitle>FAQ Section</CardTitle>
            <CardDescription>Manage frequently asked questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="faq-title">Section Title</Label>
              <Input
                id="faq-title"
                value={settings.faq?.title || ''}
                onChange={(e) => updateSetting('faq', 'title', e.target.value)}
                placeholder="Frequently Asked Questions"
              />
            </div>
            <div>
              <Label htmlFor="faq-subtitle">Section Subtitle</Label>
              <Input
                id="faq-subtitle"
                value={settings.faq?.subtitle || ''}
                onChange={(e) => updateSetting('faq', 'subtitle', e.target.value)}
                placeholder="Find answers to common questions"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>FAQ Items</Label>
                <Button variant="outline" size="sm" onClick={() => {
                  setSettings(prev => ({
                    ...prev,
                    faq: {
                      ...prev.faq,
                      items: [...(prev.faq?.items || []), { question: "", answer: "" }]
                    }
                  }));
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Add FAQ
                </Button>
              </div>
              
              {(settings.faq?.items || []).map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div>
                      <Label>Question</Label>
                      <Input
                        value={item.question}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            faq: {
                              ...prev.faq,
                              items: prev.faq.items.map((faq, i) => 
                                i === index ? { ...faq, question: e.target.value } : faq
                              )
                            }
                          }));
                        }}
                        placeholder="What is your question?"
                      />
                    </div>
                    <div>
                      <Label>Answer</Label>
                      <Textarea
                        value={item.answer}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            faq: {
                              ...prev.faq,
                              items: prev.faq.items.map((faq, i) => 
                                i === index ? { ...faq, answer: e.target.value } : faq
                              )
                            }
                          }));
                        }}
                        placeholder="Your answer here..."
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            faq: {
                              ...prev.faq,
                              items: prev.faq.items.filter((_, i) => i !== index)
                            }
                          }));
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button onClick={() => handleSave('faq')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save FAQ Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* CTA Settings */}
      <TabsContent value="cta">
        <Card>
          <CardHeader>
            <CardTitle>Call-to-Action Section</CardTitle>
            <CardDescription>Customize the CTA section</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cta-title">Title</Label>
              <Input
                id="cta-title"
                value={settings.cta.title}
                onChange={(e) => updateSetting('cta', 'title', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cta-subtitle">Subtitle</Label>
              <Textarea
                id="cta-subtitle"
                value={settings.cta.subtitle}
                onChange={(e) => updateSetting('cta', 'subtitle', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="cta-btn">Button Text</Label>
              <Input
                id="cta-btn"
                value={settings.cta.buttonText}
                onChange={(e) => updateSetting('cta', 'buttonText', e.target.value)}
              />
            </div>
            <Button onClick={() => handleSave('cta')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save CTA Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Contact Settings */}
      <TabsContent value="contact">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Set your contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={settings.contact.email}
                onChange={(e) => updateSetting('contact', 'email', e.target.value)}
                placeholder="support@example.com"
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                value={settings.contact.phone}
                onChange={(e) => updateSetting('contact', 'phone', e.target.value)}
                placeholder="+62..."
              />
            </div>
            <div>
              <Label htmlFor="contact-whatsapp">WhatsApp</Label>
              <Input
                id="contact-whatsapp"
                value={settings.contact.whatsapp}
                onChange={(e) => updateSetting('contact', 'whatsapp', e.target.value)}
                placeholder="+62..."
              />
            </div>
            <Button onClick={() => handleSave('contact')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Contact Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Social Settings */}
      <TabsContent value="social">
        <Card>
          <CardHeader>
            <CardTitle>Social Media Links</CardTitle>
            <CardDescription>Add your social media profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="social-facebook">Facebook</Label>
              <Input
                id="social-facebook"
                value={settings.social.facebook}
                onChange={(e) => updateSetting('social', 'facebook', e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <Label htmlFor="social-instagram">Instagram</Label>
              <Input
                id="social-instagram"
                value={settings.social.instagram}
                onChange={(e) => updateSetting('social', 'instagram', e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <Label htmlFor="social-twitter">Twitter</Label>
              <Input
                id="social-twitter"
                value={settings.social.twitter}
                onChange={(e) => updateSetting('social', 'twitter', e.target.value)}
                placeholder="https://twitter.com/..."
              />
            </div>
            <div>
              <Label htmlFor="social-youtube">YouTube</Label>
              <Input
                id="social-youtube"
                value={settings.social.youtube}
                onChange={(e) => updateSetting('social', 'youtube', e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </div>
            <Button onClick={() => handleSave('social')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Social Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Footer Settings */}
      <TabsContent value="footer">
        <Card>
          <CardHeader>
            <CardTitle>Footer Settings</CardTitle>
            <CardDescription>Customize your website footer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="footer-copyright">Copyright Text</Label>
              <Input
                id="footer-copyright"
                value={settings.footer.copyrightText}
                onChange={(e) => updateSetting('footer', 'copyrightText', e.target.value)}
                placeholder="© 2024 Your Company. All rights reserved."
              />
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Footer Links</Label>
                <Button variant="outline" size="sm" onClick={addFooterLink}>
                  <Plus className="h-4 w-4 mr-1" /> Add Link
                </Button>
              </div>
              
              {settings.footer.links.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={link.label}
                    onChange={(e) => updateFooterLink(index, 'label', e.target.value)}
                    placeholder="Link Label"
                    className="flex-1"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateFooterLink(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => removeFooterLink(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={() => handleSave('footer')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Footer Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
