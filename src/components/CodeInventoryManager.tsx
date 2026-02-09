import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Upload, Trash2, Loader2, Package, Key, CheckCircle, XCircle } from "lucide-react";
import { t } from "@/lib/translations";

interface Product {
  id: string;
  name: string;
  auto_delivery: boolean;
}

interface CodeInventoryItem {
  id: string;
  product_id: string;
  code: string;
  is_used: boolean;
  used_at: string | null;
  order_id: string | null;
  created_at: string;
}

interface CodeStats {
  productId: string;
  productName: string;
  total: number;
  available: number;
  used: number;
  autoDelivery: boolean;
}

export const CodeInventoryManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [codeStats, setCodeStats] = useState<CodeStats[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [newCodes, setNewCodes] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch products with auto_delivery flag
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, auto_delivery")
        .order("name");

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Fetch code stats
      const { data: codesData, error: codesError } = await supabase
        .from("redeem_code_inventory")
        .select("product_id, is_used");

      if (codesError) throw codesError;

      // Calculate stats per product
      const statsMap = new Map<string, { total: number; used: number }>();
      (codesData || []).forEach((code) => {
        const current = statsMap.get(code.product_id) || { total: 0, used: 0 };
        current.total += 1;
        if (code.is_used) current.used += 1;
        statsMap.set(code.product_id, current);
      });

      const stats: CodeStats[] = (productsData || []).map((product) => {
        const productStats = statsMap.get(product.id) || { total: 0, used: 0 };
        return {
          productId: product.id,
          productName: product.name,
          total: productStats.total,
          available: productStats.total - productStats.used,
          used: productStats.used,
          autoDelivery: product.auto_delivery,
        };
      });

      setCodeStats(stats);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: t.toasts.error, description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCodes = async () => {
    if (!selectedProduct || !newCodes.trim()) {
      toast({ title: t.codeInventory.enterCodesAndProduct, variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Parse codes (one per line, trim whitespace)
      const codes = newCodes
        .split("\n")
        .map((code) => code.trim())
        .filter((code) => code.length > 0);

      if (codes.length === 0) {
        toast({ title: t.codeInventory.noValidCodes, variant: "destructive" });
        return;
      }

      // Check for duplicates
      const { data: existingCodes } = await supabase
        .from("redeem_code_inventory")
        .select("code")
        .eq("product_id", selectedProduct)
        .in("code", codes);

      const existingSet = new Set((existingCodes || []).map((c) => c.code));
      const uniqueCodes = codes.filter((code) => !existingSet.has(code));

      if (uniqueCodes.length === 0) {
        toast({
          title: t.codeInventory.allCodesDuplicate,
          description: `${codes.length} ${t.codeInventory.codesExist}`,
          variant: "destructive",
        });
        return;
      }

      // Insert new codes
      const { error } = await supabase.from("redeem_code_inventory").insert(
        uniqueCodes.map((code) => ({
          product_id: selectedProduct,
          code,
          created_by: user?.id,
        }))
      );

      if (error) throw error;

      const duplicateCount = codes.length - uniqueCodes.length;
      toast({
        title: t.codeInventory.codesUploaded,
        description: `${uniqueCodes.length} kode ditambahkan${duplicateCount > 0 ? `, ${duplicateCount} ${t.codeInventory.duplicatesSkipped}` : ""}`,
      });

      setNewCodes("");
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: t.toasts.error,
        description: error instanceof Error ? error.message : "Gagal mengunggah kode",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleToggleAutoDelivery = async (productId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ auto_delivery: enabled })
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: enabled ? t.codeInventory.autoDeliveryEnabled : t.codeInventory.autoDeliveryDisabled,
      });
      fetchData();
    } catch (error) {
      toast({ title: t.toasts.error, description: "Gagal memperbarui produk", variant: "destructive" });
    }
  };

  const handleDeleteUnusedCodes = async (productId: string) => {
    if (!confirm(t.codeInventory.confirmDeleteUnused)) return;

    try {
      const { error } = await supabase
        .from("redeem_code_inventory")
        .delete()
        .eq("product_id", productId)
        .eq("is_used", false);

      if (error) throw error;

      toast({ title: t.codeInventory.unusedCodesDeleted });
      fetchData();
    } catch (error) {
      toast({ title: t.toasts.error, description: "Gagal menghapus kode", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">{t.codeInventory.title}</h3>
          <p className="text-sm text-muted-foreground">
            {t.codeInventory.manageDescription}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t.codeInventory.addCodes}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t.codeInventory.uploadDialogTitle}</DialogTitle>
              <DialogDescription>
                {t.codeInventory.uploadDialogDesc}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>{t.products.category}</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.codeInventory.selectProduct} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.codeInventory.codesPlaceholder}</Label>
                <Textarea
                  value={newCodes}
                  onChange={(e) => setNewCodes(e.target.value)}
                  placeholder="CODE-XXXX-YYYY&#10;CODE-AAAA-BBBB&#10;CODE-1111-2222"
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {newCodes.split("\n").filter((c) => c.trim()).length} {t.codeInventory.codesEntered}
                </p>
              </div>
              <Button onClick={handleUploadCodes} disabled={uploading} className="w-full">
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {t.codeInventory.uploadCodes}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 border-2 border-border flex items-center justify-center">
                <Key className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {codeStats.reduce((sum, s) => sum + s.total, 0)}
                </p>
                <p className="text-sm text-muted-foreground">{t.codeInventory.totalCodes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/30 border-2 border-border flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {codeStats.reduce((sum, s) => sum + s.available, 0)}
                </p>
                <p className="text-sm text-muted-foreground">{t.codeInventory.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted border-2 border-border flex items-center justify-center">
                <XCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {codeStats.reduce((sum, s) => sum + s.used, 0)}
                </p>
                <p className="text-sm text-muted-foreground">{t.codeInventory.used}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t.codeInventory.productsInventory}</CardTitle>
          <CardDescription>
            {t.codeInventory.productsInventoryDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.codeInventory.product}</TableHead>
                  <TableHead className="text-center">{t.codeInventory.totalCodes}</TableHead>
                  <TableHead className="text-center">{t.codeInventory.available}</TableHead>
                  <TableHead className="text-center">{t.codeInventory.used}</TableHead>
                  <TableHead className="text-center">{t.codeInventory.autoDelivery}</TableHead>
                  <TableHead className="text-right">{t.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codeStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t.codeInventory.noProductsFound}
                    </TableCell>
                  </TableRow>
                ) : (
                  codeStats.map((stat) => (
                    <TableRow key={stat.productId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{stat.productName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{stat.total}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={stat.available > 0 ? "default" : "secondary"}>
                          {stat.available}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{stat.used}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={stat.autoDelivery}
                          onCheckedChange={(checked) =>
                            handleToggleAutoDelivery(stat.productId, checked)
                          }
                          disabled={stat.available === 0}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.available > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUnusedCodes(stat.productId)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeInventoryManager;
