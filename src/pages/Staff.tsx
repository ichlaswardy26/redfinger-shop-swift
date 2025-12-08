import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ticket, Package, Star, CheckCircle, History, MessageSquare, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import StockManagement from "@/components/StockManagement";
import { StockActivityLog } from "@/components/StockActivityLog";
import { TicketConversation } from "@/components/TicketConversation";
import { FilePreview } from "@/components/FilePreview";
import { DataTableFilters } from "@/components/DataTableFilters";
import { OrderVerificationDialog } from "@/components/OrderVerificationDialog";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/exportUtils";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, flexRender, ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTablePagination } from "@/components/DataTablePagination";

interface TicketRow {
  id: string;
  subject: string;
  description: string;
  status: string;
  image_proof: string | null;
  user_id: string;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
}

interface OrderRow {
  id: string;
  quantity: number;
  payment_status: string;
  payment_proof: string | null;
  created_at: string;
  product_id: string;
  profiles: { full_name: string | null; email: string } | null;
  products: { name: string } | null;
}

interface RatingRow {
  id: string;
  rating: number;
  review: string | null;
  is_visible: boolean;
  products: { name: string } | null;
  profiles: { full_name: string | null } | null;
}

const getTicketStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-green-500 text-white';
    case 'in_progress': return 'bg-yellow-500 text-white';
    case 'resolved': return 'bg-blue-500 text-white';
    case 'closed': return 'bg-gray-500 text-white';
    default: return 'bg-gray-400 text-white';
  }
};

const Staff = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [verifyingOrder, setVerifyingOrder] = useState<OrderRow | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  
  // Filters
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [ratingSearch, setRatingSearch] = useState("");
  const [ratingVisibleFilter, setRatingVisibleFilter] = useState("all");
  
  const [ticketSorting, setTicketSorting] = useState<SortingState>([]);
  const [orderSorting, setOrderSorting] = useState<SortingState>([]);
  const [ratingSorting, setRatingSorting] = useState<SortingState>([]);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkStaffAccess();
    const channel = supabase
      .channel('staff-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_ratings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkStaffAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth/signin"); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some(r => r.role === 'staff' || r.role === 'admin')) {
      navigate("/"); toast({ title: "Access denied", variant: "destructive" }); return;
    }
    fetchData();
  };

  const fetchData = async () => {
    try {
      const [ticketsRes, ordersRes, ratingsRes, productsRes] = await Promise.all([
        supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("*, products(name)").order("created_at", { ascending: false }),
        supabase.from("product_ratings").select("*, products(name)").order("created_at", { ascending: false }),
        supabase.from("products").select("*").order("name"),
      ]);
      const allUserIds = [...new Set([
        ...(ticketsRes.data || []).map(t => t.user_id),
        ...(ordersRes.data || []).map(o => o.user_id),
        ...(ratingsRes.data || []).map(r => r.user_id),
      ])];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", allUserIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setTickets((ticketsRes.data || []).map(t => ({ ...t, profiles: profileMap.get(t.user_id) || null })) as any);
      setOrders((ordersRes.data || []).map(o => ({ ...o, profiles: profileMap.get(o.user_id) || null })) as any);
      setRatings((ratingsRes.data || []).map(r => ({ ...r, profiles: profileMap.get(r.user_id) || null })) as any);
      setProducts(productsRes.data || []);
    } catch { toast({ title: "Error loading data", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", ticketId);
    if (error) { toast({ title: "Error updating ticket", variant: "destructive" }); return; }
    toast({ title: "Ticket updated" }); fetchData();
  };

  const handleVerifyOrder = async (orderId: string, redeemCodes: string[], adminNotes: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const product = products.find(p => p.id === order.product_id);
    const { error } = await supabase.from("orders").update({
      payment_status: "verified", status: "active", redeem_codes: redeemCodes, admin_notes: adminNotes, verified_at: new Date().toISOString()
    }).eq("id", orderId);
    if (error) { toast({ title: "Error verifying", variant: "destructive" }); return; }
    if (product) {
      await supabase.from("products").update({ stock: Math.max(0, product.stock - order.quantity) }).eq("id", product.id);
    }
    toast({ title: "Order verified" }); fetchData();
  };

  const handleRejectOrder = async (orderId: string, reason: string) => {
    const { error } = await supabase.from("orders").update({
      payment_status: "rejected", status: "rejected", admin_notes: reason
    }).eq("id", orderId);
    if (error) { toast({ title: "Error rejecting", variant: "destructive" }); return; }
    toast({ title: "Order rejected" }); fetchData();
  };

  const handleToggleRatingVisibility = async (ratingId: string, isVisible: boolean) => {
    const { error } = await supabase.from("product_ratings").update({ is_visible: !isVisible }).eq("id", ratingId);
    if (error) { toast({ title: "Error updating rating", variant: "destructive" }); return; }
    toast({ title: "Rating visibility updated" }); fetchData();
  };

  // Filtered data
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch = t.subject.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.profiles?.full_name?.toLowerCase().includes(ticketSearch.toLowerCase()) || 
        t.profiles?.email?.toLowerCase().includes(ticketSearch.toLowerCase());
      const matchesStatus = ticketStatusFilter === 'all' || t.status === ticketStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tickets, ticketSearch, ticketStatusFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.products?.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.profiles?.full_name?.toLowerCase().includes(orderSearch.toLowerCase());
      const matchesStatus = orderStatusFilter === 'all' || o.payment_status === orderStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredRatings = useMemo(() => {
    return ratings.filter(r => {
      const matchesSearch = r.products?.name?.toLowerCase().includes(ratingSearch.toLowerCase()) ||
        r.profiles?.full_name?.toLowerCase().includes(ratingSearch.toLowerCase());
      const matchesVisible = ratingVisibleFilter === 'all' || 
        (ratingVisibleFilter === 'visible' && r.is_visible) ||
        (ratingVisibleFilter === 'hidden' && !r.is_visible);
      return matchesSearch && matchesVisible;
    });
  }, [ratings, ratingSearch, ratingVisibleFilter]);

  // Export handlers
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
    ], "staff_tickets");
  };

  const exportOrders = () => {
    exportToCSV(filteredOrders.map(o => ({
      ...o,
      product_name: o.products?.name || '',
      user_name: o.profiles?.full_name || '',
      user_email: o.profiles?.email || ''
    })), [
      { key: "user_name", header: "Customer" },
      { key: "user_email", header: "Email" },
      { key: "product_name", header: "Product" },
      { key: "quantity", header: "Quantity" },
      { key: "payment_status", header: "Payment Status" },
      { key: "created_at", header: "Created At" },
    ], "staff_orders");
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
    ], "staff_ratings");
  };

  const ticketColumns: ColumnDef<TicketRow>[] = useMemo(() => [
    { accessorKey: "subject", header: "Subject", cell: ({ row }) => (
      <div className="cursor-pointer hover:text-primary" onClick={() => { setSelectedTicket(row.original); setTicketDialogOpen(true); }}>
        <p className="font-medium">{row.original.subject}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</p>
      </div>
    )},
    { id: "user", header: "User", cell: ({ row }) => row.original.profiles?.full_name || row.original.profiles?.email || "-" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => (
      <Badge className={getTicketStatusColor(row.original.status)}>{row.original.status.replace("_", " ")}</Badge>
    )},
    { accessorKey: "created_at", header: "Created", cell: ({ row }) => format(new Date(row.original.created_at), 'PP') },
    { id: "attachment", header: "Attachment", cell: ({ row }) => row.original.image_proof ? (
      <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${row.original.image_proof}`} target="_blank" className="text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" />View</a>
    ) : "-" },
    { id: "actions", header: "Action", cell: ({ row }) => (
      <Select value={row.original.status} onValueChange={(val) => handleUpdateTicketStatus(row.original.id, val)}>
        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>
    )},
  ], []);

  const orderColumns: ColumnDef<OrderRow>[] = useMemo(() => [
    { id: "user", header: "User", cell: ({ row }) => row.original.profiles?.full_name || row.original.profiles?.email || "-" },
    { id: "product", header: "Product", cell: ({ row }) => row.original.products?.name || "-" },
    { accessorKey: "quantity", header: "Qty" },
    { accessorKey: "payment_status", header: "Status", cell: ({ row }) => (
      <Badge variant={row.original.payment_status === 'verified' ? 'default' : row.original.payment_status === 'rejected' ? 'destructive' : 'secondary'}>{row.original.payment_status}</Badge>
    )},
    { accessorKey: "created_at", header: "Date", cell: ({ row }) => format(new Date(row.original.created_at), 'PP') },
    { id: "proof", header: "Proof", cell: ({ row }) => row.original.payment_proof ? (
      <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${row.original.payment_proof}`} target="_blank" className="text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" />View</a>
    ) : "-" },
    { id: "actions", header: "Action", cell: ({ row }) => row.original.payment_status === 'pending' && (
      <Button size="sm" onClick={() => { setVerifyingOrder(row.original); setVerifyDialogOpen(true); }}>Verify</Button>
    )},
  ], []);

  const ratingColumns: ColumnDef<RatingRow>[] = useMemo(() => [
    { id: "product", header: "Product", cell: ({ row }) => row.original.products?.name || "-" },
    { id: "user", header: "User", cell: ({ row }) => row.original.profiles?.full_name || "-" },
    { accessorKey: "rating", header: "Rating", cell: ({ row }) => <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span>{row.original.rating}</span></div> },
    { accessorKey: "review", header: "Review", cell: ({ row }) => <span className="max-w-xs truncate block">{row.original.review || "-"}</span> },
    { accessorKey: "is_visible", header: "Visible", cell: ({ row }) => <Badge variant={row.original.is_visible ? 'default' : 'secondary'}>{row.original.is_visible ? 'Yes' : 'No'}</Badge> },
    { id: "actions", header: "Action", cell: ({ row }) => <Button size="sm" variant="outline" onClick={() => handleToggleRatingVisibility(row.original.id, row.original.is_visible)}>Toggle</Button> },
  ], []);

  const ticketTable = useReactTable({ data: filteredTickets, columns: ticketColumns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel(), state: { sorting: ticketSorting }, onSortingChange: setTicketSorting, initialState: { pagination: { pageSize: 10 } } });
  const orderTable = useReactTable({ data: filteredOrders, columns: orderColumns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel(), state: { sorting: orderSorting }, onSortingChange: setOrderSorting, initialState: { pagination: { pageSize: 10 } } });
  const ratingTable = useReactTable({ data: filteredRatings, columns: ratingColumns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel(), state: { sorting: ratingSorting }, onSortingChange: setRatingSorting, initialState: { pagination: { pageSize: 10 } } });

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto p-4">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-4 space-y-6">
        <Badge variant="secondary" className="text-lg px-4 py-2">Staff Dashboard</Badge>
        <Tabs defaultValue="tickets" className="space-y-4">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-auto min-w-full lg:grid lg:grid-cols-5">
              <TabsTrigger value="tickets"><Ticket className="h-4 w-4 mr-2" />Tickets</TabsTrigger>
              <TabsTrigger value="orders"><CheckCircle className="h-4 w-4 mr-2" />Orders</TabsTrigger>
              <TabsTrigger value="ratings"><Star className="h-4 w-4 mr-2" />Ratings</TabsTrigger>
              <TabsTrigger value="stock"><Package className="h-4 w-4 mr-2" />Stock</TabsTrigger>
              <TabsTrigger value="activity"><History className="h-4 w-4 mr-2" />Activity</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>Manage customer support requests</CardDescription>
                <DataTableFilters searchValue={ticketSearch} onSearchChange={setTicketSearch} searchPlaceholder="Search tickets..."
                  filters={[{ key: 'status', label: 'Status', value: ticketStatusFilter, options: [{ label: 'Open', value: 'open' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Resolved', value: 'resolved' }, { label: 'Closed', value: 'closed' }], onChange: setTicketStatusFilter }]}
                  onReset={() => { setTicketSearch(""); setTicketStatusFilter("all"); }}
                  onExport={exportTickets} />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>{ticketTable.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                    <TableBody>{ticketTable.getRowModel().rows.length ? ticketTable.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={ticketColumns.length} className="text-center">No tickets found</TableCell></TableRow>}</TableBody>
                  </Table>
                </div>
                <DataTablePagination table={ticketTable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order Verification</CardTitle>
                <CardDescription>Verify payments and issue redeem codes</CardDescription>
                <DataTableFilters searchValue={orderSearch} onSearchChange={setOrderSearch} searchPlaceholder="Search orders..."
                  filters={[{ key: 'status', label: 'Status', value: orderStatusFilter, options: [{ label: 'Pending', value: 'pending' }, { label: 'Verified', value: 'verified' }, { label: 'Rejected', value: 'rejected' }], onChange: setOrderStatusFilter }]}
                  onReset={() => { setOrderSearch(""); setOrderStatusFilter("all"); }}
                  onExport={exportOrders} />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>{orderTable.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                    <TableBody>{orderTable.getRowModel().rows.length ? orderTable.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={orderColumns.length} className="text-center">No orders found</TableCell></TableRow>}</TableBody>
                  </Table>
                </div>
                <DataTablePagination table={orderTable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ratings">
            <Card>
              <CardHeader>
                <CardTitle>Product Ratings</CardTitle>
                <CardDescription>Manage product reviews visibility</CardDescription>
                <DataTableFilters searchValue={ratingSearch} onSearchChange={setRatingSearch} searchPlaceholder="Search ratings..."
                  filters={[{ key: 'visible', label: 'Visibility', value: ratingVisibleFilter, options: [{ label: 'Visible', value: 'visible' }, { label: 'Hidden', value: 'hidden' }], onChange: setRatingVisibleFilter }]}
                  onReset={() => { setRatingSearch(""); setRatingVisibleFilter("all"); }}
                  onExport={exportRatings} />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>{ratingTable.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                    <TableBody>{ratingTable.getRowModel().rows.length ? ratingTable.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={ratingColumns.length} className="text-center">No ratings found</TableCell></TableRow>}</TableBody>
                  </Table>
                </div>
                <DataTablePagination table={ratingTable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock">
            <Card>
              <CardHeader><CardTitle>Stock Management</CardTitle><CardDescription>Manage product inventory</CardDescription></CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {products.map(p => (
                    <Card key={p.id} className="cursor-pointer hover:border-primary" onClick={() => { setSelectedProduct(p); setStockDialogOpen(true); }}>
                      <CardContent className="p-4"><p className="font-medium">{p.name}</p><Badge variant={p.stock > 10 ? 'default' : p.stock > 0 ? 'secondary' : 'destructive'}>{p.stock} in stock</Badge></CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity"><StockActivityLog /></TabsContent>
        </Tabs>
      </div>

      {selectedProduct && <StockManagement product={selectedProduct} open={stockDialogOpen} onOpenChange={setStockDialogOpen} onSuccess={fetchData} />}
      
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />{selectedTicket?.subject}</DialogTitle></DialogHeader>
          {selectedTicket && <TicketConversation ticketId={selectedTicket.id} ticketStatus={selectedTicket.status} ticketOwnerId={selectedTicket.user_id} imageProof={selectedTicket.image_proof} viewerRole="staff" />}
        </DialogContent>
      </Dialog>

      <OrderVerificationDialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen} 
        order={verifyingOrder ? { ...verifyingOrder, product_name: verifyingOrder.products?.name, customer_name: verifyingOrder.profiles?.full_name || '', customer_email: verifyingOrder.profiles?.email || '' } : null}
        onVerify={handleVerifyOrder} onReject={handleRejectOrder} />
    </div>
  );
};

export default Staff;