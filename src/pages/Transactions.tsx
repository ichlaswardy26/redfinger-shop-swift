import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink, Search } from "lucide-react";
import CopyButton from "@/components/CopyButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, flexRender, ColumnDef, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { DataTablePagination } from "@/components/DataTablePagination";

interface Order {
  id: string;
  product_id: string;
  redeem_codes: string[] | null;
  quantity: number;
  status: string;
  payment_status: string;
  payment_proof: string | null;
  expires_at: string;
  created_at: string;
  product_name: string;
  admin_notes: string | null;
}

const Transactions = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchOrders();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth/signin");
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          products (name)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedOrders: Order[] = (data || []).map((order: any) => ({
        ...order,
        product_name: order.products?.name || "Unknown Product",
      }));

      setOrders(formattedOrders);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProof = async (orderId: string, file: File) => {
    try {
      setUploadingId(orderId);

      const fileExt = file.name.split(".").pop();
      const fileName = `${orderId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("orders")
        .update({ payment_proof: publicUrl })
        .eq("id", orderId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Payment proof uploaded successfully",
      });

      fetchOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload proof",
        variant: "destructive",
      });
    } finally {
      setUploadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      verified: "default",
      pending: "outline",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const columns: ColumnDef<Order>[] = useMemo(() => [
    {
      accessorKey: "product_name",
      header: "Product",
    },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }) => <span className="font-medium">{row.original.quantity}</span>,
    },
    {
      accessorKey: "created_at",
      header: "Order Date",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      accessorKey: "payment_status",
      header: "Payment Status",
      cell: ({ row }) => getStatusBadge(row.original.payment_status),
    },
    {
      id: "payment_proof",
      header: "Payment Proof",
      cell: ({ row }) => (
        <div className="space-y-2">
          {row.original.payment_proof ? (
            <a
              href={row.original.payment_proof}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1 text-sm"
            >
              <ExternalLink className="h-3 w-3" />
              View Proof
            </a>
          ) : row.original.payment_status === "pending" ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Upload Proof</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Payment Proof</DialogTitle>
                  <DialogDescription>
                    Upload a screenshot or photo of your payment
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="proof">Payment Proof Image</Label>
                    <Input
                      id="proof"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadProof(row.original.id, file);
                        }
                      }}
                      disabled={uploadingId === row.original.id}
                    />
                  </div>
                  {uploadingId === row.original.id && (
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      ),
    },
    {
      id: "redeem_codes",
      header: "Redeem Codes",
      cell: ({ row }) => {
        if (row.original.payment_status === "verified" && row.original.redeem_codes) {
          return (
            <div className="flex flex-col gap-2">
              {row.original.redeem_codes.map((code, index) => (
                <div key={index} className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{code}</code>
                  <CopyButton text={code} label="" />
                </div>
              ))}
            </div>
          );
        }
        if (row.original.payment_status === "rejected") {
          return <Badge variant="destructive">Order Rejected</Badge>;
        }
        return <span className="text-muted-foreground text-sm">Pending verification</span>;
      },
    },
    {
      id: "notes",
      header: "Notes",
      cell: ({ row }) => (
        row.original.admin_notes ? (
          <p className="text-xs text-muted-foreground max-w-xs">
            {row.original.admin_notes}
          </p>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )
      ),
    },
  ], [uploadingId]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    return orders.filter(order =>
      order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.payment_status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  const table = useReactTable({
    data: filteredOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
            <CardDescription>View and manage your orders</CardDescription>
            <div className="flex items-center gap-2 mt-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No orders yet. Visit the store to make your first purchase!
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map(headerGroup => (
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
                      {table.getRowModel().rows.length ? (
                        table.getRowModel().rows.map(row => (
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
                          <TableCell colSpan={columns.length} className="text-center">
                            No orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <DataTablePagination table={table} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transactions;
