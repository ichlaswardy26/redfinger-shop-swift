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
import { Input } from "@/components/ui/input";
import { Ticket, Package, Star, CheckCircle, Search, History } from "lucide-react";
import Navbar from "@/components/Navbar";
import StockManagement from "@/components/StockManagement";
import { StockActivityLog } from "@/components/StockActivityLog";
import { format } from "date-fns";
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getSortedRowModel, 
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { DataTablePagination } from "@/components/DataTablePagination";

interface TicketRow {
  id: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
}

interface OrderRow {
  id: string;
  payment_status: string;
  created_at: string;
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

const Staff = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  
  // Table states
  const [ticketSorting, setTicketSorting] = useState<SortingState>([]);
  const [ticketSearch, setTicketSearch] = useState("");
  const [orderSorting, setOrderSorting] = useState<SortingState>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [ratingSorting, setRatingSorting] = useState<SortingState>([]);
  const [ratingSearch, setRatingSearch] = useState("");
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkStaffAccess();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('staff-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_ratings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkStaffAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth/signin");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasStaffOrAdmin = roles?.some(r => r.role === 'staff' || r.role === 'admin');

      if (!hasStaffOrAdmin) {
        navigate("/");
        toast({
          title: "Access denied",
          description: "You don't have staff or admin permissions",
          variant: "destructive",
        });
        return;
      }

      fetchData();
    } catch (error) {
      console.error("Error checking staff access:", error);
      navigate("/");
    }
  };

  const fetchData = async () => {
    try {
      const [ticketsRes, ordersRes, ratingsRes, productsRes] = await Promise.all([
        supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("*, products(name)").order("created_at", { ascending: false }),
        supabase.from("product_ratings").select("*, products(name)").order("created_at", { ascending: false }),
        supabase.from("products").select("*").order("name"),
      ]);

      // Fetch profiles separately
      const allUserIds = [
        ...new Set([
          ...(ticketsRes.data || []).map(t => t.user_id),
          ...(ordersRes.data || []).map(o => o.user_id),
          ...(ratingsRes.data || []).map(r => r.user_id),
        ])
      ];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", allUserIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setTickets((ticketsRes.data || []).map(t => ({ ...t, profiles: profileMap.get(t.user_id) || null })) as any);
      setOrders((ordersRes.data || []).map(o => ({ ...o, profiles: profileMap.get(o.user_id) || null })) as any);
      setRatings((ratingsRes.data || []).map(r => ({ ...r, profiles: profileMap.get(r.user_id) || null })) as any);
      setProducts(productsRes.data || []);
    } catch (error) {
      toast({
        title: "Error loading data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", ticketId);

      if (error) throw error;

      toast({ title: "Ticket updated" });
      fetchData();
    } catch (error) {
      toast({ title: "Error updating ticket", variant: "destructive" });
    }
  };

  const handleVerifyPayment = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: status })
        .eq("id", orderId);

      if (error) throw error;

      toast({ title: "Payment status updated" });
      fetchData();
    } catch (error) {
      toast({ title: "Error updating payment", variant: "destructive" });
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
      fetchData();
    } catch (error) {
      toast({ title: "Error updating rating", variant: "destructive" });
    }
  };

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
      cell: ({ row }) => format(new Date(row.original.created_at), 'PP'),
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

  // Order columns
  const orderColumns: ColumnDef<OrderRow>[] = useMemo(() => [
    {
      id: "user",
      header: "User",
      cell: ({ row }) => row.original.profiles?.full_name || row.original.profiles?.email || "-",
    },
    {
      id: "product",
      header: "Product",
      cell: ({ row }) => row.original.products?.name || "-",
    },
    {
      accessorKey: "payment_status",
      header: "Payment Status",
      cell: ({ row }) => <Badge variant="secondary">{row.original.payment_status}</Badge>,
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => format(new Date(row.original.created_at), 'PP'),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        row.original.payment_status === 'pending' ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleVerifyPayment(row.original.id, 'verified')}>
              Verify
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleVerifyPayment(row.original.id, 'rejected')}>
              Reject
            </Button>
          </div>
        ) : null
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
      cell: ({ row }) => (
        <span className="max-w-xs truncate block">{row.original.review || "-"}</span>
      ),
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
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => handleToggleRatingVisibility(row.original.id, row.original.is_visible)}
        >
          Toggle
        </Button>
      ),
    },
  ], []);

  // Filtered data
  const filteredTickets = useMemo(() => {
    if (!ticketSearch) return tickets;
    return tickets.filter(ticket => 
      ticket.subject.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      ticket.status.toLowerCase().includes(ticketSearch.toLowerCase())
    );
  }, [tickets, ticketSearch]);

  const filteredOrders = useMemo(() => {
    const pendingOrders = orders.filter(o => o.payment_status === 'pending');
    if (!orderSearch) return pendingOrders;
    return pendingOrders.filter(order => 
      order.products?.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.payment_status.toLowerCase().includes(orderSearch.toLowerCase())
    );
  }, [orders, orderSearch]);

  const filteredRatings = useMemo(() => {
    if (!ratingSearch) return ratings;
    return ratings.filter(rating => 
      rating.products?.name?.toLowerCase().includes(ratingSearch.toLowerCase()) ||
      rating.profiles?.full_name?.toLowerCase().includes(ratingSearch.toLowerCase())
    );
  }, [ratings, ratingSearch]);

  // Tables
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

  const orderTable = useReactTable({
    data: filteredOrders,
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting: orderSorting },
    onSortingChange: setOrderSorting,
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
        <div className="container mx-auto p-4">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-lg px-4 py-2">Staff Dashboard</Badge>
        </div>

        <Tabs defaultValue="tickets" className="space-y-4">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-auto min-w-full lg:grid lg:grid-cols-5">
              <TabsTrigger value="tickets" className="flex-shrink-0">
                <Ticket className="h-4 w-4 mr-2" />
                <span>Tickets</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex-shrink-0">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>Orders</span>
              </TabsTrigger>
              <TabsTrigger value="ratings" className="flex-shrink-0">
                <Star className="h-4 w-4 mr-2" />
                <span>Ratings</span>
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex-shrink-0">
                <Package className="h-4 w-4 mr-2" />
                <span>Stock</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-shrink-0">
                <History className="h-4 w-4 mr-2" />
                <span>Activity</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>Manage customer support requests</CardDescription>
                <div className="flex items-center gap-2 mt-4">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {ticketTable.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <TableHead key={header.id}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {ticketTable.getRowModel().rows.length ? (
                        ticketTable.getRowModel().rows.map(row => (
                          <TableRow key={row.id}>
                            {row.getVisibleCells().map(cell => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={ticketColumns.length} className="text-center">
                            No tickets found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <DataTablePagination table={ticketTable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Pending Orders</CardTitle>
                <CardDescription>Verify payments for pending orders</CardDescription>
                <div className="flex items-center gap-2 mt-4">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {orderTable.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <TableHead key={header.id}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {orderTable.getRowModel().rows.length ? (
                        orderTable.getRowModel().rows.map(row => (
                          <TableRow key={row.id}>
                            {row.getVisibleCells().map(cell => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={orderColumns.length} className="text-center">
                            No pending orders
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
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
                <div className="flex items-center gap-2 mt-4">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search ratings..."
                    value={ratingSearch}
                    onChange={(e) => setRatingSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {ratingTable.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <TableHead key={header.id}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {ratingTable.getRowModel().rows.length ? (
                        ratingTable.getRowModel().rows.map(row => (
                          <TableRow key={row.id}>
                            {row.getVisibleCells().map(cell => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={ratingColumns.length} className="text-center">
                            No ratings found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <DataTablePagination table={ratingTable} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <CardTitle>Stock Management</CardTitle>
                <CardDescription>Update product inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <Card key={product.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Current Stock: <span className={product.stock < 10 ? "text-destructive font-bold" : ""}>{product.stock}</span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setStockDialogOpen(true);
                          }}
                        >
                          Update
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <StockActivityLog />
          </TabsContent>
        </Tabs>
      </div>

      {selectedProduct && (
        <StockManagement
          product={selectedProduct}
          open={stockDialogOpen}
          onOpenChange={setStockDialogOpen}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default Staff;
