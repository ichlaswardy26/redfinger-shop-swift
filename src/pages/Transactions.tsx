import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Order {
  id: string;
  product_id: string;
  redeem_code: string | null;
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
  const [uploading, setUploading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth/signin");
      return;
    }
    fetchOrders();
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          products(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ordersWithProducts = data.map((order: any) => ({
        ...order,
        product_name: order.products?.name || "Unknown Product",
      }));

      setOrders(ordersWithProducts);
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
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${orderId}-${Date.now()}.${fileExt}`;

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
      setSelectedOrder(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload proof",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      verified: "default",
      rejected: "destructive",
      active: "default",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>My Transactions</CardTitle>
            <CardDescription>View and manage your orders</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : orders.length === 0 ? (
              <p className="text-center text-muted-foreground">No orders yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Redeem Code</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.product_name}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(order.payment_status)}</TableCell>
                      <TableCell>
                        {order.redeem_code ? (
                          <code className="bg-muted px-2 py-1 rounded text-sm">{order.redeem_code}</code>
                        ) : (
                          <span className="text-muted-foreground text-sm">Awaiting verification</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.payment_status === "pending" && !order.payment_proof && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order.id)}>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Proof
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Upload Payment Proof</DialogTitle>
                                <DialogDescription>
                                  Upload screenshot or photo of your bank transfer
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
                                        handleUploadProof(order.id, file);
                                      }
                                    }}
                                    disabled={uploading}
                                  />
                                </div>
                                {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {order.payment_proof && order.payment_status === "pending" && (
                          <Badge variant="outline">
                            <FileText className="h-3 w-3 mr-1" />
                            Proof Submitted
                          </Badge>
                        )}
                        {order.admin_notes && (
                          <p className="text-xs text-muted-foreground mt-1">Note: {order.admin_notes}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transactions;
