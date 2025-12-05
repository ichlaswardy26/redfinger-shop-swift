import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import StockManagement from "@/components/StockManagement";
import CopyButton from "@/components/CopyButton";
import { StockActivityLog } from "@/components/StockActivityLog";
import { productSchema } from "@/lib/validations";
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
import { 
  ShoppingCart, Users, Package, LayoutDashboard, CheckCircle, XCircle, Clock, Search, 
  ExternalLink, AlertTriangle, Ticket, Star, Settings, History 
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
  created_at: string;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, pendingPayments: 0, totalRevenue: 0, totalUsers: 0 });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [verifyingOrder, setVerifyingOrder] = useState<Order | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [stockManagementOpen, setStockManagementOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", duration_days: "" });
  const [verifyForm, setVerifyForm] = useState<{ redeem_codes: string[], admin_notes: string, status: string }>({ 
    redeem_codes: [], 
    admin_notes: "", 
    status: "verified" 
  });
  const [productSearch, setProductSearch] = useState("");
  const [productSorting, setProductSorting] = useState<SortingState>([]);
  const [productFilters, setProductFilters] = useState<ColumnFiltersState>([]);
  const [orderSorting, setOrderSorting] = useState<SortingState>([]);
  const [orderFilters, setOrderFilters] = useState<ColumnFiltersState>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [userSorting, setUserSorting] = useState<SortingState>([]);
  const [userFilters, setUserFilters] = useState<ColumnFiltersState>([]);
  const [userSearch, setUserSearch] = useState("");
  const [ticketSorting, setTicketSorting] = useState<SortingState>([]);
  const [ticketSearch, setTicketSearch] = useState("");
  const [ratingSorting, setRatingSorting] = useState<SortingState>([]);
  const [ratingSearch, setRatingSearch] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    // Set up realtime subscriptions
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
        toast({
          title: "Access denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      await Promise.all([fetchProducts(), fetchOrders(), fetchUsers(), fetchStats(), fetchTickets(), fetchRatings()]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify admin access",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setProducts(data);
      const lowStockProducts = data.filter(p => p.stock < 10 && p.stock > 0);
      const outOfStockProducts = data.filter(p => p.stock === 0);
      if (lowStockProducts.length > 0) {
        toast({
          title: "Low Stock Alert",
          description: `${lowStockProducts.length} product(s) have low stock (< 10 items)`,
          variant: "destructive",
        });
      }
      if (outOfStockProducts.length > 0) {
        toast({
          title: "Out of Stock Alert",
          description: `${outOfStockProducts.length} product(s) are out of stock`,
          variant: "destructive",
        });
      }
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`*, products(name)`)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const userIds = [...new Set(data.map((order: any) => order.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const ordersWithDetails = data.map((order: any) => {
        const profile = profileMap.get(order.user_id);
        return {
          ...order,
          product_name: order.products?.name || "Unknown",
          customer_email: profile?.email || "Unknown",
          customer_name: profile?.full_name || "Unknown",
        };
      });
      setOrders(ordersWithDetails);
    }
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (profiles) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");
      const roleMap = new Map<string, string[]>();
      roles?.forEach(r => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
        roleMap.get(r.user_id)?.push(r.role);
      });
      const usersWithRoles = profiles.map(p => ({
        ...p,
        roles: roleMap.get(p.id) || [],
      }));
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
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const ticketsWithProfiles = data.map(t => ({ ...t, profiles: profileMap.get(t.user_id) || null }));
      setTickets(ticketsWithProfiles as any);
    }
  };

  const fetchRatings = async () => {
    const { data, error } = await supabase
      .from("product_ratings")
      .select("*, products(name)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const ratingsWithProfiles = data.map(r => ({ ...r, profiles: profileMap.get(r.user_id) || null }));
      setRatings(ratingsWithProfiles as any);
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
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
        return;
      }

      const productData = validationResult.data;
      
      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase.from("products").insert([{ 
          name: productData.name,
          description: productData.description,
          price: productData.price,
          duration_days: productData.duration_days,
          stock: 0 
        }]);
        if (error) throw error;
        toast({ title: "Product created successfully. Use Stock Management to add stock." });
      }
      setProductForm({ name: "", description: "", price: "", duration_days: "" });
      setEditingProduct(null);
      setShowProductDialog(false);
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingOrder) return;
    try {
      const updateData: any = {
        payment_status: verifyForm.status,
        admin_notes: verifyForm.admin_notes,
        verified_at: new Date().toISOString(),
      };
      if (verifyForm.status === "verified") {
        if (verifyForm.redeem_codes.some(code => !code.trim())) {
          toast({
            title: "Error",
            description: "Please fill in all redeem codes",
            variant: "destructive",
          });
          return;
        }
        updateData.redeem_codes = verifyForm.redeem_codes;
        updateData.status = "active";
        const product = products.find(p => p.id === verifyingOrder.product_id);
        if (product) {
          await supabase
            .from("products")
            .update({ stock: Math.max(0, product.stock - verifyingOrder.quantity) })
            .eq("id", product.id);
        }
      } else if (verifyForm.status === "rejected") {
        updateData.status = "rejected";
      }
      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", verifyingOrder.id);
      if (error) throw error;
      toast({ title: "Payment verification updated" });
      setVerifyingOrder(null);
      setVerifyDialogOpen(false);
      setVerifyForm({ redeem_codes: [], admin_notes: "", status: "verified" });
      fetchOrders();
      fetchProducts();
      fetchStats();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify payment",
        variant: "destructive",
      });
    }
  };

  const handleToggleRole = async (userId: string, role: "admin" | "staff", hasRole: boolean) => {
    try {
      if (hasRole) {
        const { data } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", role)
          .maybeSingle();
        if (data) {
          await supabase.from("user_roles").delete().eq("id", data.id);
        }
      } else {
        await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      }
      toast({ title: `Role ${hasRole ? "removed" : "added"} successfully` });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !currentStatus })
        .eq("id", userId);
      if (error) throw error;
      toast({ title: `User ${!currentStatus ? "activated" : "deactivated"} successfully` });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }
    try {
      await supabase.from("orders").delete().eq("user_id", userId);
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
      toast({ title: "User deleted successfully" });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", ticketId);
      if (error) throw error;
      toast({ title: "Ticket status updated" });
      fetchTickets();
    } catch (error) {
      toast({ title: "Error updating ticket", variant: "destructive" });
    }
  };

  const handleToggleRatingVisibility = async (ratingId: string, isVisible: boolean) => {
    try {
      const { error } = await supabase
        .from("product_ratings")
        .update({ is_visible: !isVisible })
        .eq("id", ratingId);
      if (error) throw error;
      toast({ title: "Rating visibility updated" });
      fetchRatings();
    } catch (error) {
      toast({ title: "Error updating rating", variant: "destructive" });
    }
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
        <Badge variant={
          row.original.payment_status === "verified" ? "default" :
          row.original.payment_status === "rejected" ? "destructive" : "outline"
        }>
          {row.original.payment_status}
        </Badge>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }) => <span className="font-medium">{row.original.quantity}</span>,
    },
    {
      accessorKey: "payment_proof",
      header: "Proof",
      cell: ({ row }) => (
        row.original.payment_proof ? (
          <a
            href={row.original.payment_proof}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1 text-sm"
          >
            <ExternalLink className="h-3 w-3" />
            View
          </a>
        ) : <span className="text-muted-foreground text-sm">-</span>
      ),
    },
    {
      id: "redeem_codes",
      header: "Codes",
      cell: ({ row }) => (
        row.original.redeem_codes && row.original.redeem_codes.length > 0 ? (
          <div className="flex flex-col gap-1">
            {row.original.redeem_codes.map((code, i) => (
              <div key={i} className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">{code}</code>
                <CopyButton text={code} label="" />
              </div>
            ))}
          </div>
        ) : <span className="text-muted-foreground text-sm">-</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        row.original.payment_status === "pending" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setVerifyingOrder(row.original);
              const codes = Array.from({ length: row.original.quantity }, () => 
                `RF-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
              );
              setVerifyForm({ redeem_codes: codes, admin_notes: "", status: "verified" });
              setVerifyDialogOpen(true);
            }}
          >
            Verify
          </Button>
        )
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
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "destructive"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.roles.length > 0 ? (
            row.original.roles.map((role) => <Badge key={role} variant="secondary">{role}</Badge>)
          ) : <Badge variant="outline">user</Badge>}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={row.original.roles.includes("admin") ? "destructive" : "outline"}
            size="sm"
            onClick={() => handleToggleRole(row.original.id, "admin", row.original.roles.includes("admin"))}
          >
            {row.original.roles.includes("admin") ? "Remove" : "Make"} Admin
          </Button>
          <Button
            variant={row.original.roles.includes("staff") ? "destructive" : "outline"}
            size="sm"
            onClick={() => handleToggleRole(row.original.id, "staff", row.original.roles.includes("staff"))}
          >
            {row.original.roles.includes("staff") ? "Remove" : "Make"} Staff
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(row.original.id)}>
            Delete
          </Button>
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
    {
      id: "user",
      header: "User",
      cell: ({ row }) => row.original.profiles?.full_name || row.original.profiles?.email || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'resolved' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <Select value={row.original.status} onValueChange={(val) => handleUpdateTicketStatus(row.original.id, val)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ], []);

  // Rating columns
  const ratingColumns: ColumnDef<RatingRow>[] = useMemo(() => [
    {
      id: "product",
      header: "Product",
      cell: ({ row }) => row.original.products?.name || "-",
    },
    {
      id: "user",
      header: "User",
      cell: ({ row }) => row.original.profiles?.full_name || "-",
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span>{row.original.rating}</span>
        </div>
      ),
    },
    {
      accessorKey: "review",
      header: "Review",
      cell: ({ row }) => <span className="max-w-xs truncate block">{row.original.review || "-"}</span>,
    },
    {
      accessorKey: "is_visible",
      header: "Visible",
      cell: ({ row }) => (
        <Badge variant={row.original.is_visible ? 'default' : 'secondary'}>
          {row.original.is_visible ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => handleToggleRatingVisibility(row.original.id, row.original.is_visible)}>
          Toggle
        </Button>
      ),
    },
  ], []);

  // Filtered data
  const filteredOrders = useMemo(() => {
    if (!orderSearch) return orders;
    return orders.filter(order => 
      order.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.product_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.payment_status.toLowerCase().includes(orderSearch.toLowerCase())
    );
  }, [orders, orderSearch]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    return users.filter(user => 
      user.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.roles.some(role => role.toLowerCase().includes(userSearch.toLowerCase()))
    );
  }, [users, userSearch]);

  const filteredTickets = useMemo(() => {
    if (!ticketSearch) return tickets;
    return tickets.filter(ticket => 
      ticket.subject.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      ticket.status.toLowerCase().includes(ticketSearch.toLowerCase())
    );
  }, [tickets, ticketSearch]);

  const filteredRatings = useMemo(() => {
    if (!ratingSearch) return ratings;
    return ratings.filter(rating => 
      rating.products?.name.toLowerCase().includes(ratingSearch.toLowerCase()) ||
      rating.profiles?.full_name?.toLowerCase().includes(ratingSearch.toLowerCase())
    );
  }, [ratings, ratingSearch]);

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
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-auto min-w-full lg:grid lg:grid-cols-8">
              <TabsTrigger value="dashboard" className="flex-shrink-0">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex-shrink-0">
                <ShoppingCart className="h-4 w-4 mr-2" />
                <span>Orders</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="flex-shrink-0">
                <Package className="h-4 w-4 mr-2" />
                <span>Products</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex-shrink-0">
                <Users className="h-4 w-4 mr-2" />
                <span>Users</span>
              </TabsTrigger>
              <TabsTrigger value="tickets" className="flex-shrink-0">
                <Ticket className="h-4 w-4 mr-2" />
                <span>Tickets</span>
              </TabsTrigger>
              <TabsTrigger value="ratings" className="flex-shrink-0">
                <Star className="h-4 w-4 mr-2" />
                <span>Ratings</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex-shrink-0">
                <History className="h-4 w-4 mr-2" />
                <span>Audit</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-shrink-0">
                <Settings className="h-4 w-4 mr-2" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.totalOrders}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.pendingPayments}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Verified Orders</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.totalRevenue}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.totalUsers}</div></CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest orders and transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 5).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell>{order.product_name}</TableCell>
                          <TableCell>
                            <Badge variant={order.payment_status === "verified" ? "default" : "outline"}>
                              {order.payment_status}
                            </Badge>
                          </TableCell>
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
                <div className="flex items-center gap-2 mt-4">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by customer, product, or status..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="max-w-sm" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {orderTable.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {orderTable.getRowModel().rows.length ? (
                        orderTable.getRowModel().rows.map(row => (
                          <TableRow key={row.id}>
                            {row.getVisibleCells().map(cell => (
                              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={orderColumns.length} className="text-center">No orders found</TableCell></TableRow>
                      )}
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
                    <Button className="mb-4" onClick={() => { setEditingProduct(null); setProductForm({ name: "", description: "", price: "", duration_days: "" }); }}>Add Product</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingProduct ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
                    <form onSubmit={handleProductSubmit} className="space-y-4">
                      <div className="space-y-2"><Label>Name</Label><Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required /></div>
                      <div className="space-y-2"><Label>Description</Label><Textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Price (IDR)</Label><Input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required /></div>
                      <div className="space-y-2"><Label>Duration (days)</Label><Input type="number" value={productForm.duration_days} onChange={(e) => setProductForm({ ...productForm, duration_days: e.target.value })} required /></div>
                      <Button type="submit" className="w-full">{editingProduct ? "Update" : "Create"}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <div className="flex items-center gap-2 mb-4"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="Search products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="max-w-sm" /></div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Duration</TableHead><TableHead>Stock</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
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
                              <Button variant="outline" size="sm" onClick={() => { setEditingProduct(product); setProductForm({ name: product.name, description: product.description || "", price: product.price.toString(), duration_days: product.duration_days.toString() }); setShowProductDialog(true); }}>Edit</Button>
                              <Button variant={product.is_active ? "outline" : "default"} size="sm" onClick={async () => { await supabase.from("products").update({ is_active: !product.is_active }).eq("id", product.id); fetchProducts(); }}>{product.is_active ? "Deactivate" : "Activate"}</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
                <div className="flex items-center gap-2 mt-4"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name, email, or role..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="max-w-sm" /></div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {userTable.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>{headerGroup.headers.map(header => (<TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>))}</TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {userTable.getRowModel().rows.length ? (
                        userTable.getRowModel().rows.map(row => (
                          <TableRow key={row.id}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>
                        ))
                      ) : (<TableRow><TableCell colSpan={userColumns.length} className="text-center">No users found</TableCell></TableRow>)}
                    </TableBody>
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
                <div className="flex items-center gap-2 mt-4"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="Search tickets..." value={ticketSearch} onChange={(e) => setTicketSearch(e.target.value)} className="max-w-sm" /></div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {ticketTable.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>{headerGroup.headers.map(header => (<TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>))}</TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {ticketTable.getRowModel().rows.length ? (
                        ticketTable.getRowModel().rows.map(row => (
                          <TableRow key={row.id}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>
                        ))
                      ) : (<TableRow><TableCell colSpan={ticketColumns.length} className="text-center">No tickets found</TableCell></TableRow>)}
                    </TableBody>
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
                <div className="flex items-center gap-2 mt-4"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="Search ratings..." value={ratingSearch} onChange={(e) => setRatingSearch(e.target.value)} className="max-w-sm" /></div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {ratingTable.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>{headerGroup.headers.map(header => (<TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>))}</TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {ratingTable.getRowModel().rows.length ? (
                        ratingTable.getRowModel().rows.map(row => (
                          <TableRow key={row.id}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>
                        ))
                      ) : (<TableRow><TableCell colSpan={ratingColumns.length} className="text-center">No ratings found</TableCell></TableRow>)}
                    </TableBody>
                  </Table>
                </div>
                <DataTablePagination table={ratingTable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit"><StockActivityLog /></TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Web Settings</CardTitle>
                <CardDescription>Customize static content and site configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Site Name</Label>
                    <Input defaultValue="Redfinger Store" placeholder="Your site name" />
                    <p className="text-xs text-muted-foreground">Displayed in header and browser tab</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input defaultValue="support@redfinger.store" placeholder="support@example.com" />
                    <p className="text-xs text-muted-foreground">For customer support inquiries</p>
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp Number</Label>
                    <Input defaultValue="+62812345678" placeholder="+62..." />
                    <p className="text-xs text-muted-foreground">For WhatsApp support link</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Redeem Site URL</Label>
                    <Input defaultValue="https://redfinger.com/redeem" placeholder="https://..." />
                    <p className="text-xs text-muted-foreground">URL for customers to redeem codes</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Hero Title</Label>
                  <Input defaultValue="Cloud Phone Solutions for Everyone" placeholder="Main headline" />
                </div>
                <div className="space-y-2">
                  <Label>Hero Description</Label>
                  <Textarea defaultValue="Get premium Redfinger cloud phone services at competitive prices. Perfect for gaming, social media, and more." placeholder="Subheadline text" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Footer Text</Label>
                  <Input defaultValue="© 2024 Redfinger Store. All rights reserved." placeholder="Footer copyright text" />
                </div>
                <div className="flex gap-2">
                  <Button>Save Settings</Button>
                  <Button variant="outline">Reset to Default</Button>
                </div>
                <p className="text-sm text-muted-foreground">Note: Settings will be saved to the database and applied across all pages.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Verify Payment Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Payment</DialogTitle>
            <DialogDescription>Review payment proof and issue redeem codes</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVerifyPayment} className="space-y-4">
            {verifyingOrder?.payment_proof && (
              <div>
                <Label>Payment Proof</Label>
                <a href={verifyingOrder.payment_proof} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm block">View Payment Proof</a>
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={verifyForm.status} onValueChange={(val) => setVerifyForm({ ...verifyForm, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {verifyForm.status === "verified" && (
              <div className="space-y-2">
                <Label>Redeem Codes (one per quantity ordered)</Label>
                {verifyForm.redeem_codes.map((code, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">#{index + 1}</span>
                    <Input value={code} onChange={(e) => { const newCodes = [...verifyForm.redeem_codes]; newCodes[index] = e.target.value; setVerifyForm({ ...verifyForm, redeem_codes: newCodes }); }} placeholder={`Redeem code ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label>Admin Notes</Label>
              <Textarea value={verifyForm.admin_notes} onChange={(e) => setVerifyForm({ ...verifyForm, admin_notes: e.target.value })} placeholder="Optional notes for this verification" />
            </div>
            <Button type="submit" className="w-full">{verifyForm.status === "verified" ? "Verify & Issue Codes" : "Reject Payment"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Management Dialog */}
      {selectedProductForStock && (
        <StockManagement
          product={selectedProductForStock}
          open={stockManagementOpen}
          onOpenChange={setStockManagementOpen}
          onSuccess={fetchProducts}
        />
      )}
    </div>
  );
};

export default Admin;
