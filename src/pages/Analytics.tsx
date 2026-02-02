import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from "date-fns";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, 
  Star, Ticket, ArrowUpRight, ArrowDownRight, Loader2 
} from "lucide-react";
import { MotionStatCard, MotionPage, MotionContainer, motion } from "@/components/ui/motion";

interface OrderData {
  id: string;
  created_at: string;
  payment_status: string;
  quantity: number;
  product_id: string;
  products?: { name: string; price: number };
}

interface AnalyticsData {
  dailyOrders: { date: string; orders: number; revenue: number }[];
  monthlyOrders: { month: string; orders: number; revenue: number }[];
  productSales: { name: string; sales: number; revenue: number }[];
  orderStatus: { status: string; count: number }[];
  customerActivity: { date: string; newCustomers: number; activeCustomers: number }[];
  revenueByCategory: { category: string; revenue: number }[];
}

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
  customerGrowth: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    dailyOrders: [],
    monthlyOrders: [],
    productSales: [],
    orderStatus: [],
    customerActivity: [],
    revenueByCategory: [],
  });
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    revenueGrowth: 0,
    orderGrowth: 0,
    customerGrowth: 0,
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAnalytics();
    }
  }, [dateRange]);

  const checkAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/signin");
        return;
      }
      const { data, error } = await supabase.functions.invoke('verify-admin');
      if (error || !data?.isAdmin) {
        toast({ title: "Access denied", description: "Admin access required", variant: "destructive" });
        navigate("/");
        return;
      }
      await fetchAnalytics();
    } catch (error) {
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    const days = parseInt(dateRange);
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());
    const previousStartDate = subDays(startDate, days);

    // Fetch orders
    const { data: orders } = await supabase
      .from("orders")
      .select("*, products(name, price, category_id)")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    const { data: previousOrders } = await supabase
      .from("orders")
      .select("*, products(name, price)")
      .gte("created_at", previousStartDate.toISOString())
      .lt("created_at", startDate.toISOString());

    // Fetch customers
    const { data: customers } = await supabase
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", startDate.toISOString());

    const { data: previousCustomers } = await supabase
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", previousStartDate.toISOString())
      .lt("created_at", startDate.toISOString());

    const { data: allCustomers } = await supabase.from("profiles").select("id");

    // Fetch categories
    const { data: categories } = await supabase
      .from("product_categories")
      .select("id, name");

    const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

    // Calculate stats
    const verifiedOrders = orders?.filter(o => o.payment_status === "verified") || [];
    const previousVerifiedOrders = previousOrders?.filter(o => o.payment_status === "verified") || [];

    const totalRevenue = verifiedOrders.reduce((sum, o) => sum + (o.products?.price || 0) * o.quantity, 0);
    const previousRevenue = previousVerifiedOrders.reduce((sum, o) => sum + (o.products?.price || 0) * o.quantity, 0);

    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const orderGrowth = (previousOrders?.length || 0) > 0 
      ? (((orders?.length || 0) - (previousOrders?.length || 0)) / (previousOrders?.length || 1)) * 100 
      : 0;
    const customerGrowth = (previousCustomers?.length || 0) > 0 
      ? (((customers?.length || 0) - (previousCustomers?.length || 0)) / (previousCustomers?.length || 1)) * 100 
      : 0;

    setStats({
      totalRevenue,
      totalOrders: orders?.length || 0,
      totalCustomers: allCustomers?.length || 0,
      avgOrderValue: verifiedOrders.length > 0 ? totalRevenue / verifiedOrders.length : 0,
      revenueGrowth,
      orderGrowth,
      customerGrowth,
    });

    // Daily orders chart
    const dailyData = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
      const dayOrders = orders?.filter(o => 
        format(new Date(o.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      ) || [];
      const dayRevenue = dayOrders.filter(o => o.payment_status === "verified")
        .reduce((sum, o) => sum + (o.products?.price || 0) * o.quantity, 0);
      return {
        date: format(date, "MMM dd"),
        orders: dayOrders.length,
        revenue: dayRevenue,
      };
    });

    // Monthly data for longer ranges
    const monthlyData = eachMonthOfInterval({ start: subMonths(new Date(), 11), end: new Date() }).map(date => {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const { data: monthOrders } = { data: orders?.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= monthStart && orderDate <= monthEnd;
      }) || [] };
      const monthRevenue = monthOrders.filter(o => o.payment_status === "verified")
        .reduce((sum, o) => sum + (o.products?.price || 0) * o.quantity, 0);
      return {
        month: format(date, "MMM yyyy"),
        orders: monthOrders.length,
        revenue: monthRevenue,
      };
    });

    // Product sales
    const productSalesMap = new Map<string, { sales: number; revenue: number }>();
    verifiedOrders.forEach(order => {
      const name = order.products?.name || "Unknown";
      const current = productSalesMap.get(name) || { sales: 0, revenue: 0 };
      productSalesMap.set(name, {
        sales: current.sales + order.quantity,
        revenue: current.revenue + (order.products?.price || 0) * order.quantity,
      });
    });
    const productSales = Array.from(productSalesMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Order status distribution
    const statusMap = new Map<string, number>();
    orders?.forEach(order => {
      const status = order.payment_status;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const orderStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

    // Revenue by category
    const categoryRevenueMap = new Map<string, number>();
    verifiedOrders.forEach(order => {
      const categoryId = (order.products as any)?.category_id;
      const categoryName = categoryId ? categoryMap.get(categoryId) || "Uncategorized" : "Uncategorized";
      const current = categoryRevenueMap.get(categoryName) || 0;
      categoryRevenueMap.set(categoryName, current + (order.products?.price || 0) * order.quantity);
    });
    const revenueByCategory = Array.from(categoryRevenueMap.entries())
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // Customer activity
    const customerActivity = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
      const newCustomers = customers?.filter(c => 
        format(new Date(c.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      ).length || 0;
      const activeCustomers = orders?.filter(o => 
        format(new Date(o.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      ).length || 0;
      return {
        date: format(date, "MMM dd"),
        newCustomers,
        activeCustomers,
      };
    });

    setAnalytics({
      dailyOrders: dailyData,
      monthlyOrders: monthlyData,
      productSales,
      orderStatus,
      customerActivity,
      revenueByCategory,
    });
  };

  const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

  const StatCard = ({ title, value, change, icon: Icon, format: formatFn }: { 
    title: string; 
    value: number; 
    change?: number; 
    icon: any; 
    format?: (v: number) => string;
  }) => (
    <MotionStatCard>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold">{formatFn ? formatFn(value) : value.toLocaleString()}</p>
          {change !== undefined && (
            <div className={`flex items-center text-sm ${change >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{Math.abs(change).toFixed(1)}% vs previous period</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-lg border-2 border-border">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </MotionStatCard>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <MotionPage className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Overview of your store performance</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Stats Cards */}
        <MotionContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Total Revenue" 
            value={stats.totalRevenue} 
            change={stats.revenueGrowth}
            icon={DollarSign}
            format={formatCurrency}
          />
          <StatCard 
            title="Total Orders" 
            value={stats.totalOrders} 
            change={stats.orderGrowth}
            icon={ShoppingCart}
          />
          <StatCard 
            title="Total Customers" 
            value={stats.totalCustomers} 
            change={stats.customerGrowth}
            icon={Users}
          />
          <StatCard 
            title="Avg Order Value" 
            value={stats.avgOrderValue} 
            icon={TrendingUp}
            format={formatCurrency}
          />
        </MotionContainer>

        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Over Time</CardTitle>
                  <CardDescription>Daily revenue for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.dailyOrders}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                          contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary) / 0.2)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Category</CardTitle>
                  <CardDescription>Revenue distribution across product categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.revenueByCategory}
                          dataKey="revenue"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {analytics.revenueByCategory.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Orders Over Time</CardTitle>
                  <CardDescription>Daily order count for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.dailyOrders}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Status Distribution</CardTitle>
                  <CardDescription>Breakdown of orders by payment status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.orderStatus}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ status, count }) => `${status}: ${count}`}
                        >
                          {analytics.orderStatus.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Products by Revenue</CardTitle>
                <CardDescription>Best performing products in the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.productSales} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" width={150} className="text-xs" />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Activity</CardTitle>
                <CardDescription>New customers and order activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.customerActivity}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                      <Line type="monotone" dataKey="newCustomers" stroke="hsl(var(--primary))" name="New Customers" strokeWidth={2} />
                      <Line type="monotone" dataKey="activeCustomers" stroke="hsl(var(--chart-2))" name="Active Orders" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MotionPage>
  );
};

export default Analytics;
