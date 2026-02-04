import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useNavigate } from "react-router-dom";
import { useFileValidation } from "@/hooks/useFileValidation";
import Navbar from "@/components/Navbar";
import { SEOHead } from "@/components/SEOHead";
import { OrderCard } from "@/components/OrderCard";
import { TicketDialog } from "@/components/TicketDialog";
import { RatingDialog } from "@/components/RatingDialog";
import { TicketConversation } from "@/components/TicketConversation";
import { FilePreview } from "@/components/FilePreview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MotionPage, MotionContainer, motion } from "@/components/ui/motion";

interface Order {
  id: string;
  product_id: string;
  redeem_codes: string[] | null;
  quantity: number;
  status: string;
  payment_status: string;
  payment_proof: string | null;
  payment_method: string | null;
  gateway_trx_id: string | null;
  qr_link: string | null;
  payment_url: string | null;
  gateway_expired_at: string | null;
  expires_at: string;
  created_at: string;
  products: { name: string; duration_days: number; price: number };
  support_tickets: { id: string; status: string } | null;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  image_proof: string | null;
  created_at: string;
  resolved_at: string | null;
  user_id: string;
}

const ITEMS_PER_PAGE = 6;
const TICKETS_PER_PAGE = 5;

const getTicketStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'in_progress': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'closed': return 'bg-muted text-muted-foreground';
    default: return '';
  }
};

const Transactions = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<{orderId: string, productId: string, productName: string} | null>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  
  // Ticket conversation
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketConversationOpen, setTicketConversationOpen] = useState(false);
  
  // Pagination states
  const [orderPage, setOrderPage] = useState(1);
  const [ticketPage, setTicketPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(ITEMS_PER_PAGE);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { validatePaymentProofFile } = useFileValidation();
  const { settings: siteSettings } = useSiteSettings();

  useEffect(() => {
    checkAuth();
    fetchOrders();
    fetchTickets();

    const channel = supabase
      .channel('customer-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchTickets)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth/signin");
    }
  };

  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({ title: "Error", description: "Failed to load support tickets", variant: "destructive" });
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("orders")
        .select(`*, products (name, duration_days, price), support_tickets (id, status)`)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ordersData = (data || []).map((order: any) => ({
        ...order,
        support_tickets: order.support_tickets?.[0] || null
      }));

      setOrders(ordersData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProof = async () => {
    if (!selectedOrderId || !uploadingFile) return;

    try {
      const validationError = await validatePaymentProofFile(uploadingFile);
      if (validationError) {
        toast({ title: "Invalid File", description: validationError, variant: "destructive" });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = uploadingFile.name.split(".").pop();
      const fileName = `${user.id}/${selectedOrderId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(fileName, uploadingFile);
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase.from("orders").update({ payment_proof: fileName }).eq("id", selectedOrderId);
      if (updateError) throw updateError;

      toast({ title: "Success", description: "Payment proof uploaded successfully" });
      setUploadDialogOpen(false);
      setUploadingFile(null);
      setSelectedOrderId(null);
      fetchOrders();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to upload proof", variant: "destructive" });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
      const { error } = await supabase.from("orders").update({ status: "cancelled", payment_status: "rejected" }).eq("id", orderId);
      if (error) throw error;
      toast({ title: "Order cancelled", description: "Your order has been cancelled successfully" });
      fetchOrders();
    } catch (error) {
      toast({ title: "Error", description: "Failed to cancel order", variant: "destructive" });
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order =>
      order.products.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.payment_status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  const totalOrderPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * ordersPerPage;
    return filteredOrders.slice(start, start + ordersPerPage);
  }, [filteredOrders, orderPage, ordersPerPage]);

  const totalTicketPages = Math.ceil(tickets.length / TICKETS_PER_PAGE);
  const paginatedTickets = useMemo(() => {
    const start = (ticketPage - 1) * TICKETS_PER_PAGE;
    return tickets.slice(start, start + TICKETS_PER_PAGE);
  }, [tickets, ticketPage]);

  useEffect(() => {
    setOrderPage(1);
  }, [searchQuery]);

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
    <MotionPage className="min-h-screen bg-background">
      <SEOHead title={`My Orders - ${siteSettings.name}`} siteName={siteSettings.name} noIndex />
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-8"
        >
          My Dashboard
        </motion.h1>
        
        {/* Support Tickets Section */}
        {tickets.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                My Support Tickets
              </CardTitle>
              <CardDescription>View and track your support requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedTickets.map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{ticket.subject}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={getTicketStatusColor(ticket.status)}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setSelectedTicket(ticket); setTicketConversationOpen(true); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                      {ticket.resolved_at && <span>Resolved: {new Date(ticket.resolved_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
              
              {totalTicketPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Page {ticketPage} of {totalTicketPages} ({tickets.length} tickets)</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setTicketPage(p => Math.max(1, p - 1))} disabled={ticketPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setTicketPage(p => Math.min(totalTicketPages, p + 1))} disabled={ticketPage === totalTicketPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
            <CardDescription>View and manage your orders</CardDescription>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by product or status..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-sm" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={ordersPerPage.toString()} onValueChange={(val) => { setOrdersPerPage(Number(val)); setOrderPage(1); }}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No orders yet. Visit the store to make your first purchase!</p>
            ) : filteredOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No orders match your search.</p>
            ) : (
              <>
                <MotionContainer className="grid md:grid-cols-2 gap-4">
                  {paginatedOrders.map((order, index) => (
                    <OrderCard
                      key={order.id}
                      order={{ 
                        ...order, 
                        product_id: order.product_id, 
                        product: order.products, 
                        ticket: order.support_tickets,
                        payment_method: order.payment_method,
                        gateway_trx_id: order.gateway_trx_id,
                        qr_link: order.qr_link,
                        payment_url: order.payment_url,
                        gateway_expired_at: order.gateway_expired_at,
                      }}
                      onUploadProof={(id) => { setSelectedOrderId(id); setUploadDialogOpen(true); }}
                      onCancelOrder={handleCancelOrder}
                      onRate={(orderId, productId, productName) => { setSelectedRating({ orderId, productId, productName }); setRatingDialogOpen(true); }}
                      onCreateTicket={(orderId) => { setSelectedOrderId(orderId); setTicketDialogOpen(true); }}
                      onOrderUpdated={fetchOrders}
                    />
                  ))}
                </MotionContainer>

                {totalOrderPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t gap-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((orderPage - 1) * ordersPerPage) + 1} - {Math.min(orderPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setOrderPage(1)} disabled={orderPage === 1}>First</Button>
                      <Button variant="outline" size="sm" onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm px-2">Page {orderPage} of {totalOrderPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))} disabled={orderPage === totalOrderPages}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setOrderPage(totalOrderPages)} disabled={orderPage === totalOrderPages}>Last</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Proof Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Payment Proof</DialogTitle>
            <DialogDescription>Upload a screenshot or photo of your payment (JPG/PNG only, max 5MB)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="proof">Payment Proof Image</Label>
              <Input id="proof" type="file" accept="image/jpeg,image/jpg,image/png" onChange={(e) => setUploadingFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleUploadProof} disabled={!uploadingFile} className="w-full">Upload Proof</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Dialog */}
      <TicketDialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen} orderId={selectedOrderId || undefined} onSuccess={fetchTickets} />

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

      {/* Ticket Conversation Dialog */}
      {selectedTicket && (
        <Dialog open={ticketConversationOpen} onOpenChange={setTicketConversationOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTicket.subject}</DialogTitle>
              <DialogDescription>
                <Badge className={getTicketStatusColor(selectedTicket.status)}>{selectedTicket.status.replace("_", " ")}</Badge>
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
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </MotionPage>
  );
};

export default Transactions;