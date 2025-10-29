import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
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
import { ShoppingCart, Users, Package, TrendingUp, CheckCircle, XCircle, Clock } from "lucide-react";

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
  redeem_code: string | null;
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
  roles: string[];
}

interface Stats {
  totalOrders: number;
  pendingPayments: number;
  totalRevenue: number;
  totalUsers: number;
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, pendingPayments: 0, totalRevenue: 0, totalUsers: 0 });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [verifyingOrder, setVerifyingOrder] = useState<Order | null>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", duration_days: "", stock: "" });
  const [verifyForm, setVerifyForm] = useState({ redeem_code: "", admin_notes: "", status: "verified" });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/signin");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      await Promise.all([fetchProducts(), fetchOrders(), fetchUsers(), fetchStats()]);
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

    if (!error) setProducts(data || []);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        products(name)
      `)
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

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        duration_days: parseInt(productForm.duration_days),
        stock: parseInt(productForm.stock),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
        toast({ title: "Product created successfully" });
      }

      setProductForm({ name: "", description: "", price: "", duration_days: "", stock: "" });
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

      if (verifyForm.status === "verified" && verifyForm.redeem_code) {
        updateData.redeem_code = verifyForm.redeem_code;
        updateData.status = "active";

        const product = products.find(p => p.id === verifyingOrder.product_id);
        if (product) {
          await supabase
            .from("products")
            .update({ stock: Math.max(0, product.stock - 1) })
            .eq("id", product.id);
        }
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", verifyingOrder.id);

      if (error) throw error;

      toast({ title: "Payment verification updated" });
      setVerifyingOrder(null);
      setVerifyForm({ redeem_code: "", admin_notes: "", status: "verified" });
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

  const handleToggleRole = async (userId: string, role: "admin" | "user", hasRole: boolean) => {
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingPayments}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Verified Orders</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRevenue}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest orders and transactions</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>Verify payments and issue redeem codes</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Redeem Code</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{order.product_name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.payment_status === "verified" ? "default" :
                            order.payment_status === "rejected" ? "destructive" : "outline"
                          }>
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.redeem_code ? (
                            <code className="text-xs">{order.redeem_code}</code>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {order.payment_status === "pending" && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setVerifyingOrder(order);
                                    setVerifyForm({
                                      redeem_code: `RF-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                                      admin_notes: "",
                                      status: "verified",
                                    });
                                  }}
                                >
                                  Verify
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Verify Payment</DialogTitle>
                                  <DialogDescription>
                                    Review payment proof and issue redeem code
                                  </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleVerifyPayment} className="space-y-4">
                                  {order.payment_proof && (
                                    <div>
                                      <Label>Payment Proof</Label>
                                      <a
                                        href={order.payment_proof}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline text-sm block"
                                      >
                                        View Payment Proof
                                      </a>
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <Label>Decision</Label>
                                    <Select
                                      value={verifyForm.status}
                                      onValueChange={(value) =>
                                        setVerifyForm({ ...verifyForm, status: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="verified">Verified</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {verifyForm.status === "verified" && (
                                    <div className="space-y-2">
                                      <Label>Redeem Code</Label>
                                      <Input
                                        value={verifyForm.redeem_code}
                                        onChange={(e) =>
                                          setVerifyForm({ ...verifyForm, redeem_code: e.target.value })
                                        }
                                        required
                                      />
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <Label>Admin Notes</Label>
                                    <Textarea
                                      value={verifyForm.admin_notes}
                                      onChange={(e) =>
                                        setVerifyForm({ ...verifyForm, admin_notes: e.target.value })
                                      }
                                      placeholder="Optional notes for customer"
                                    />
                                  </div>
                                  <Button type="submit" className="w-full">
                                    Submit Verification
                                  </Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Product Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                  <DialogTrigger asChild>
                    <Button className="mb-4" onClick={() => {
                      setEditingProduct(null);
                      setProductForm({ name: "", description: "", price: "", duration_days: "", stock: "" });
                    }}>Add Product</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingProduct ? "Edit" : "Add"} Product</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleProductSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={productForm.name}
                          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={productForm.description}
                          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price (IDR)</Label>
                        <Input
                          type="number"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duration (days)</Label>
                        <Input
                          type="number"
                          value={productForm.duration_days}
                          onChange={(e) => setProductForm({ ...productForm, duration_days: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          value={productForm.stock}
                          onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        {editingProduct ? "Update" : "Create"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>Rp {product.price.toLocaleString('id-ID')}</TableCell>
                        <TableCell>{product.duration_days} days</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and roles</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <Badge key={role} variant="secondary">
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline">user</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant={user.roles.includes("admin") ? "destructive" : "outline"}
                              size="sm"
                              onClick={() =>
                                handleToggleRole(user.id, "admin", user.roles.includes("admin"))
                              }
                            >
                              {user.roles.includes("admin") ? "Remove" : "Make"} Admin
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
