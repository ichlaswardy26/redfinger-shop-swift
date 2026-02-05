 import { useState, useEffect, useMemo } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { MotionContainer, MotionStatCard } from "@/components/ui/motion";
 import { Skeleton } from "@/components/ui/skeleton";
 import {
   AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
   XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
 } from "recharts";
 import { 
   TrendingUp, ArrowUpRight, ArrowDownRight, Tag, Ticket, DollarSign, Percent 
 } from "lucide-react";
 import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
 
 interface UsageData {
   id: string;
   created_at: string;
   discount_applied: number;
   voucher_id: string;
   vouchers: {
     code: string;
     name: string;
     campaign_id: string | null;
     discount_type: string;
   } | null;
 }
 
 interface AnalyticsState {
   totalRedemptions: number;
   totalSavings: number;
   conversionRate: number;
   avgDiscount: number;
   previousRedemptions: number;
   previousSavings: number;
   previousConversionRate: number;
   previousAvgDiscount: number;
   dailyUsage: { date: string; redemptions: number; savings: number }[];
   topVouchers: { code: string; name: string; usage: number; savings: number }[];
   campaignPerformance: { campaign: string; redemptions: number; savings: number }[];
   discountDistribution: { type: string; count: number }[];
   ordersComparison: { type: string; count: number; avgValue: number }[];
 }
 
 const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
 
 export const VoucherAnalytics = () => {
   const [loading, setLoading] = useState(true);
   const [dateRange, setDateRange] = useState("30");
   const [analytics, setAnalytics] = useState<AnalyticsState>({
     totalRedemptions: 0,
     totalSavings: 0,
     conversionRate: 0,
     avgDiscount: 0,
     previousRedemptions: 0,
     previousSavings: 0,
     previousConversionRate: 0,
     previousAvgDiscount: 0,
     dailyUsage: [],
     topVouchers: [],
     campaignPerformance: [],
     discountDistribution: [],
     ordersComparison: [],
   });
 
   useEffect(() => {
     fetchAnalytics();
   }, [dateRange]);
 
   const fetchAnalytics = async () => {
     setLoading(true);
     try {
       const days = dateRange === "all" ? 365 * 10 : parseInt(dateRange);
       const startDate = startOfDay(subDays(new Date(), days));
       const endDate = endOfDay(new Date());
       const previousStartDate = subDays(startDate, days);
 
       // Fetch voucher usage data
       const { data: usageData } = await supabase
         .from("voucher_usage")
         .select("*, vouchers(code, name, campaign_id, discount_type)")
         .gte("created_at", startDate.toISOString())
         .lte("created_at", endDate.toISOString());
 
       // Fetch previous period usage
       const { data: previousUsageData } = await supabase
         .from("voucher_usage")
         .select("*, vouchers(code, name, campaign_id, discount_type)")
         .gte("created_at", previousStartDate.toISOString())
         .lt("created_at", startDate.toISOString());
 
       // Fetch orders for conversion rate
       const { data: ordersWithVoucher } = await supabase
         .from("orders")
         .select("id, voucher_id, final_amount, discount_amount")
         .eq("payment_status", "verified")
         .not("voucher_id", "is", null)
         .gte("created_at", startDate.toISOString());
 
       const { data: allVerifiedOrders } = await supabase
         .from("orders")
         .select("id, voucher_id, final_amount, discount_amount")
         .eq("payment_status", "verified")
         .gte("created_at", startDate.toISOString());
 
       // Previous period orders
       const { data: prevOrdersWithVoucher } = await supabase
         .from("orders")
         .select("id")
         .eq("payment_status", "verified")
         .not("voucher_id", "is", null)
         .gte("created_at", previousStartDate.toISOString())
         .lt("created_at", startDate.toISOString());
 
       const { data: prevAllVerifiedOrders } = await supabase
         .from("orders")
         .select("id")
         .eq("payment_status", "verified")
         .gte("created_at", previousStartDate.toISOString())
         .lt("created_at", startDate.toISOString());
 
       // Fetch all vouchers for discount type distribution
       const { data: allVouchers } = await supabase
         .from("vouchers")
         .select("discount_type, usage_count");
 
       // Calculate current metrics
       const totalRedemptions = usageData?.length || 0;
       const totalSavings = usageData?.reduce((sum, u) => sum + (u.discount_applied || 0), 0) || 0;
       const totalVerifiedOrders = allVerifiedOrders?.length || 0;
       const ordersWithVoucherCount = ordersWithVoucher?.length || 0;
       const conversionRate = totalVerifiedOrders > 0 ? (ordersWithVoucherCount / totalVerifiedOrders) * 100 : 0;
       const avgDiscount = totalRedemptions > 0 ? totalSavings / totalRedemptions : 0;
 
       // Calculate previous metrics
       const previousRedemptions = previousUsageData?.length || 0;
       const previousSavings = previousUsageData?.reduce((sum, u) => sum + (u.discount_applied || 0), 0) || 0;
       const prevVerifiedOrdersCount = prevAllVerifiedOrders?.length || 0;
       const prevVoucherOrdersCount = prevOrdersWithVoucher?.length || 0;
       const previousConversionRate = prevVerifiedOrdersCount > 0 ? (prevVoucherOrdersCount / prevVerifiedOrdersCount) * 100 : 0;
       const previousAvgDiscount = previousRedemptions > 0 ? previousSavings / previousRedemptions : 0;
 
       // Daily usage trends
       const dailyUsage = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
         const dayUsage = (usageData as UsageData[] || []).filter(u =>
           format(new Date(u.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
         );
         return {
           date: format(date, "MMM dd"),
           redemptions: dayUsage.length,
           savings: dayUsage.reduce((sum, u) => sum + (u.discount_applied || 0), 0),
         };
       });
 
       // Top performing vouchers
       const voucherMap = new Map<string, { code: string; name: string; usage: number; savings: number }>();
       (usageData as UsageData[] || []).forEach(u => {
         if (u.vouchers) {
           const key = u.voucher_id;
           const current = voucherMap.get(key) || { code: u.vouchers.code, name: u.vouchers.name, usage: 0, savings: 0 };
           voucherMap.set(key, {
             ...current,
             usage: current.usage + 1,
             savings: current.savings + (u.discount_applied || 0),
           });
         }
       });
       const topVouchers = Array.from(voucherMap.values())
         .sort((a, b) => b.usage - a.usage)
         .slice(0, 5);
 
       // Campaign performance
       const campaignMap = new Map<string, { redemptions: number; savings: number }>();
       (usageData as UsageData[] || []).forEach(u => {
         const campaign = u.vouchers?.campaign_id || "Single Vouchers";
         const current = campaignMap.get(campaign) || { redemptions: 0, savings: 0 };
         campaignMap.set(campaign, {
           redemptions: current.redemptions + 1,
           savings: current.savings + (u.discount_applied || 0),
         });
       });
       const campaignPerformance = Array.from(campaignMap.entries())
         .map(([campaign, data]) => ({ campaign: campaign.replace(/_/g, " "), ...data }))
         .sort((a, b) => b.redemptions - a.redemptions)
         .slice(0, 5);
 
       // Discount type distribution
       const percentageCount = allVouchers?.filter(v => v.discount_type === "percentage").reduce((sum, v) => sum + (v.usage_count || 0), 0) || 0;
       const fixedCount = allVouchers?.filter(v => v.discount_type === "fixed").reduce((sum, v) => sum + (v.usage_count || 0), 0) || 0;
       const discountDistribution = [
         { type: "Percentage", count: percentageCount },
         { type: "Fixed Amount", count: fixedCount },
       ].filter(d => d.count > 0);
 
       // Orders comparison
       const ordersWithoutVoucher = (allVerifiedOrders || []).filter(o => !o.voucher_id);
       const avgWithVoucher = ordersWithVoucher?.length 
         ? ordersWithVoucher.reduce((sum, o) => sum + ((o.final_amount || 0) + (o.discount_amount || 0)), 0) / ordersWithVoucher.length 
         : 0;
       const avgWithoutVoucher = ordersWithoutVoucher.length 
         ? ordersWithoutVoucher.reduce((sum, o) => sum + (o.final_amount || 0), 0) / ordersWithoutVoucher.length 
         : 0;
 
       const ordersComparison = [
         { type: "With Voucher", count: ordersWithVoucherCount, avgValue: avgWithVoucher },
         { type: "Without Voucher", count: totalVerifiedOrders - ordersWithVoucherCount, avgValue: avgWithoutVoucher },
       ];
 
       setAnalytics({
         totalRedemptions,
         totalSavings,
         conversionRate,
         avgDiscount,
         previousRedemptions,
         previousSavings,
         previousConversionRate,
         previousAvgDiscount,
         dailyUsage,
         topVouchers,
         campaignPerformance,
         discountDistribution,
         ordersComparison,
       });
     } catch (error) {
       console.error("Error fetching voucher analytics:", error);
     } finally {
       setLoading(false);
     }
   };
 
   const calculateGrowth = (current: number, previous: number) => {
     if (previous === 0) return current > 0 ? 100 : 0;
     return ((current - previous) / previous) * 100;
   };
 
   const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;
 
   const redemptionGrowth = calculateGrowth(analytics.totalRedemptions, analytics.previousRedemptions);
   const savingsGrowth = calculateGrowth(analytics.totalSavings, analytics.previousSavings);
   const conversionGrowth = analytics.conversionRate - analytics.previousConversionRate;
   const avgDiscountGrowth = calculateGrowth(analytics.avgDiscount, analytics.previousAvgDiscount);
 
   const StatCard = ({ title, value, change, icon: Icon, format: formatFn }: { 
     title: string; 
     value: number | string; 
     change?: number; 
     icon: any; 
     format?: (v: number) => string;
   }) => (
     <MotionStatCard>
       <div className="flex items-center justify-between">
         <div className="space-y-1">
           <p className="text-sm text-muted-foreground font-medium">{title}</p>
           <p className="text-2xl font-bold">
             {typeof value === "number" ? (formatFn ? formatFn(value) : value.toLocaleString()) : value}
           </p>
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
       <div className="space-y-6">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {[...Array(4)].map((_, i) => (
             <Card key={i}>
               <CardContent className="p-6">
                 <Skeleton className="h-4 w-24 mb-2" />
                 <Skeleton className="h-8 w-32" />
               </CardContent>
             </Card>
           ))}
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
           {[...Array(4)].map((_, i) => (
             <Card key={i}>
               <CardHeader>
                 <Skeleton className="h-6 w-40" />
               </CardHeader>
               <CardContent>
                 <Skeleton className="h-[250px] w-full" />
               </CardContent>
             </Card>
           ))}
         </div>
       </div>
     );
   }
 
   const hasData = analytics.totalRedemptions > 0 || analytics.topVouchers.length > 0;
 
   if (!hasData) {
     return (
       <div className="space-y-6">
         <div className="flex items-center justify-end">
           <Select value={dateRange} onValueChange={setDateRange}>
             <SelectTrigger className="w-[180px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="7">Last 7 days</SelectItem>
               <SelectItem value="30">Last 30 days</SelectItem>
               <SelectItem value="90">Last 90 days</SelectItem>
               <SelectItem value="all">All Time</SelectItem>
             </SelectContent>
           </Select>
         </div>
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-16">
             <Tag className="h-12 w-12 text-muted-foreground mb-4" />
             <h3 className="text-lg font-semibold mb-2">No Voucher Usage Data</h3>
             <p className="text-muted-foreground text-center max-w-md">
               No vouchers have been redeemed yet. Create and promote vouchers to start seeing analytics here.
             </p>
           </CardContent>
         </Card>
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       {/* Date Range Selector */}
       <div className="flex items-center justify-end">
         <Select value={dateRange} onValueChange={setDateRange}>
           <SelectTrigger className="w-[180px]">
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="7">Last 7 days</SelectItem>
             <SelectItem value="30">Last 30 days</SelectItem>
             <SelectItem value="90">Last 90 days</SelectItem>
             <SelectItem value="all">All Time</SelectItem>
           </SelectContent>
         </Select>
       </div>
 
       {/* Stats Cards */}
       <MotionContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard 
           title="Total Redemptions" 
           value={analytics.totalRedemptions} 
           change={redemptionGrowth}
           icon={Ticket}
         />
         <StatCard 
           title="Total Savings Given" 
           value={analytics.totalSavings} 
           change={savingsGrowth}
           icon={DollarSign}
           format={formatCurrency}
         />
         <StatCard 
           title="Conversion Rate" 
           value={`${analytics.conversionRate.toFixed(1)}%`} 
           change={conversionGrowth}
           icon={TrendingUp}
         />
         <StatCard 
           title="Avg Discount" 
           value={analytics.avgDiscount} 
           change={avgDiscountGrowth}
           icon={Percent}
           format={formatCurrency}
         />
       </MotionContainer>
 
       {/* Usage Trends Chart */}
       <Card>
         <CardHeader>
           <CardTitle>Usage Trends</CardTitle>
           <CardDescription>Daily voucher redemptions over time</CardDescription>
         </CardHeader>
         <CardContent>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={analytics.dailyUsage}>
                 <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                 <XAxis dataKey="date" className="text-xs" />
                 <YAxis className="text-xs" />
                 <Tooltip 
                   contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                 />
                 <Legend />
                 <Area 
                   type="monotone" 
                   dataKey="redemptions" 
                   name="Redemptions"
                   stroke="hsl(var(--primary))" 
                   fill="hsl(var(--primary) / 0.2)" 
                 />
               </AreaChart>
             </ResponsiveContainer>
           </div>
         </CardContent>
       </Card>
 
       {/* Two Column Charts */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
         {/* Top Performing Vouchers */}
         <Card>
           <CardHeader>
             <CardTitle>Top Performing Vouchers</CardTitle>
             <CardDescription>Vouchers with the most redemptions</CardDescription>
           </CardHeader>
           <CardContent>
             {analytics.topVouchers.length > 0 ? (
               <div className="h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={analytics.topVouchers} layout="vertical">
                     <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                     <XAxis type="number" className="text-xs" />
                     <YAxis dataKey="code" type="category" width={100} className="text-xs" />
                     <Tooltip 
                       formatter={(value: number, name: string) => [
                         name === "usage" ? value : formatCurrency(value), 
                         name === "usage" ? "Redemptions" : "Savings"
                       ]}
                       contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                     />
                     <Bar dataKey="usage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             ) : (
               <p className="text-muted-foreground text-center py-8">No data available</p>
             )}
           </CardContent>
         </Card>
 
         {/* Campaign Performance */}
         <Card>
           <CardHeader>
             <CardTitle>Campaign Performance</CardTitle>
             <CardDescription>Performance by campaign</CardDescription>
           </CardHeader>
           <CardContent>
             {analytics.campaignPerformance.length > 0 ? (
               <div className="h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={analytics.campaignPerformance}>
                     <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                     <XAxis dataKey="campaign" className="text-xs" angle={-15} textAnchor="end" height={60} />
                     <YAxis className="text-xs" />
                     <Tooltip 
                       formatter={(value: number, name: string) => [
                         name === "redemptions" ? value : formatCurrency(value), 
                         name === "redemptions" ? "Redemptions" : "Savings"
                       ]}
                       contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                     />
                     <Bar dataKey="redemptions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             ) : (
               <p className="text-muted-foreground text-center py-8">No campaign data available</p>
             )}
           </CardContent>
         </Card>
 
         {/* Discount Type Distribution */}
         <Card>
           <CardHeader>
             <CardTitle>Discount Type Distribution</CardTitle>
             <CardDescription>Breakdown by discount type</CardDescription>
           </CardHeader>
           <CardContent>
             {analytics.discountDistribution.length > 0 ? (
               <div className="h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={analytics.discountDistribution}
                       dataKey="count"
                       nameKey="type"
                       cx="50%"
                       cy="50%"
                       outerRadius={80}
                       label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                     >
                       {analytics.discountDistribution.map((_, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
             ) : (
               <p className="text-muted-foreground text-center py-8">No data available</p>
             )}
           </CardContent>
         </Card>
 
         {/* Orders Comparison */}
         <Card>
           <CardHeader>
             <CardTitle>Orders Comparison</CardTitle>
             <CardDescription>Orders with vs without vouchers</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               {analytics.ordersComparison.map((item, i) => (
                 <div key={i} className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="font-medium">{item.type}</span>
                     <span className="text-muted-foreground">{item.count} orders</span>
                   </div>
                   <div className="h-3 bg-muted rounded-full overflow-hidden">
                     <div 
                       className="h-full rounded-full transition-all"
                       style={{ 
                         width: `${(item.count / Math.max(...analytics.ordersComparison.map(o => o.count), 1)) * 100}%`,
                         backgroundColor: COLORS[i % COLORS.length]
                       }}
                     />
                   </div>
                   <p className="text-xs text-muted-foreground">
                     Avg Order Value: {formatCurrency(item.avgValue)}
                   </p>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 };