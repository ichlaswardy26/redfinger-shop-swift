 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Switch } from "@/components/ui/switch";
 import { MotionContainer, MotionStatCard } from "@/components/ui/motion";
 import { 
  Plus, Tag, Percent, Calendar, Users, TrendingUp, BarChart3,
   MoreHorizontal, Pencil, Trash2, Copy, Check, Loader2, Package
 } from "lucide-react";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { VoucherFormDialog, VoucherFormData } from "@/components/VoucherFormDialog";
 import { BulkVoucherGeneratorDialog } from "@/components/BulkVoucherGeneratorDialog";
import { VoucherAnalytics } from "@/components/VoucherAnalytics";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { format } from "date-fns";
 
 interface Voucher {
   id: string;
   code: string;
   name: string;
   description: string | null;
   discount_type: "percentage" | "fixed";
   discount_value: number;
   min_order_amount: number;
   max_discount_amount: number | null;
   usage_limit: number | null;
   usage_count: number;
   per_user_limit: number;
   valid_from: string;
   valid_until: string;
   is_active: boolean;
   applies_to: "all" | "products" | "categories";
   product_ids: string[] | null;
   category_ids: string[] | null;
   stackable: boolean;
   first_order_only: boolean;
   created_at: string;
   campaign_id: string | null;
   batch_id: string | null;
 }
 
 interface VoucherStats {
   totalActive: number;
   totalExpired: number;
   totalUsage: number;
   totalSavings: number;
 }
 
 export const VoucherManager = () => {
   const [vouchers, setVouchers] = useState<Voucher[]>([]);
   const [stats, setStats] = useState<VoucherStats>({ totalActive: 0, totalExpired: 0, totalUsage: 0, totalSavings: 0 });
   const [loading, setLoading] = useState(true);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
   const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
   const [copiedCode, setCopiedCode] = useState<string | null>(null);
   const [campaignFilter, setCampaignFilter] = useState<string>("all");
   const [campaigns, setCampaigns] = useState<string[]>([]);
   const { toast } = useToast();
 
   useEffect(() => {
     fetchVouchers();
     fetchStats();
     fetchCampaigns();
   }, []);
 
   const fetchVouchers = async () => {
     try {
       const { data, error } = await supabase
         .from("vouchers")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setVouchers((data || []) as Voucher[]);
     } catch (error) {
       console.error("Error fetching vouchers:", error);
       toast({ title: "Error", description: "Failed to load vouchers", variant: "destructive" });
     } finally {
       setLoading(false);
     }
   };
 
   const fetchCampaigns = async () => {
     try {
       const { data } = await supabase
         .from("vouchers")
         .select("campaign_id")
         .not("campaign_id", "is", null);
       
       const uniqueCampaigns = [...new Set(data?.map(v => v.campaign_id).filter(Boolean))] as string[];
       setCampaigns(uniqueCampaigns);
     } catch (error) {
       console.error("Error fetching campaigns:", error);
     }
   };
 
   const fetchStats = async () => {
     try {
       const now = new Date().toISOString();
       
       // Get voucher counts
       const { data: allVouchers } = await supabase.from("vouchers").select("is_active, valid_until, usage_count");
       
       // Get total savings from usage
       const { data: usageData } = await supabase.from("voucher_usage").select("discount_applied");
       
       const totalActive = allVouchers?.filter(v => v.is_active && new Date(v.valid_until) >= new Date()).length || 0;
       const totalExpired = allVouchers?.filter(v => new Date(v.valid_until) < new Date()).length || 0;
       const totalUsage = allVouchers?.reduce((sum, v) => sum + (v.usage_count || 0), 0) || 0;
       const totalSavings = usageData?.reduce((sum, u) => sum + (u.discount_applied || 0), 0) || 0;
       
       setStats({ totalActive, totalExpired, totalUsage, totalSavings });
     } catch (error) {
       console.error("Error fetching stats:", error);
     }
   };
 
   const handleSaveVoucher = async (formData: VoucherFormData) => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       
       const voucherData = {
         code: formData.code.toUpperCase().trim(),
         name: formData.name,
         description: formData.description || null,
         discount_type: formData.discount_type,
         discount_value: formData.discount_value,
         min_order_amount: formData.min_order_amount || 0,
         max_discount_amount: formData.max_discount_amount || null,
         usage_limit: formData.usage_limit || null,
         per_user_limit: formData.per_user_limit || 1,
         valid_from: formData.valid_from,
         valid_until: formData.valid_until,
         is_active: formData.is_active,
         applies_to: formData.applies_to,
         product_ids: formData.product_ids?.length ? formData.product_ids : null,
         category_ids: formData.category_ids?.length ? formData.category_ids : null,
         stackable: formData.stackable,
         first_order_only: formData.first_order_only,
         created_by: user?.id,
       };
 
       if (editingVoucher) {
         const { error } = await supabase
           .from("vouchers")
           .update(voucherData)
           .eq("id", editingVoucher.id);
         
         if (error) throw error;
         toast({ title: "Voucher updated successfully" });
       } else {
         const { error } = await supabase
           .from("vouchers")
           .insert([voucherData]);
         
         if (error) {
           if (error.code === "23505") {
             throw new Error("A voucher with this code already exists");
           }
           throw error;
         }
         toast({ title: "Voucher created successfully" });
       }
 
       setDialogOpen(false);
       setEditingVoucher(null);
       fetchVouchers();
       fetchStats();
     } catch (error) {
       toast({ 
         title: "Error", 
         description: error instanceof Error ? error.message : "Failed to save voucher", 
         variant: "destructive" 
       });
     }
   };
 
   const handleToggleActive = async (voucher: Voucher) => {
     try {
       const { error } = await supabase
         .from("vouchers")
         .update({ is_active: !voucher.is_active })
         .eq("id", voucher.id);
       
       if (error) throw error;
       toast({ title: `Voucher ${!voucher.is_active ? "activated" : "deactivated"}` });
       fetchVouchers();
       fetchStats();
     } catch (error) {
       toast({ title: "Error", description: "Failed to update voucher", variant: "destructive" });
     }
   };
 
   const handleDeleteVoucher = async (voucherId: string) => {
     if (!confirm("Are you sure you want to delete this voucher?")) return;
     
     try {
       const { error } = await supabase
         .from("vouchers")
         .delete()
         .eq("id", voucherId);
       
       if (error) throw error;
       toast({ title: "Voucher deleted successfully" });
       fetchVouchers();
       fetchStats();
     } catch (error) {
       toast({ title: "Error", description: "Failed to delete voucher", variant: "destructive" });
     }
   };
 
   const handleCopyCode = (code: string) => {
     navigator.clipboard.writeText(code);
     setCopiedCode(code);
     setTimeout(() => setCopiedCode(null), 2000);
     toast({ title: "Code copied to clipboard" });
   };
 
   const getVoucherStatus = (voucher: Voucher) => {
     const now = new Date();
     const validFrom = new Date(voucher.valid_from);
     const validUntil = new Date(voucher.valid_until);
     
     if (!voucher.is_active) return { label: "Disabled", variant: "secondary" as const };
     if (now < validFrom) return { label: "Scheduled", variant: "outline" as const };
     if (now > validUntil) return { label: "Expired", variant: "destructive" as const };
     if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) return { label: "Depleted", variant: "destructive" as const };
     return { label: "Active", variant: "default" as const };
   };
 
   const filteredVouchers = campaignFilter === "all" 
     ? vouchers 
     : campaignFilter === "single"
       ? vouchers.filter(v => !v.campaign_id)
       : vouchers.filter(v => v.campaign_id === campaignFilter);
 
   if (loading) {
     return (
       <div className="flex items-center justify-center p-8">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   return (
    <Tabs defaultValue="management" className="space-y-6">
      <TabsList>
        <TabsTrigger value="management" className="gap-2">
          <Tag className="h-4 w-4" />
          Management
        </TabsTrigger>
        <TabsTrigger value="analytics" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="management" className="space-y-6">
       {/* Stats */}
       <MotionContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <MotionStatCard>
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-muted-foreground">Active Vouchers</p>
               <p className="text-2xl font-bold">{stats.totalActive}</p>
             </div>
             <div className="p-2 bg-primary/10 rounded-lg">
               <Tag className="h-5 w-5 text-primary" />
             </div>
           </div>
         </MotionStatCard>
         <MotionStatCard>
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-muted-foreground">Expired</p>
               <p className="text-2xl font-bold">{stats.totalExpired}</p>
             </div>
             <div className="p-2 bg-destructive/10 rounded-lg">
               <Calendar className="h-5 w-5 text-destructive" />
             </div>
           </div>
         </MotionStatCard>
         <MotionStatCard>
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-muted-foreground">Total Usage</p>
               <p className="text-2xl font-bold">{stats.totalUsage}</p>
             </div>
             <div className="p-2 bg-accent/20 rounded-lg">
               <Users className="h-5 w-5" />
             </div>
           </div>
         </MotionStatCard>
         <MotionStatCard>
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-muted-foreground">Total Savings</p>
               <p className="text-2xl font-bold">Rp {stats.totalSavings.toLocaleString()}</p>
             </div>
             <div className="p-2 bg-primary/10 rounded-lg">
               <TrendingUp className="h-5 w-5 text-primary" />
             </div>
           </div>
         </MotionStatCard>
       </MotionContainer>
 
       {/* Vouchers Table */}
       <Card>
         <CardHeader className="flex flex-row items-center justify-between">
           <div>
             <CardTitle>Voucher Management</CardTitle>
             <CardDescription>Create and manage discount vouchers</CardDescription>
           </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
                <Package className="h-4 w-4 mr-2" />
                Bulk Generate
              </Button>
              <Button onClick={() => { setEditingVoucher(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Voucher
              </Button>
            </div>
         </CardHeader>
         <CardContent>
            {/* Campaign Filter */}
            {campaigns.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Filter by Campaign:</span>
                <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="All Campaigns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campaigns</SelectItem>
                    <SelectItem value="single">Single Vouchers</SelectItem>
                    {campaigns.map(campaign => (
                      <SelectItem key={campaign} value={campaign}>
                        {campaign.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Code</TableHead>
                   <TableHead>Name</TableHead>
                   <TableHead>Discount</TableHead>
                   <TableHead>Usage</TableHead>
                   <TableHead>Valid Until</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Active</TableHead>
                   <TableHead className="w-[50px]"></TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                  {filteredVouchers.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                       No vouchers created yet. Create your first voucher!
                     </TableCell>
                   </TableRow>
                 ) : (
                    filteredVouchers.map((voucher) => {
                     const status = getVoucherStatus(voucher);
                     return (
                       <TableRow key={voucher.id}>
                         <TableCell>
                           <div className="flex items-center gap-2">
                             <code className="font-mono font-bold bg-muted px-2 py-1 rounded">
                               {voucher.code}
                             </code>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-7 w-7"
                               onClick={() => handleCopyCode(voucher.code)}
                             >
                               {copiedCode === voucher.code ? (
                                 <Check className="h-3 w-3" />
                               ) : (
                                 <Copy className="h-3 w-3" />
                               )}
                             </Button>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div>
                             <p className="font-medium">{voucher.name}</p>
                             {voucher.first_order_only && (
                               <Badge variant="outline" className="text-xs mt-1">First order only</Badge>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-1">
                             {voucher.discount_type === "percentage" ? (
                               <><Percent className="h-3 w-3" />{voucher.discount_value}%</>
                             ) : (
                               <>Rp {voucher.discount_value.toLocaleString()}</>
                             )}
                           </div>
                           {voucher.max_discount_amount && voucher.discount_type === "percentage" && (
                             <p className="text-xs text-muted-foreground">
                               Max: Rp {voucher.max_discount_amount.toLocaleString()}
                             </p>
                           )}
                         </TableCell>
                         <TableCell>
                           <span className="font-medium">{voucher.usage_count}</span>
                           <span className="text-muted-foreground">
                             /{voucher.usage_limit || "∞"}
                           </span>
                         </TableCell>
                         <TableCell>
                           {format(new Date(voucher.valid_until), "dd MMM yyyy")}
                         </TableCell>
                         <TableCell>
                           <Badge variant={status.variant}>{status.label}</Badge>
                         </TableCell>
                         <TableCell>
                           <Switch
                             checked={voucher.is_active}
                             onCheckedChange={() => handleToggleActive(voucher)}
                           />
                         </TableCell>
                         <TableCell>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8">
                                 <MoreHorizontal className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                               <DropdownMenuItem onClick={() => { setEditingVoucher(voucher); setDialogOpen(true); }}>
                                 <Pencil className="h-4 w-4 mr-2" />
                                 Edit
                               </DropdownMenuItem>
                               <DropdownMenuItem 
                                 onClick={() => handleDeleteVoucher(voucher.id)}
                                 className="text-destructive"
                               >
                                 <Trash2 className="h-4 w-4 mr-2" />
                                 Delete
                               </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </TableCell>
                       </TableRow>
                     );
                   })
                 )}
               </TableBody>
             </Table>
           </div>
         </CardContent>
       </Card>
 
       {/* Form Dialog */}
       <VoucherFormDialog
         open={dialogOpen}
         onOpenChange={setDialogOpen}
         voucher={editingVoucher}
         onSave={handleSaveVoucher}
       />
        
        {/* Bulk Generator Dialog */}
        <BulkVoucherGeneratorDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          onComplete={() => {
            fetchVouchers();
            fetchStats();
            fetchCampaigns();
          }}
        />
      </TabsContent>

      <TabsContent value="analytics">
        <VoucherAnalytics />
      </TabsContent>
    </Tabs>
   );
 };