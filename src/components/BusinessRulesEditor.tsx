import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Loader2, ShoppingCart, Package, Ticket as TicketIcon, Layout, Wallet, Info, ExternalLink, Copy, Check } from "lucide-react";
import { usePaymentGateway, PaymentGatewayConfig } from "@/hooks/usePaymentGateway";

interface BusinessRulesState {
  order: {
    payment_proof_max_size_mb: number;
    allowed_file_types: string[];
    auto_cancel_hours: number;
  };
  stock: {
    low_threshold: number;
    out_of_stock_alert: boolean;
  };
  support: {
    attachment_max_size_mb: number;
    auto_close_resolved_days: number;
    max_tickets_per_hour: number;
  };
  display: {
    products_per_page: number;
    testimonials_count: number;
    best_seller_period: string;
  };
}

const defaultRules: BusinessRulesState = {
  order: {
    payment_proof_max_size_mb: 5,
    allowed_file_types: ["image/jpeg", "image/png"],
    auto_cancel_hours: 24,
  },
  stock: {
    low_threshold: 10,
    out_of_stock_alert: true,
  },
  support: {
    attachment_max_size_mb: 10,
    auto_close_resolved_days: 7,
    max_tickets_per_hour: 5,
  },
  display: {
    products_per_page: 12,
    testimonials_count: 6,
    best_seller_period: "month",
  },
};

export const BusinessRulesEditor = () => {
  const [rules, setRules] = useState<BusinessRulesState>(defaultRules);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  // Payment gateway state
  const { 
    config: gatewayConfig, 
    isLoadingConfig: isLoadingGateway, 
    saveConfig: saveGatewayConfig 
  } = usePaymentGateway();
  
  const [gatewaySettings, setGatewaySettings] = useState<PaymentGatewayConfig>({
    enabled: false,
    provider: "tokopay",
    merchant_id: "",
    qris_enabled: true,
    auto_delivery: true,
  });
  const [savingGateway, setSavingGateway] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  // Sync gateway settings when loaded
  useEffect(() => {
    if (!isLoadingGateway && gatewayConfig) {
      setGatewaySettings(gatewayConfig);
    }
  }, [gatewayConfig, isLoadingGateway]);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from("business_rules")
        .select("key, value");

      if (error) throw error;

      const rulesMap: BusinessRulesState = JSON.parse(JSON.stringify(defaultRules));
      data?.forEach((item) => {
        const key = item.key as keyof BusinessRulesState;
        if (key in rulesMap && typeof item.value === 'object' && item.value !== null) {
          Object.assign(rulesMap[key], item.value);
        }
      });

      setRules(rulesMap);
    } catch (error) {
      console.error("Error fetching rules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: keyof BusinessRulesState) => {
    setSaving(key);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("business_rules")
        .upsert(
          {
            key,
            value: rules[key],
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          },
          { onConflict: "key" }
        );

      if (error) throw error;

      toast({ title: "Rules saved successfully" });
    } catch (error) {
      toast({
        title: "Error saving rules",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const updateRule = <K extends keyof BusinessRulesState>(
    section: K,
    field: keyof BusinessRulesState[K],
    value: any
  ) => {
    setRules((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSaveGateway = async () => {
    setSavingGateway(true);
    await saveGatewayConfig(gatewaySettings);
    setSavingGateway(false);
  };

  const webhookUrl = "https://jstzgqmqwcjtffefwcxj.supabase.co/functions/v1/tokopay-callback";

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Webhook URL copied!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="order" className="w-full">
      <div className="overflow-x-auto pb-2">
        <TabsList className="inline-flex w-auto">
          <TabsTrigger value="order" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Order
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2">
            <Package className="h-4 w-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <TicketIcon className="h-4 w-4" />
            Support
          </TabsTrigger>
          <TabsTrigger value="display" className="gap-2">
            <Layout className="h-4 w-4" />
            Display
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <Wallet className="h-4 w-4" />
            Payment
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Order Rules */}
      <TabsContent value="order">
        <Card>
          <CardHeader>
            <CardTitle>Order Rules</CardTitle>
            <CardDescription>Configure order processing and payment settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment-max-size">Max Payment Proof Size (MB)</Label>
                <Input
                  id="payment-max-size"
                  type="number"
                  min={1}
                  max={50}
                  value={rules.order.payment_proof_max_size_mb}
                  onChange={(e) =>
                    updateRule("order", "payment_proof_max_size_mb", parseInt(e.target.value) || 5)
                  }
                />
              </div>
              <div>
                <Label htmlFor="auto-cancel">Auto-Cancel After (Hours)</Label>
                <Input
                  id="auto-cancel"
                  type="number"
                  min={1}
                  max={168}
                  value={rules.order.auto_cancel_hours}
                  onChange={(e) =>
                    updateRule("order", "auto_cancel_hours", parseInt(e.target.value) || 24)
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Orders without payment proof will be auto-cancelled
                </p>
              </div>
            </div>
            <Button onClick={() => handleSave("order")} disabled={saving === "order"}>
              {saving === "order" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Order Rules
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Stock Rules */}
      <TabsContent value="stock">
        <Card>
          <CardHeader>
            <CardTitle>Stock Rules</CardTitle>
            <CardDescription>Configure inventory management settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="low-threshold">Low Stock Threshold</Label>
                <Input
                  id="low-threshold"
                  type="number"
                  min={1}
                  max={100}
                  value={rules.stock.low_threshold}
                  onChange={(e) =>
                    updateRule("stock", "low_threshold", parseInt(e.target.value) || 10)
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Show warning when stock falls below this number
                </p>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="stock-alert"
                  checked={rules.stock.out_of_stock_alert}
                  onCheckedChange={(checked) => updateRule("stock", "out_of_stock_alert", checked)}
                />
                <Label htmlFor="stock-alert">Enable Out of Stock Alerts</Label>
              </div>
            </div>
            <Button onClick={() => handleSave("stock")} disabled={saving === "stock"}>
              {saving === "stock" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Stock Rules
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Support Rules */}
      <TabsContent value="support">
        <Card>
          <CardHeader>
            <CardTitle>Support Rules</CardTitle>
            <CardDescription>Configure support ticket settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="attachment-max-size">Max Attachment Size (MB)</Label>
                <Input
                  id="attachment-max-size"
                  type="number"
                  min={1}
                  max={50}
                  value={rules.support.attachment_max_size_mb}
                  onChange={(e) =>
                    updateRule("support", "attachment_max_size_mb", parseInt(e.target.value) || 10)
                  }
                />
              </div>
              <div>
                <Label htmlFor="auto-close">Auto-Close Resolved (Days)</Label>
                <Input
                  id="auto-close"
                  type="number"
                  min={1}
                  max={30}
                  value={rules.support.auto_close_resolved_days}
                  onChange={(e) =>
                    updateRule("support", "auto_close_resolved_days", parseInt(e.target.value) || 7)
                  }
                />
              </div>
              <div>
                <Label htmlFor="max-tickets">Max Tickets Per Hour</Label>
                <Input
                  id="max-tickets"
                  type="number"
                  min={1}
                  max={20}
                  value={rules.support.max_tickets_per_hour}
                  onChange={(e) =>
                    updateRule("support", "max_tickets_per_hour", parseInt(e.target.value) || 5)
                  }
                />
              </div>
            </div>
            <Button onClick={() => handleSave("support")} disabled={saving === "support"}>
              {saving === "support" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Support Rules
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Display Rules */}
      <TabsContent value="display">
        <Card>
          <CardHeader>
            <CardTitle>Display Rules</CardTitle>
            <CardDescription>Configure frontend display settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="products-per-page">Products Per Page</Label>
                <Select
                  value={rules.display.products_per_page.toString()}
                  onValueChange={(val) =>
                    updateRule("display", "products_per_page", parseInt(val))
                  }
                >
                  <SelectTrigger id="products-per-page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="testimonials-count">Testimonials to Show</Label>
                <Input
                  id="testimonials-count"
                  type="number"
                  min={1}
                  max={20}
                  value={rules.display.testimonials_count}
                  onChange={(e) =>
                    updateRule("display", "testimonials_count", parseInt(e.target.value) || 6)
                  }
                />
              </div>
              <div>
                <Label htmlFor="best-seller-period">Best Seller Period</Label>
                <Select
                  value={rules.display.best_seller_period}
                  onValueChange={(val) => updateRule("display", "best_seller_period", val)}
                >
                  <SelectTrigger id="best-seller-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => handleSave("display")} disabled={saving === "display"}>
              {saving === "display" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Display Rules
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Payment Gateway Rules */}
      <TabsContent value="payment">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Payment Gateway
                </CardTitle>
                <CardDescription>Configure automatic payment via QRIS</CardDescription>
              </div>
              <Badge variant={gatewaySettings.enabled ? "default" : "secondary"}>
                {gatewaySettings.enabled ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="gateway-enabled" className="text-base font-medium">Enable Payment Gateway</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to pay automatically via QRIS
                </p>
              </div>
              <Switch
                id="gateway-enabled"
                checked={gatewaySettings.enabled}
                onCheckedChange={(checked) => setGatewaySettings(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            {gatewaySettings.enabled && (
              <>
                {/* Provider Selection */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="gateway-provider">Provider</Label>
                    <Select
                      value={gatewaySettings.provider}
                      onValueChange={(val) => setGatewaySettings(prev => ({ ...prev, provider: val }))}
                    >
                      <SelectTrigger id="gateway-provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tokopay">Tokopay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="merchant-id">Merchant ID</Label>
                    <Input
                      id="merchant-id"
                      placeholder="Enter your Merchant ID"
                      value={gatewaySettings.merchant_id}
                      onChange={(e) => setGatewaySettings(prev => ({ ...prev, merchant_id: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label>Webhook URL (Callback)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure this URL in your Tokopay dashboard under Callback Settings
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Make sure you have configured your <code className="bg-muted px-1 rounded">TOKOPAY_MERCHANT_ID</code> and <code className="bg-muted px-1 rounded">TOKOPAY_SECRET_KEY</code> in the secrets settings.
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1"
                      onClick={() => window.open("https://docs.tokopay.id/persiapan-awal/metode-pembayaran", "_blank")}
                    >
                      View Documentation <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </AlertDescription>
                </Alert>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <Label className="text-base">Payment Methods</Label>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">QRIS</p>
                        <p className="text-sm text-muted-foreground">
                          GoPay, OVO, DANA, LinkAja, and all QRIS-enabled e-wallets
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={gatewaySettings.qris_enabled}
                      onCheckedChange={(checked) => setGatewaySettings(prev => ({ ...prev, qris_enabled: checked }))}
                    />
                  </div>
                </div>

                {/* Auto Delivery */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="auto-delivery" className="text-base font-medium">Auto Delivery</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign and send redeem codes after payment is verified
                    </p>
                  </div>
                  <Switch
                    id="auto-delivery"
                    checked={gatewaySettings.auto_delivery}
                    onCheckedChange={(checked) => setGatewaySettings(prev => ({ ...prev, auto_delivery: checked }))}
                  />
                </div>
              </>
            )}

            <Button onClick={handleSaveGateway} disabled={savingGateway}>
              {savingGateway ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Payment Gateway Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default BusinessRulesEditor;
