import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useFileValidation } from "@/hooks/useFileValidation";
import Navbar from "@/components/Navbar";
import { OrderCard } from "@/components/OrderCard";
import { TicketDialog } from "@/components/TicketDialog";
import { RatingDialog } from "@/components/RatingDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";

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
  products: { name: string; duration_days: number };
  support_tickets: { id: string; status: string } | null;
}

const Transactions = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<{orderId: string, productId: string, productName: string} | null>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { validatePaymentProofFile } = useFileValidation();

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
          products (name, duration_days),
          support_tickets (id, status)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ordersData = (data || []).map((order: any) => ({
        ...order,
        support_tickets: order.support_tickets?.[0] || null
      }));

      setOrders(ordersData);
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

  const handleUploadProof = async () => {
    if (!selectedOrderId || !uploadingFile) return;

    try {
      const validationError = await validatePaymentProofFile(uploadingFile);
      if (validationError) {
        toast({
          title: "Invalid File",
          description: validationError,
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = uploadingFile.name.split(".").pop();
      const fileName = `${user.id}/${selectedOrderId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, uploadingFile);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("orders")
        .update({ payment_proof: fileName })
        .eq("id", selectedOrderId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Payment proof uploaded successfully",
      });

      setUploadDialogOpen(false);
      setUploadingFile(null);
      setSelectedOrderId(null);
      fetchOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload proof",
        variant: "destructive",
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled", payment_status: "rejected" })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Order cancelled",
        description: "Your order has been cancelled successfully",
      });

      fetchOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  const filteredOrders = orders.filter(order =>
    order.products.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.payment_status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
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
              <p className="text-center text-muted-foreground py-12">
                No orders yet. Visit the store to make your first purchase!
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={{
                      ...order,
                      product: order.products,
                      ticket: order.support_tickets
                    }}
                    onUploadProof={(id) => {
                      setSelectedOrderId(id);
                      setUploadDialogOpen(true);
                    }}
                    onCancelOrder={handleCancelOrder}
                    onRate={(orderId, productId, productName) => {
                      setSelectedRating({ orderId, productId, productName });
                      setRatingDialogOpen(true);
                    }}
                    onCreateTicket={(orderId) => {
                      setSelectedOrderId(orderId);
                      setTicketDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Proof Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Payment Proof</DialogTitle>
            <DialogDescription>
              Upload a screenshot or photo of your payment (JPG/PNG only, max 5MB)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="proof">Payment Proof Image</Label>
              <Input
                id="proof"
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => setUploadingFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setUploadDialogOpen(false);
                setUploadingFile(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleUploadProof} disabled={!uploadingFile}>
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Dialog */}
      <TicketDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        orderId={selectedOrderId || undefined}
        onSuccess={fetchOrders}
      />

      {/* Rating Dialog */}
      {selectedRating && (
        <RatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          orderId={selectedRating.orderId}
          productId={selectedRating.productId}
          productName={selectedRating.productName}
          onSuccess={fetchOrders}
        />
      )}
    </div>
  );
};

export default Transactions;
