 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Switch } from "@/components/ui/switch";
 import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Separator } from "@/components/ui/separator";
 import { Loader2, Percent, DollarSign } from "lucide-react";
 import { format } from "date-fns";
 
 export interface VoucherFormData {
   code: string;
   name: string;
   description?: string;
   discount_type: "percentage" | "fixed";
   discount_value: number;
   min_order_amount?: number;
   max_discount_amount?: number;
   usage_limit?: number;
   per_user_limit?: number;
   valid_from: string;
   valid_until: string;
   is_active: boolean;
   applies_to: "all" | "products" | "categories";
   product_ids?: string[];
   category_ids?: string[];
   stackable: boolean;
   first_order_only: boolean;
 }
 
 interface VoucherFormDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   voucher?: {
     id: string;
     code: string;
     name: string;
     description: string | null;
     discount_type: "percentage" | "fixed";
     discount_value: number;
     min_order_amount: number;
     max_discount_amount: number | null;
     usage_limit: number | null;
     per_user_limit: number;
     valid_from: string;
     valid_until: string;
     is_active: boolean;
     applies_to: "all" | "products" | "categories";
     product_ids: string[] | null;
     category_ids: string[] | null;
     stackable: boolean;
     first_order_only: boolean;
   } | null;
   onSave: (data: VoucherFormData) => Promise<void>;
 }
 
 export const VoucherFormDialog = ({ open, onOpenChange, voucher, onSave }: VoucherFormDialogProps) => {
   const [saving, setSaving] = useState(false);
   const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
   const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
   
   const [formData, setFormData] = useState<VoucherFormData>({
     code: "",
     name: "",
     description: "",
     discount_type: "percentage",
     discount_value: 10,
     min_order_amount: 0,
     max_discount_amount: undefined,
     usage_limit: undefined,
     per_user_limit: 1,
     valid_from: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
     valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
     is_active: true,
     applies_to: "all",
     product_ids: [],
     category_ids: [],
     stackable: false,
     first_order_only: false,
   });
 
   useEffect(() => {
     if (voucher) {
       setFormData({
         code: voucher.code,
         name: voucher.name,
         description: voucher.description || "",
         discount_type: voucher.discount_type,
         discount_value: voucher.discount_value,
         min_order_amount: voucher.min_order_amount,
         max_discount_amount: voucher.max_discount_amount || undefined,
         usage_limit: voucher.usage_limit || undefined,
         per_user_limit: voucher.per_user_limit,
         valid_from: format(new Date(voucher.valid_from), "yyyy-MM-dd'T'HH:mm"),
         valid_until: format(new Date(voucher.valid_until), "yyyy-MM-dd'T'HH:mm"),
         is_active: voucher.is_active,
         applies_to: voucher.applies_to,
         product_ids: voucher.product_ids || [],
         category_ids: voucher.category_ids || [],
         stackable: voucher.stackable,
         first_order_only: voucher.first_order_only,
       });
     } else {
       setFormData({
         code: "",
         name: "",
         description: "",
         discount_type: "percentage",
         discount_value: 10,
         min_order_amount: 0,
         max_discount_amount: undefined,
         usage_limit: undefined,
         per_user_limit: 1,
         valid_from: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
         valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
         is_active: true,
         applies_to: "all",
         product_ids: [],
         category_ids: [],
         stackable: false,
         first_order_only: false,
       });
     }
   }, [voucher, open]);
 
   useEffect(() => {
     if (open) {
       fetchProductsAndCategories();
     }
   }, [open]);
 
   const fetchProductsAndCategories = async () => {
     const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
       supabase.from("products").select("id, name").eq("is_active", true),
       supabase.from("product_categories").select("id, name").eq("is_active", true),
     ]);
     setProducts(productsData || []);
     setCategories(categoriesData || []);
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setSaving(true);
     try {
       await onSave(formData);
     } finally {
       setSaving(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>{voucher ? "Edit Voucher" : "Create New Voucher"}</DialogTitle>
           <DialogDescription>
             {voucher ? "Update voucher settings" : "Create a new discount voucher for your customers"}
           </DialogDescription>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-6">
           {/* Basic Info */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="code">Voucher Code *</Label>
               <Input
                 id="code"
                 placeholder="SAVE20"
                 value={formData.code}
                 onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                 className="font-mono uppercase"
                 required
                 disabled={!!voucher}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="name">Display Name *</Label>
               <Input
                 id="name"
                 placeholder="Save 20% on orders"
                 value={formData.name}
                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                 required
               />
             </div>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="description">Description (Admin Notes)</Label>
             <Textarea
               id="description"
               placeholder="Internal notes about this voucher..."
               value={formData.description}
               onChange={(e) => setFormData({ ...formData, description: e.target.value })}
               rows={2}
             />
           </div>
 
           <Separator />
 
           {/* Discount Settings */}
           <div className="space-y-4">
             <Label className="text-base font-semibold">Discount Settings</Label>
             
             <RadioGroup
               value={formData.discount_type}
               onValueChange={(value: "percentage" | "fixed") => setFormData({ ...formData, discount_type: value })}
               className="grid grid-cols-2 gap-4"
             >
               <div className="flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                 <RadioGroupItem value="percentage" id="percentage" />
                 <Label htmlFor="percentage" className="flex items-center gap-2 cursor-pointer">
                   <Percent className="h-4 w-4" />
                   Percentage
                 </Label>
               </div>
               <div className="flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                 <RadioGroupItem value="fixed" id="fixed" />
                 <Label htmlFor="fixed" className="flex items-center gap-2 cursor-pointer">
                   <DollarSign className="h-4 w-4" />
                   Fixed Amount
                 </Label>
               </div>
             </RadioGroup>
 
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="discount_value">
                   Discount Value {formData.discount_type === "percentage" ? "(%)" : "(Rp)"} *
                 </Label>
                 <Input
                   id="discount_value"
                   type="number"
                   min={1}
                   max={formData.discount_type === "percentage" ? 100 : undefined}
                   value={formData.discount_value}
                   onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                   required
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="min_order">Min. Order (Rp)</Label>
                 <Input
                   id="min_order"
                   type="number"
                   min={0}
                   value={formData.min_order_amount || ""}
                   onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) || undefined })}
                 />
               </div>
               {formData.discount_type === "percentage" && (
                 <div className="space-y-2">
                   <Label htmlFor="max_discount">Max Discount (Rp)</Label>
                   <Input
                     id="max_discount"
                     type="number"
                     min={0}
                     value={formData.max_discount_amount || ""}
                     onChange={(e) => setFormData({ ...formData, max_discount_amount: Number(e.target.value) || undefined })}
                   />
                 </div>
               )}
             </div>
           </div>
 
           <Separator />
 
           {/* Usage Limits */}
           <div className="space-y-4">
             <Label className="text-base font-semibold">Usage Limits</Label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="usage_limit">Total Usage Limit (leave empty for unlimited)</Label>
                 <Input
                   id="usage_limit"
                   type="number"
                   min={1}
                   value={formData.usage_limit || ""}
                   onChange={(e) => setFormData({ ...formData, usage_limit: Number(e.target.value) || undefined })}
                   placeholder="∞"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="per_user_limit">Per User Limit</Label>
                 <Input
                   id="per_user_limit"
                   type="number"
                   min={1}
                   value={formData.per_user_limit}
                   onChange={(e) => setFormData({ ...formData, per_user_limit: Number(e.target.value) || 1 })}
                 />
               </div>
             </div>
           </div>
 
           <Separator />
 
           {/* Validity Period */}
           <div className="space-y-4">
             <Label className="text-base font-semibold">Validity Period</Label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="valid_from">Valid From *</Label>
                 <Input
                   id="valid_from"
                   type="datetime-local"
                   value={formData.valid_from}
                   onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                   required
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="valid_until">Valid Until *</Label>
                 <Input
                   id="valid_until"
                   type="datetime-local"
                   value={formData.valid_until}
                   onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                   required
                 />
               </div>
             </div>
           </div>
 
           <Separator />
 
           {/* Targeting */}
           <div className="space-y-4">
             <Label className="text-base font-semibold">Product Targeting</Label>
             <Select
               value={formData.applies_to}
               onValueChange={(value: "all" | "products" | "categories") => setFormData({ ...formData, applies_to: value })}
             >
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Products</SelectItem>
                 <SelectItem value="products">Specific Products</SelectItem>
                 <SelectItem value="categories">Specific Categories</SelectItem>
               </SelectContent>
             </Select>
 
             {formData.applies_to === "products" && products.length > 0 && (
               <div className="space-y-2">
                 <Label>Select Products</Label>
                 <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                   {products.map((product) => (
                     <label key={product.id} className="flex items-center gap-2 cursor-pointer">
                       <input
                         type="checkbox"
                         checked={formData.product_ids?.includes(product.id)}
                         onChange={(e) => {
                           const newIds = e.target.checked
                             ? [...(formData.product_ids || []), product.id]
                             : (formData.product_ids || []).filter((id) => id !== product.id);
                           setFormData({ ...formData, product_ids: newIds });
                         }}
                         className="rounded"
                       />
                       <span className="text-sm">{product.name}</span>
                     </label>
                   ))}
                 </div>
               </div>
             )}
 
             {formData.applies_to === "categories" && categories.length > 0 && (
               <div className="space-y-2">
                 <Label>Select Categories</Label>
                 <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                   {categories.map((category) => (
                     <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                       <input
                         type="checkbox"
                         checked={formData.category_ids?.includes(category.id)}
                         onChange={(e) => {
                           const newIds = e.target.checked
                             ? [...(formData.category_ids || []), category.id]
                             : (formData.category_ids || []).filter((id) => id !== category.id);
                           setFormData({ ...formData, category_ids: newIds });
                         }}
                         className="rounded"
                       />
                       <span className="text-sm">{category.name}</span>
                     </label>
                   ))}
                 </div>
               </div>
             )}
           </div>
 
           <Separator />
 
           {/* Options */}
           <div className="space-y-4">
             <Label className="text-base font-semibold">Options</Label>
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <div>
                   <Label htmlFor="is_active">Active</Label>
                   <p className="text-sm text-muted-foreground">Voucher can be used by customers</p>
                 </div>
                 <Switch
                   id="is_active"
                   checked={formData.is_active}
                   onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                 />
               </div>
               <div className="flex items-center justify-between">
                 <div>
                   <Label htmlFor="first_order_only">First Order Only</Label>
                   <p className="text-sm text-muted-foreground">Only new customers can use this voucher</p>
                 </div>
                 <Switch
                   id="first_order_only"
                   checked={formData.first_order_only}
                   onCheckedChange={(checked) => setFormData({ ...formData, first_order_only: checked })}
                 />
               </div>
               <div className="flex items-center justify-between">
                 <div>
                   <Label htmlFor="stackable">Stackable</Label>
                   <p className="text-sm text-muted-foreground">Can be combined with other vouchers</p>
                 </div>
                 <Switch
                   id="stackable"
                   checked={formData.stackable}
                   onCheckedChange={(checked) => setFormData({ ...formData, stackable: checked })}
                 />
               </div>
             </div>
           </div>
 
           <DialogFooter>
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
               Cancel
             </Button>
             <Button type="submit" disabled={saving}>
               {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
               {voucher ? "Update Voucher" : "Create Voucher"}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 };