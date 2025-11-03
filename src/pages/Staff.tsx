import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Package, Star, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import StockManagement from "@/components/StockManagement";
import { StockActivityLog } from "@/components/StockActivityLog";
import { format } from "date-fns";

const Staff = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkStaffAccess();
  }, []);

  const checkStaffAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth/signin");
        return;
      }

      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (role?.role !== 'staff') {
        navigate("/");
        toast({
          title: "Access denied",
          description: "You don't have staff permissions",
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tickets">
              <Ticket className="h-4 w-4 mr-2" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="orders">
              <CheckCircle className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="ratings">
              <Star className="h-4 w-4 mr-2" />
              Ratings
            </TabsTrigger>
            <TabsTrigger value="stock">
              <Package className="h-4 w-4 mr-2" />
              Stock
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets">
            <Card className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>{ticket.subject}</TableCell>
                      <TableCell>{ticket.profiles?.full_name || ticket.profiles?.email}</TableCell>
                      <TableCell>
                        <Badge variant={ticket.status === 'resolved' ? 'default' : 'secondary'}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(ticket.created_at), 'PP')}</TableCell>
                      <TableCell>
                        <Select value={ticket.status} onValueChange={(val) => handleUpdateTicketStatus(ticket.id, val)}>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.filter(o => o.payment_status === 'pending').map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.profiles?.full_name || order.profiles?.email}</TableCell>
                      <TableCell>{order.products?.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{order.payment_status}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(order.created_at), 'PP')}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" onClick={() => handleVerifyPayment(order.id, 'verified')}>
                          Verify
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleVerifyPayment(order.id, 'rejected')}>
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="ratings">
            <Card className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Visible</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ratings.map((rating) => (
                    <TableRow key={rating.id}>
                      <TableCell>{rating.products?.name}</TableCell>
                      <TableCell>{rating.profiles?.full_name}</TableCell>
                      <TableCell>⭐ {rating.rating}</TableCell>
                      <TableCell className="max-w-xs truncate">{rating.review}</TableCell>
                      <TableCell>
                        <Badge variant={rating.is_visible ? 'default' : 'secondary'}>
                          {rating.is_visible ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleToggleRatingVisibility(rating.id, rating.is_visible)}
                        >
                          Toggle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="stock">
            <Card className="p-6">
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
                      <TableCell>${product.price}</TableCell>
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
            </Card>
          </TabsContent>
          <TabsContent value="activity">
            <StockActivityLog />
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
