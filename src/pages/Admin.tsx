import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import Navbar from "@/components/Navbar";
import StockManagement from "@/components/StockManagement";
import CopyButton from "@/components/CopyButton";
import { StockActivityLog } from "@/components/StockActivityLog";
import { DataTableFilters } from "@/components/DataTableFilters";
import { OrderVerificationDialog } from "@/components/OrderVerificationDialog";
import { TicketConversation } from "@/components/TicketConversation";
import { FilePreview } from "@/components/FilePreview";
import { WebSettingsEditor } from "@/components/WebSettingsEditor";
import { BulkOrderVerification } from "@/components/BulkOrderVerification";
import { CategoryManager } from "@/components/CategoryManager";
import { BusinessRulesEditor } from "@/components/BusinessRulesEditor";
import { CodeInventoryManager } from "@/components/CodeInventoryManager";
import { VoucherManager } from "@/components/VoucherManager";
import { SEOHead } from "@/components/SEOHead";
import { productSchema } from "@/lib/validations";
import { exportToCSV } from "@/lib/exportUtils";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MotionStatCard, MotionContainer, MotionItem, MotionPage, motion } from "@/components/ui/motion";
import { PaymentProofLink } from "@/components/PaymentProofLink";
import { 
  ShoppingCart, Users, Package, LayoutDashboard, CheckCircle, XCircle, Clock, Search, 
  ExternalLink, AlertTriangle, Ticket, Star, Settings, History, Eye, MessageSquare, BarChart3, Layers, ListChecks, Code, Cog, Tag
} from "lucide-react";
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getSortedRowModel, 
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { DataTablePagination } from "@/components/DataTablePagination";

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

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
}

interface Order {
  id: string;
  user_id: string;
  product_id: string;
  redeem_codes: string[] | null;
  quantity: number;
  status: string;
  payment_status: string;
  payment_proof: string | null;
  admin_notes: string | null;
  created_at: string;
  expires_at: string;
  product_name: string;
  customer_email: string;
  customer_name: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  is_active: boolean;
  roles: string[];
}

interface Stats {
  totalOrders: number;
  pendingPayments: number;
  totalRevenue: number;
  totalUsers: number;
}

interface TicketRow {
  id: string;
  subject: string;
  description: string;
  status: string;
  image_proof: string | null;
  created_at: string;
  user_id: string;
  profiles: { full_name: string | null; email: string } | null;
}

interface RatingRow {
  id: string;
  rating: number;
  review: string | null;
  is_visible: boolean;
  created_at: string;
  products: { name: string } | null;
  profiles: { full_name: string | null } | null;
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, pendingPayments: 0, totalRevenue: 0, totalUsers: 0 });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [stockManagementOpen, setStockManagementOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", duration_days: "", category_id: "" });
  
  // Order verification
  const [verifyingOrder, setVerifyingOrder] = useState<Order | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  
  // Ticket conversation
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [ticketConversationOpen, setTicketConversationOpen] = useState(false);
  
  // Bulk verification
  const [bulkVerifyOpen, setBulkVerifyOpen] = useState(false);
  // Filters
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderDateRange, setOrderDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [userSearch, setUserSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");
  const [ticketDateRange, setTicketDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [ratingSearch, setRatingSearch] = useState("");
  const [ratingVisibleFilter, setRatingVisibleFilter] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  
  // Table state
  const [orderSorting, setOrderSorting] = useState<SortingState>([]);
  const [orderFilters, setOrderFilters] = useState<ColumnFiltersState>([]);
  const [userSorting, setUserSorting] = useState<SortingState>([]);
  const [userFilters, setUserFilters] = useState<ColumnFiltersState>([]);
  const [ticketSorting, setTicketSorting] = useState<SortingState>([]);
  const [ratingSorting, setRatingSorting] = useState<SortingState>([]);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings: siteSettings } = useSiteSettings();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchTickets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchOrders(); fetchStats(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_ratings' }, () => fetchRatings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/signin");
        return;
      }
      const { data, error } = await supabase.functions.invoke('verify-admin');
      if (error || !data?.isAdmin) {
        toast({ title: "Access denied", description: "You don't have permission to access this page", variant: "destructive" });
        navigate("/");
        return;
      }
      await Promise.all([fetchProducts(), fetchCategories(), fetchOrders(), fetchUsers(), fetchStats(), fetchTickets(), fetchRatings()]);
    } catch (error) {
      toast({ title: "Error", description: "Failed to verify admin access", variant: "destructive" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      setProducts(data);
      const lowStockProducts = data.filter(p => p.stock < 10 && p.stock > 0);
      const outOfStockProducts = data.filter(p => p.stock === 0);
      if (lowStockProducts.length > 0) {
        toast({ title: "Low Stock Alert", description: `${lowStockProducts.length} product(s) have low stock`, variant: "destructive" });
      }
      if (outOfStockProducts.length > 0) {
        toast({ title: "Out of Stock Alert", description: `${outOfStockProducts.length} product(s) are out of stock`, variant: "destructive" });
      }
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, name, parent_id, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase.from("orders").select(`*, products(name)`).order("created_at", { ascending: false });
    if (!error && data) {
      const userIds = [...new Set(data.map((order: any) => order.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, email, full_name").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const ordersWithDetails = data.map((order: any) => {
        const profile = profileMap.get(order.user_id);
        return { ...order, product_name: order.products?.name || "Unknown", customer_email: profile?.email || "Unknown", customer_name: profile?.full_name || "Unknown" };
      });
      setOrders(ordersWithDetails);
    }
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (profiles) {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string[]>();
      roles?.forEach(r => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
        roleMap.get(r.user_id)?.push(r.role);
      });
      const usersWithRoles = profiles.map(p => ({ ...p, roles: roleMap.get(p.id) || [] }));
      setUsers(usersWithRoles);
    }
  };

  const fetchStats = async () => {
    const { data: orders } = await supabase.from("orders").select("payment_status");
    const { data: profiles } = await supabase.from("profiles").select("id");
    const totalOrders = orders?.length || 0;
    const pendingPayments = orders?.filter(o => o.payment_status === "pending").length || 0;
    const totalRevenue = orders?.filter(o => o.payment_status === "verified").length || 0;
    const totalUsers = profiles?.length || 0;
    setStats({ totalOrders, pendingPayments, totalRevenue, totalUsers });
  };

  const fetchTickets = async () => {
    const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const ticketsWithProfiles = data.map(t => ({ ...t, profiles: profileMap.get(t.user_id) || null }));
      setTickets(ticketsWithProfiles as TicketRow[]);
    }
  };

  const fetchRatings = async () => {
    const { data, error } = await supabase.from("product_ratings").select("*, products(name)").order("created_at", { ascending: false });
    if (!error && data) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const ratingsWithProfiles = data.map(r => ({ ...r, profiles: profileMap.get(r.user_id) || null }));
      setRatings(ratingsWithProfiles as RatingRow[]);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validationResult = productSchema.safeParse({
        name: productForm.name.trim(),
        description: productForm.description.trim() || undefined,
        price: parseFloat(productForm.price),
        duration_days: parseInt(productForm.duration_days),
        category_id: productForm.category_id || null,
      });
      if (!validationResult.success) {
        toast({ title: "Validation Error", description: validationResult.error.errors[0].message, variant: "destructive" });
        return;
      }
      const productData = validationResult.data;
      if (editingProduct) {
        const { error } = await supabase.from("products").update({
          name: productData.name,
          description: productData.description,
          price: productData.price,
          duration_days: productData.duration_days,
          category_id: productData.category_id,
        }).eq("id", editingProduct.id);
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase.from("products").insert([{ 
          name: productData.name, 
          description: productData.description, 
          price: productData.price, 
          duration_days: productData.duration_days, 
          category_id: productData.category_id,
          stock: 0 
        }]);
        if (error) throw error;
        toast({ title: "Product created successfully" });
      }
      setProductForm({ name: "", description: "", price: "", duration_days: "", category_id: "" });
      setEditingProduct(null);
      setShowProductDialog(false);
      fetchProducts();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save product", variant: "destructive" });
    }
  };

  const handleToggleRole = async (userId: string, role: "admin" | "staff", hasRole: boolean) => {
    try {
      if (hasRole) {
        const { data } = await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", role).maybeSingle();
        if (data) await supabase.from("user_roles").delete().eq("id", data.id);
      } else {
        await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      }
      toast({ title: `Role ${hasRole ? "removed" : "added"} successfully` });
      fetchUsers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !currentStatus }).eq("id", userId);
      if (error) throw error;
      toast({ title: `User ${!currentStatus ? "activated" : "deactivated"} successfully` });
      fetchUsers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update user status", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await supabase.from("orders").delete().eq("user_id", userId);
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
      toast({ title: "User deleted successfully" });
      fetchUsers();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete user", variant: "destructive" });
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("support_tickets").update(updateData).eq("id", ticketId);
      if (error) throw error;
      toast({ title: "Ticket status updated" });
      fetchTickets();
    } catch (error) {
      toast({ title: "Error updating ticket", variant: "destructive" });
    }
  };

  const handleToggleRatingVisibility = async (ratingId: string, isVisible: boolean) => {
    try {
      const { error } = await supabase.from("product_ratings").update({ is_visible: !isVisible }).eq("id", ratingId);
      if (error) throw error;
      toast({ title: "Rating visibility updated" });
      fetchRatings();
    } catch (error) {
      toast({ title: "Error updating rating", variant: "destructive" });
    }
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'in_progress': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return '';
    }
  };

  // Filtered data
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = !orderSearch || 
        order.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
        order.customer_email.toLowerCase().includes(orderSearch.toLowerCase()) ||
        order.product_name.toLowerCase().includes(orderSearch.toLowerCase());
      const matchesStatus = orderStatusFilter === 'all' || order.payment_status === orderStatusFilter;
      const orderDate = new Date(order.created_at);
      const matchesDateFrom = !orderDateRange.from || orderDate >= orderDateRange.from;
      const matchesDateTo = !orderDateRange.to || orderDate <= new Date(orderDateRange.to.getTime() + 86400000);
      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [orders, orderSearch, orderStatusFilter, orderDateRange]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    return users.filter(user => 
      user.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = !ticketSearch || 
        ticket.subject.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        ticket.profiles?.full_name?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        ticket.profiles?.email?.toLowerCase().includes(ticketSearch.toLowerCase());
      const matchesStatus = ticketStatusFilter === 'all' || ticket.status === ticketStatusFilter;
      const ticketDate = new Date(ticket.created_at);
      const matchesDateFrom = !ticketDateRange.from || ticketDate >= ticketDateRange.from;
      const matchesDateTo = !ticketDateRange.to || ticketDate <= new Date(ticketDateRange.to.getTime() + 86400000);
      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [tickets, ticketSearch, ticketStatusFilter, ticketDateRange]);

  const filteredRatings = useMemo(() => {
    return ratings.filter(rating => {
      const matchesSearch = !ratingSearch || 
        rating.products?.name?.toLowerCase().includes(ratingSearch.toLowerCase()) ||
        rating.profiles?.full_name?.toLowerCase().includes(ratingSearch.toLowerCase());
      const matchesVisible = ratingVisibleFilter === 'all' || 
        (ratingVisibleFilter === 'visible' && rating.is_visible) ||
        (ratingVisibleFilter === 'hidden' && !rating.is_visible);
      return matchesSearch && matchesVisible;
    });
  }, [ratings, ratingSearch, ratingVisibleFilter]);

  // Export handlers
  const exportOrders = () => {
    exportToCSV(filteredOrders, [
      { key: "customer_name", header: "Customer" },
      { key: "customer_email", header: "Email" },
      { key: "product_name", header: "Product" },
      { key: "quantity", header: "Quantity" },
      { key: "payment_status", header: "Payment Status" },
      { key: "status", header: "Order Status" },
      { key: "created_at", header: "Created At" },
    ], "orders");
  };

  const exportUsers = () => {
    exportToCSV(filteredUsers, [
      { key: "full_name", header: "Name" },
      { key: "email", header: "Email" },
      { key: "roles", header: "Roles" },
      { key: "is_active", header: "Active" },
      { key: "created_at", header: "Joined At" },
    ], "users");
  };

  const exportTickets = () => {
    exportToCSV(filteredTickets.map(t => ({
      ...t,
      user_name: t.profiles?.full_name || '',
      user_email: t.profiles?.email || ''
    })), [
      { key: "subject", header: "Subject" },
      { key: "user_name", header: "Customer" },
      { key: "user_email", header: "Email" },
      { key: "status", header: "Status" },
      { key: "created_at", header: "Created At" },
    ], "tickets");
  };

  const exportRatings = () => {
    exportToCSV(filteredRatings.map(r => ({
      ...r,
      product_name: r.products?.name || '',
      user_name: r.profiles?.full_name || '',
    })), [
      { key: "product_name", header: "Product" },
      { key: "user_name", header: "Customer" },
      { key: "rating", header: "Rating" },
      { key: "review", header: "Review" },
      { key: "is_visible", header: "Visible" },
      { key: "created_at", header: "Created At" },
    ], "ratings");
  };

  const exportProducts = () => {
    exportToCSV(products, [
      { key: "name", header: "Name" },
      { key: "description", header: "Description" },
      { key: "price", header: "Price (IDR)" },
      { key: "duration_days", header: "Duration (Days)" },
      { key: "stock", header: "Stock" },
      { key: "is_active", header: "Active" },
    ], "products");
  };

  // Order columns
  const orderColumns: ColumnDef<Order>[] = useMemo(() => [
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.customer_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.customer_email}</p>
        </div>
      ),
    },
    { accessorKey: "product_name", header: "Product" },
    {
      accessorKey: "payment_status",
      header: "Payment",
      cell: ({ row }) => (
        <Badge variant={row.original.payment_status === "verified" ? "default" : row.original.payment_status === "rejected" ? "destructive" : "outline"}>
          {row.original.payment_status}
        </Badge>
      ),
    },
    { accessorKey: "quantity", header: "Qty", cell: ({ row }) => <span className="font-medium">{row.original.quantity}</span> },
    {
      accessorKey: "payment_proof",
      header: "Proof",
      cell: ({ row }) => <PaymentProofLink filePath={row.original.payment_proof || ""} />,
    },
    {
      id: "redeem_codes",
      header: "Codes",
      cell: ({ row }) => row.original.redeem_codes && row.original.redeem_codes.length > 0 ? (
        <div className="flex flex-col gap-1">
          {row.original.redeem_codes.map((code, i) => (
            <div key={i} className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded">****</code>
              <CopyButton text={code} label="" />
            </div>
          ))}
        </div>
      ) : <span className="text-muted-foreground text-sm">-</span>,
    },
    { accessorKey: "created_at", header: "Date", cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString() },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => row.original.payment_status === "pending" && (
        <Button variant="outline" size="sm" onClick={() => { setVerifyingOrder(row.original); setVerifyDialogOpen(true); }}>
          Verify
        </Button>
      ),
    },
  ], []);

  // User columns
  const userColumns: ColumnDef<User>[] = useMemo(() => [
    { accessorKey: "full_name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <Badge variant={row.original.is_active ? "default" : "destructive"}>{row.original.is_active ? "Active" : "Inactive"}</Badge>,
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => (
        <div className="flex gap-1">{row.original.roles.length > 0 ? row.original.roles.map((role) => <Badge key={role} variant="secondary">{role}</Badge>) : <Badge variant="outline">user</Badge>}</div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2 flex-wrap">
          <Button variant={row.original.roles.includes("admin") ? "destructive" : "outline"} size="sm" onClick={() => handleToggleRole(row.original.id, "admin", row.original.roles.includes("admin"))}>
            {row.original.roles.includes("admin") ? "Remove" : "Make"} Admin
          </Button>
          <Button variant={row.original.roles.includes("staff") ? "destructive" : "outline"} size="sm" onClick={() => handleToggleRole(row.original.id, "staff", row.original.roles.includes("staff"))}>
            {row.original.roles.includes("staff") ? "Remove" : "Make"} Staff
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleToggleUserStatus(row.original.id, row.original.is_active)}>
            {row.original.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(row.original.id)}>Delete</Button>
        </div>
      ),
    },
  ], []);

  // Ticket columns
  const ticketColumns: ColumnDef<TicketRow>[] = useMemo(() => [
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.subject}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</p>
        </div>
      ),
    },
    { id: "user", header: "User", cell: ({ row }) => row.original.profiles?.full_name || row.original.profiles?.email || "-" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge className={getTicketStatusColor(row.original.status)}>{row.original.status.replace("_", " ")}</Badge>,
    },
    {
      id: "attachment",
      header: "Attachment",
      cell: ({ row }) => <PaymentProofLink filePath={row.original.image_proof || ""} />,
    },
    { accessorKey: "created_at", header: "Created", cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString() },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedTicket(row.original); setTicketConversationOpen(true); }}>
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Select value={row.original.status} onValueChange={(val) => handleUpdateTicketStatus(row.original.id, val)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    },
  ], []);

  // Rating columns
  const ratingColumns: ColumnDef<RatingRow>[] = useMemo(() => [
    { id: "product", header: "Product", cell: ({ row }) => row.original.products?.name || "-" },
    { id: "user", header: "User", cell: ({ row }) => row.original.profiles?.full_name || "-" },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span>{row.original.rating}</span></div>,
    },
    { accessorKey: "review", header: "Review", cell: ({ row }) => <span className="max-w-xs truncate block">{row.original.review || "-"}</span> },
    {
      accessorKey: "is_visible",
      header: "Visible",
      cell: ({ row }) => <Badge variant={row.original.is_visible ? 'default' : 'secondary'}>{row.original.is_visible ? 'Yes' : 'No'}</Badge>,
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => <Button size="sm" variant="outline" onClick={() => handleToggleRatingVisibility(row.original.id, row.original.is_visible)}>Toggle</Button>,
    },
  ], []);

  // Tables
  const orderTable = useReactTable({
    data: filteredOrders,
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting: orderSorting, columnFilters: orderFilters },
    onSortingChange: setOrderSorting,
    onColumnFiltersChange: setOrderFilters,
    initialState: { pagination: { pageSize: 10 } },
  });

  const userTable = useReactTable({
    data: filteredUsers,
    columns: userColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting: userSorting, columnFilters: userFilters },
    onSortingChange: setUserSorting,
    onColumnFiltersChange: setUserFilters,
    initialState: { pagination: { pageSize: 10 } },
  });

  const ticketTable = useReactTable({
    data: filteredTickets,
    columns: ticketColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting: ticketSorting },
    onSortingChange: setTicketSorting,
    initialState: { pagination: { pageSize: 10 } },
  });

  const ratingTable = useReactTable({
    data: filteredRatings,
    columns: ratingColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting: ratingSorting },
    onSortingChange: setRatingSorting,
    initialState: { pagination: { pageSize: 10 } },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center"><p className="text-muted-foreground">Loading...</p></div>
      </div>
    );
  }

  return (
    <MotionPage className="min-h-screen bg-background">
      <SEOHead title={`Admin Panel - ${siteSettings.name}`} siteName={siteSettings.name} noIndex noFollow />
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage your store and users</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="brutal" onClick={() => navigate("/admin/analytics")}>
              <BarChart3 className="h-4 w-4 mr-2" />Analytics
            </Button>
            <Button variant="outline" onClick={() => setBulkVerifyOpen(true)}>
              <ListChecks className="h-4 w-4 mr-2" />Bulk Verify
            </Button>
          </div>
        </motion.div>
        
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-auto min-w-full lg:grid lg:grid-cols-10">
            <TabsTrigger value="dashboard"><LayoutDashboard className="h-4 w-4 mr-2" /><span>Dashboard</span></TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-2" /><span>Orders</span></TabsTrigger>
            <TabsTrigger value="products"><Package className="h-4 w-4 mr-2" /><span>Products</span></TabsTrigger>
            <TabsTrigger value="categories"><Layers className="h-4 w-4 mr-2" /><span>Categories</span></TabsTrigger>
            <TabsTrigger value="code-inventory"><Code className="h-4 w-4 mr-2" /><span>Codes</span></TabsTrigger>
            <TabsTrigger value="vouchers"><Tag className="h-4 w-4 mr-2" /><span>Vouchers</span></TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" /><span>Users</span></TabsTrigger>
            <TabsTrigger value="tickets"><Ticket className="h-4 w-4 mr-2" /><span>Tickets</span></TabsTrigger>
            <TabsTrigger value="ratings"><Star className="h-4 w-4 mr-2" /><span>Ratings</span></TabsTrigger>
            <TabsTrigger value="settings"><Cog className="h-4 w-4 mr-2" /><span>Settings</span></TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <MotionContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <MotionStatCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                    <p className="text-3xl font-bold">{stats.totalOrders}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg border-2 border-border">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </MotionStatCard>
              <MotionStatCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                    <p className="text-3xl font-bold">{stats.pendingPayments}</p>
                  </div>
                  <div className="p-3 bg-accent/20 rounded-lg border-2 border-border">
                    <Clock className="h-6 w-6 text-accent-foreground" />
                  </div>
                </div>
              </MotionStatCard>
              <MotionStatCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Verified Orders</p>
                    <p className="text-3xl font-bold">{stats.totalRevenue}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg border-2 border-border">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </MotionStatCard>
              <MotionStatCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                    <p className="text-3xl font-bold">{stats.totalUsers}</p>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded-lg border-2 border-border">
                    <Users className="h-6 w-6 text-secondary-foreground" />
                  </div>
                </div>
              </MotionStatCard>
            </MotionContainer>
            <Card>
              <CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>Latest orders</CardDescription></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {orders.slice(0, 5).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.customer_name}</TableCell>
                          <TableCell>{order.product_name}</TableCell>
                          <TableCell><Badge variant={order.payment_status === "verified" ? "default" : "outline"}>{order.payment_status}</Badge></TableCell>
                          <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>Verify payments and issue redeem codes</CardDescription>
                <DataTableFilters
                  searchValue={orderSearch}
                  onSearchChange={setOrderSearch}
                  searchPlaceholder="Search by customer, product..."
                  filters={[{
                    key: "status",
                    label: "Status",
                    value: orderStatusFilter,
                    options: [
                      { value: "pending", label: "Pending" },
                      { value: "verified", label: "Verified" },
                      { value: "rejected", label: "Rejected" },
                    ],
                    onChange: setOrderStatusFilter
                  }]}
                  showDateFilter
                  dateRange={orderDateRange}
                  onDateRangeChange={setOrderDateRange}
                  onReset={() => { setOrderSearch(""); setOrderStatusFilter("all"); setOrderDateRange({ from: undefined, to: undefined }); }}
                  onExport={exportOrders}
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>{orderTable.getHeaderGroups().map(headerGroup => (<TableRow key={headerGroup.id}>{headerGroup.headers.map(header => (<TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>))}</TableRow>))}</TableHeader>
                    <TableBody>
                      {orderTable.getRowModel().rows.length ? orderTable.getRowModel().rows.map(row => (<TableRow key={row.id}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>)) : (<TableRow><TableCell colSpan={orderColumns.length} className="text-center">No orders found</TableCell></TableRow>)}
                    </TableBody>
                  </Table>
                </div>
                <DataTablePagination table={orderTable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader><CardTitle>Product Management</CardTitle></CardHeader>
              <CardContent>
                <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                  <DialogTrigger asChild>
                    <Button className="mb-4" onClick={() => { setEditingProduct(null); setProductForm({ name: "", description: "", price: "", duration_days: "", category_id: "" }); }}>Add Product</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingProduct ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
                    <form onSubmit={handleProductSubmit} className="space-y-4">
                      <div className="space-y-2"><Label>Name</Label><Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required /></div>
                      <div className="space-y-2"><Label>Description</Label><Textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={productForm.category_id || "none"} onValueChange={(value) => setProductForm({ ...productForm, category_id: value === "none" ? "" : value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Category</SelectItem>
                            {categories.filter(c => !c.parent_id).map((parentCat) => (
                              <React.Fragment key={parentCat.id}>
                                <SelectItem value={parentCat.id} className="font-semibold">{parentCat.name}</SelectItem>
                                {categories.filter(c => c.parent_id === parentCat.id).map((childCat) => (
                                  <SelectItem key={childCat.id} value={childCat.id} className="pl-6">↳ {childCat.name}</SelectItem>
                                ))}
                              </React.Fragment>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Price (IDR)</Label><Input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required /></div>
                      <div className="space-y-2"><Label>Duration (days)</Label><Input type="number" value={productForm.duration_days} onChange={(e) => setProductForm({ ...productForm, duration_days: e.target.value })} required /></div>
                      <Button type="submit" className="w-full">{editingProduct ? "Update" : "Create"}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <DataTableFilters
                  searchValue={productSearch}
                  onSearchChange={setProductSearch}
                  searchPlaceholder="Search products..."
                  onExport={exportProducts}
                />
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Duration</TableHead><TableHead>Stock</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map((product) => {
                        const productCategory = categories.find(c => c.id === product.category_id);
                        const parentCategory = productCategory?.parent_id ? categories.find(c => c.id === productCategory.parent_id) : null;
                        return (
                          <TableRow key={product.id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>
                              {productCategory ? (
                                <Badge variant="outline" className="text-xs">
                                  {parentCategory ? `${parentCategory.name} / ` : ""}{productCategory.name}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>Rp {product.price.toLocaleString('id-ID')}</TableCell>
                            <TableCell>{product.duration_days} days</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={product.stock < 10 ? "text-destructive font-semibold" : ""}>{product.stock}</span>
                                {product.stock < 10 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                              </div>
                            </TableCell>
                            <TableCell><Badge variant={product.is_active ? "default" : "secondary"}>{product.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-2 flex-wrap">
                                <Button variant="outline" size="sm" onClick={() => { setSelectedProductForStock(product); setStockManagementOpen(true); }}>Manage Stock</Button>
                                <Button variant="outline" size="sm" onClick={() => { setEditingProduct(product); setProductForm({ name: product.name, description: product.description || "", price: product.price.toString(), duration_days: product.duration_days.toString(), category_id: product.category_id || "" }); setShowProductDialog(true); }}>Edit</Button>
                                <Button variant={product.is_active ? "outline" : "default"} size="sm" onClick={async () => { await supabase.from("products").update({ is_active: !product.is_active }).eq("id", product.id); fetchProducts(); }}>{product.is_active ? "Deactivate" : "Activate"}</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and roles</CardDescription>
                <DataTableFilters
                  searchValue={userSearch}
                  onSearchChange={setUserSearch}
                  searchPlaceholder="Search by name or email..."
                  onExport={exportUsers}
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>{userTable.getHeaderGroups().map(headerGroup => (<TableRow key={headerGroup.id}>{headerGroup.headers.map(header => (<TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>))}</TableRow>))}</TableHeader>
                    <TableBody>{userTable.getRowModel().rows.length ? userTable.getRowModel().rows.map(row => (<TableRow key={row.id}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>)) : (<TableRow><TableCell colSpan={userColumns.length} className="text-center">No users found</TableCell></TableRow>)}</TableBody>
                  </Table>
                </div>
                <DataTablePagination table={userTable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>Manage customer support requests</CardDescription>
                <DataTableFilters
                  searchValue={ticketSearch}
                  onSearchChange={setTicketSearch}
                  searchPlaceholder="Search tickets..."
                  filters={[{
                    key: "status",
                    label: "Status",
                    value: ticketStatusFilter,
                    options: [
                      { value: "open", label: "Open" },
                      { value: "in_progress", label: "In Progress" },
                      { value: "resolved", label: "Resolved" },
                      { value: "closed", label: "Closed" },
                    ],
                    onChange: setTicketStatusFilter
                  }]}
                  showDateFilter
                  dateRange={ticketDateRange}
                  onDateRangeChange={setTicketDateRange}
                  onReset={() => { setTicketSearch(""); setTicketStatusFilter("all"); setTicketDateRange({ from: undefined, to: undefined }); }}
                  onExport={exportTickets}
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>{ticketTable.getHeaderGroups().map(headerGroup => (<TableRow key={headerGroup.id}>{headerGroup.headers.map(header => (<TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>))}</TableRow>))}</TableHeader>
                    <TableBody>{ticketTable.getRowModel().rows.length ? ticketTable.getRowModel().rows.map(row => (<TableRow key={row.id}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>)) : (<TableRow><TableCell colSpan={ticketColumns.length} className="text-center">No tickets found</TableCell></TableRow>)}</TableBody>
                  </Table>
                </div>
                <DataTablePagination table={ticketTable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ratings">
            <Card>
              <CardHeader>
                <CardTitle>Product Ratings & Reviews</CardTitle>
                <CardDescription>Manage customer ratings and reviews</CardDescription>
                <DataTableFilters
                  searchValue={ratingSearch}
                  onSearchChange={setRatingSearch}
                  searchPlaceholder="Search by product or user..."
                  filters={[{
                    key: "visibility",
                    label: "Visibility",
                    value: ratingVisibleFilter,
                    options: [
                      { value: "visible", label: "Visible" },
                      { value: "hidden", label: "Hidden" },
                    ],
                    onChange: setRatingVisibleFilter
                  }]}
                  onReset={() => { setRatingSearch(""); setRatingVisibleFilter("all"); }}
                  onExport={exportRatings}
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>{ratingTable.getHeaderGroups().map(headerGroup => (<TableRow key={headerGroup.id}>{headerGroup.headers.map(header => (<TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>))}</TableRow>))}</TableHeader>
                    <TableBody>{ratingTable.getRowModel().rows.length ? ratingTable.getRowModel().rows.map(row => (<TableRow key={row.id}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>)) : (<TableRow><TableCell colSpan={ratingColumns.length} className="text-center">No ratings found</TableCell></TableRow>)}</TableBody>
                  </Table>
                </div>
                <DataTablePagination table={ratingTable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Product Categories</CardTitle>
                <CardDescription>Manage product categories and organization</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="code-inventory">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Code Inventory
                </CardTitle>
                <CardDescription>Manage pre-uploaded redeem codes for auto-delivery products</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeInventoryManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit"><StockActivityLog /></TabsContent>

        <TabsContent value="vouchers">
          <VoucherManager />
        </TabsContent>

          <TabsContent value="settings">
            <Tabs defaultValue="web" className="space-y-4">
              <TabsList>
                <TabsTrigger value="web">Web Settings</TabsTrigger>
                <TabsTrigger value="business">Business Rules</TabsTrigger>
              </TabsList>
              <TabsContent value="web">
                <WebSettingsEditor />
              </TabsContent>
              <TabsContent value="business">
                <BusinessRulesEditor />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Verification Dialog */}
      {verifyingOrder && (
        <OrderVerificationDialog
          open={verifyDialogOpen}
          onOpenChange={setVerifyDialogOpen}
          order={{
            id: verifyingOrder.id,
            quantity: verifyingOrder.quantity,
            product_id: verifyingOrder.product_id,
            payment_proof: verifyingOrder.payment_proof,
            product_name: verifyingOrder.product_name,
            customer_name: verifyingOrder.customer_name,
            created_at: verifyingOrder.created_at,
          }}
          onVerify={async (orderId, redeemCodes, adminNotes) => {
            const { data: { user } } = await supabase.auth.getUser();
            
            // Mark inventory codes as used if they match
            const { data: inventoryCodes } = await supabase
              .from("redeem_code_inventory")
              .select("id, code")
              .eq("product_id", verifyingOrder.product_id)
              .eq("is_used", false)
              .in("code", redeemCodes);
            
            if (inventoryCodes && inventoryCodes.length > 0) {
              const codeIds = inventoryCodes.map(c => c.id);
              await supabase
                .from("redeem_code_inventory")
                .update({ 
                  is_used: true, 
                  used_at: new Date().toISOString(),
                  order_id: orderId 
                })
                .in("id", codeIds);
            }
            
            await supabase.from("orders").update({
              payment_status: "verified",
              redeem_codes: redeemCodes,
              admin_notes: adminNotes,
              verified_at: new Date().toISOString(),
              verified_by: user?.id
            }).eq("id", orderId);
            
            // Update product stock
            const product = products.find(p => p.id === verifyingOrder.product_id);
            if (product) {
              await supabase.from("products").update({ 
                stock: Math.max(0, product.stock - verifyingOrder.quantity) 
              }).eq("id", product.id);
            }
            
            // Send email notification
            try {
              await supabase.functions.invoke("send-notification", {
                body: { type: "order_verified", orderId },
              });
            } catch (err) {
              console.error("Failed to send notification:", err);
            }
            
            fetchOrders(); fetchProducts(); fetchStats();
          }}
          onReject={async (orderId, reason) => {
            await supabase.from("orders").update({
              payment_status: "rejected",
              admin_notes: reason
            }).eq("id", orderId);
            
            // Send email notification
            try {
              await supabase.functions.invoke("send-notification", {
                body: { type: "order_rejected", orderId, additionalData: { reason } },
              });
            } catch (err) {
              console.error("Failed to send notification:", err);
            }
            
            fetchOrders(); fetchStats();
          }}
        />
      )}

      {/* Stock Management Dialog */}
      {selectedProductForStock && (
        <StockManagement
          open={stockManagementOpen}
          onOpenChange={setStockManagementOpen}
          product={selectedProductForStock}
          onSuccess={fetchProducts}
        />
      )}

      {/* Ticket Conversation Dialog */}
      {selectedTicket && (
        <Dialog open={ticketConversationOpen} onOpenChange={setTicketConversationOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTicket.subject}</DialogTitle>
              <DialogDescription>
                {selectedTicket.profiles?.full_name || selectedTicket.profiles?.email} • {selectedTicket.status}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{selectedTicket.description}</p>
                {selectedTicket.image_proof && (
                  <div className="mt-4">
                    <FilePreview filePath={selectedTicket.image_proof} />
                  </div>
                )}
              </div>
              <TicketConversation 
                ticketId={selectedTicket.id} 
                ticketStatus={selectedTicket.status}
                ticketOwnerId={selectedTicket.user_id}
                imageProof={selectedTicket.image_proof}
                viewerRole="staff"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Order Verification Dialog */}
      <BulkOrderVerification
        open={bulkVerifyOpen}
        onOpenChange={setBulkVerifyOpen}
        onSuccess={() => { fetchOrders(); fetchProducts(); fetchStats(); }}
      />
    </MotionPage>
  );
};

export default Admin;