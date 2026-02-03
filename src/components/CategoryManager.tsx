import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, GripVertical, Loader2, Package, Folder, Tag, Layers } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  parent_id: string | null;
}

const ICONS = [
  { value: "package", icon: Package, label: "Package" },
  { value: "folder", icon: Folder, label: "Folder" },
  { value: "tag", icon: Tag, label: "Tag" },
  { value: "layers", icon: Layers, label: "Layers" },
];

export const CategoryManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "package", parent_id: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Category name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("product_categories")
          .update({
            name: form.name.trim(),
            description: form.description.trim() || null,
            icon: form.icon,
            parent_id: form.parent_id || null,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast({ title: "Category updated successfully" });
      } else {
        const maxOrder = Math.max(...categories.map(c => c.display_order), -1);
        const { error } = await supabase
          .from("product_categories")
          .insert({
            name: form.name.trim(),
            description: form.description.trim() || null,
            icon: form.icon,
            display_order: maxOrder + 1,
            parent_id: form.parent_id || null,
          });

        if (error) throw error;
        toast({ title: "Category created successfully" });
      }

      setDialogOpen(false);
      setEditingCategory(null);
      setForm({ name: "", description: "", icon: "package", parent_id: "" });
      fetchCategories();
    } catch (error) {
      toast({ 
        title: "Error saving category", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description || "",
      icon: category.icon,
      parent_id: category.parent_id || "",
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (category: Category) => {
    try {
      const { error } = await supabase
        .from("product_categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id);

      if (error) throw error;
      toast({ title: `Category ${!category.is_active ? 'activated' : 'deactivated'}` });
      fetchCategories();
    } catch (error) {
      toast({ title: "Error updating category", variant: "destructive" });
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;
      toast({ title: "Category deleted successfully" });
      fetchCategories();
    } catch (error) {
      toast({ 
        title: "Error deleting category", 
        description: "Category may have associated products",
        variant: "destructive" 
      });
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconItem = ICONS.find(i => i.value === iconName);
    if (iconItem) {
      const IconComponent = iconItem.icon;
      return <IconComponent className="h-4 w-4" />;
    }
    return <Package className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Product Categories</CardTitle>
          <CardDescription>Organize your products into categories</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            setForm({ name: "", description: "", icon: "package", parent_id: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Category</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
              <DialogDescription>
                {editingCategory ? "Update category details" : "Create a new product category"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Gaming, Premium, etc."
                />
              </div>
              <div>
                <Label htmlFor="parent">Parent Category (Optional)</Label>
                <select
                  id="parent"
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">None (Top Level)</option>
                  {categories
                    .filter(c => !c.parent_id && c.id !== editingCategory?.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  }
                </select>
                <p className="text-xs text-muted-foreground mt-1">Create sub-categories by selecting a parent</p>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the category"
                  rows={2}
                />
              </div>
              <div>
                <Label>Icon</Label>
                <div className="flex gap-2 mt-2">
                  {ICONS.map((iconItem) => {
                    const IconComponent = iconItem.icon;
                    return (
                      <Button
                        key={iconItem.value}
                        type="button"
                        variant={form.icon === iconItem.value ? "default" : "outline"}
                        size="icon"
                        onClick={() => setForm({ ...form, icon: iconItem.value })}
                      >
                        <IconComponent className="h-4 w-4" />
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingCategory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No categories yet. Create your first category to organize products.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center justify-center text-muted-foreground">
                      {getIconComponent(category.icon)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => handleToggleActive(category)}
                      />
                      <Badge variant={category.is_active ? "default" : "secondary"}>
                        {category.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(category)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
