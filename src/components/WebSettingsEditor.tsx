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
import { Save, Plus, Trash2, Loader2 } from "lucide-react";

interface WebSettings {
  hero: {
    title: string;
    subtitle: string;
    buttonText: string;
    secondaryButtonText: string;
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
}

const defaultSettings: WebSettings = {
  hero: {
    title: "Premium Redfinger Cloud Phone Services",
    subtitle: "Experience seamless cloud gaming and app automation",
    buttonText: "Browse Store",
    secondaryButtonText: "Sign In"
  },
  features: {
    title: "Why Choose Us?",
    subtitle: "Premium features for the best experience",
    items: []
  },
  cta: {
    title: "Ready to Get Started?",
    subtitle: "Join thousands of satisfied customers",
    buttonText: "View Plans & Pricing"
  },
  contact: { email: "", phone: "", whatsapp: "" },
  social: { facebook: "", instagram: "", twitter: "", youtube: "" },
  footer: { copyrightText: "", links: [] }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="hero" className="w-full">
      <div className="overflow-x-auto pb-2">
        <TabsList className="inline-flex w-auto">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="cta">CTA</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>
      </div>

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

      {/* CTA Settings */}
      <TabsContent value="cta">
        <Card>
          <CardHeader>
            <CardTitle>Call to Action Section</CardTitle>
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
            <CardDescription>Set your business contact details</CardDescription>
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
                placeholder="+62 xxx-xxxx-xxxx"
              />
            </div>
            <div>
              <Label htmlFor="contact-wa">WhatsApp</Label>
              <Input
                id="contact-wa"
                value={settings.contact.whatsapp}
                onChange={(e) => updateSetting('contact', 'whatsapp', e.target.value)}
                placeholder="+62 xxx-xxxx-xxxx"
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
            <CardDescription>Add your social media profile URLs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="social-fb">Facebook</Label>
              <Input
                id="social-fb"
                value={settings.social.facebook}
                onChange={(e) => updateSetting('social', 'facebook', e.target.value)}
                placeholder="https://facebook.com/yourpage"
              />
            </div>
            <div>
              <Label htmlFor="social-ig">Instagram</Label>
              <Input
                id="social-ig"
                value={settings.social.instagram}
                onChange={(e) => updateSetting('social', 'instagram', e.target.value)}
                placeholder="https://instagram.com/yourhandle"
              />
            </div>
            <div>
              <Label htmlFor="social-tw">Twitter / X</Label>
              <Input
                id="social-tw"
                value={settings.social.twitter}
                onChange={(e) => updateSetting('social', 'twitter', e.target.value)}
                placeholder="https://twitter.com/yourhandle"
              />
            </div>
            <div>
              <Label htmlFor="social-yt">YouTube</Label>
              <Input
                id="social-yt"
                value={settings.social.youtube}
                onChange={(e) => updateSetting('social', 'youtube', e.target.value)}
                placeholder="https://youtube.com/yourchannel"
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
            <CardDescription>Customize footer content and links</CardDescription>
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
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label>Label</Label>
                    <Input
                      value={link.label}
                      onChange={(e) => updateFooterLink(index, 'label', e.target.value)}
                      placeholder="Privacy Policy"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>URL</Label>
                    <Input
                      value={link.url}
                      onChange={(e) => updateFooterLink(index, 'url', e.target.value)}
                      placeholder="/privacy"
                    />
                  </div>
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