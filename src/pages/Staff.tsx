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
  ColumnFiltersState,
} from "@tanstack/react-table";
import { DataTablePagination } from "@/components/DataTablePagination";

const Staff = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  
  // Table states
  const [ticketSorting, setTicketSorting] = useState<SortingState>([]);
  const [ticketFilters, setTicketFilters] = useState<ColumnFiltersState>([]);
  const [ticketSearch, setTicketSearch] = useState("");
  const [orderSorting, setOrderSorting] = useState<SortingState>([]);
  const [orderFilters, setOrderFilters] = useState<ColumnFiltersState>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [ratingSorting, setRatingSorting] = useState<SortingState>([]);
  const [ratingFilters, setRatingFilters] = useState<ColumnFiltersState>([]);
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
        supabase.from("support_tickets").select("*, profiles(full_name, email)").order("created_at", { ascending: false }),
        supabase.from("orders").select("*, products(name), profiles(full_name, email)").order("created_at", { ascending: false }),
        supabase.from("product_ratings").select("*, products(name), profiles(full_name)").order("created_at", { ascending: false }),
        supabase.from("products").select("*").order("name"),
      ]);

      setTickets(ticketsRes.data || []);
      setOrders(ordersRes.data || []);
      setRatings(ratingsRes.data || []);
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
  const ticketColumns: ColumnDef<any>[] = useMemo(() => [
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
      accessorKey: "profiles.full_name",
      header: "User",
      cell: ({ row }) => row.original.profiles?.full_name || row.original.profiles?.email,
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
  const orderColumns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "profiles.full_name",
      header: "User",
      cell: ({ row }) => row.original.profiles?.full_name || row.original.profiles?.email,
    },
    {
      accessorKey: "products.name",
      header: "Product",
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
  const ratingColumns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "products.name",
      header: "Product",
    },
    {
      accessorKey: "profiles.full_name",
      header: "User",
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => `⭐ ${row.original.rating}`,
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
    if (!orderSearch) return orders;
    return orders.filter(order => 
      order.products?.name.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.payment_status.toLowerCase().includes(orderSearch.toLowerCase())
    );
  }, [orders, orderSearch]);

  const filteredRatings = useMemo(() => {
    if (!ratingSearch) return ratings;
    return ratings.filter(rating => 
      rating.products?.name.toLowerCase().includes(ratingSearch.toLowerCase()) ||
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
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting: ticketSorting, columnFilters: ticketFilters },
    onSortingChange: setTicketSorting,
    onColumnFiltersChange: setTicketFilters,
  });

  const orderTable = useReactTable({
    data: filteredOrders.filter(o => o.payment_status === 'pending'),
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting: orderSorting, columnFilters: orderFilters },
    onSortingChange: setOrderSorting,
    onColumnFiltersChange: setOrderFilters,
  });

  const ratingTable = useReactTable({
    data: filteredRatings,
    columns: ratingColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting: ratingSorting, columnFilters: ratingFilters },
    onSortingChange: setRatingSorting,
    onColumnFiltersChange: setRatingFilters,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Navbar />
        <div className="container mx-auto p-4">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
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
                <CardDescription>Manage product ratings and reviews</CardDescription>
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
                <CardDescription>Manage product inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>
                          <Badge variant={product.stock < 10 ? 'destructive' : 'default'}>
                            {product.stock}
                          </Badge>
                        </TableCell>
                        <TableCell>Rp {product.price.toLocaleString('id-ID')}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(product);
                              setStockDialogOpen(true);
                            }}
                          >
                            Manage Stock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity">
            <StockActivityLog />
          </TabsContent>
        </Tabs>
      </div>

      <StockManagement
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        product={selectedProduct}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default Staff;
