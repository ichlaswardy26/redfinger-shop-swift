import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, ShoppingCart, Star, TrendingUp } from "lucide-react";
import { t } from "@/lib/translations";

interface Stats {
  totalCustomers: number;
  totalOrders: number;
  averageRating: number;
  successRate: number;
}

export const TrustIndicators = () => {
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalOrders: 0,
    averageRating: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [profilesRes, ordersRes, ratingsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("payment_status", { count: "exact" }),
        supabase.from("public_product_ratings").select("rating"),
      ]);

      const totalCustomers = profilesRes.count || 0;
      const orders = ordersRes.data || [];
      const totalOrders = orders.length;
      const verifiedOrders = orders.filter(o => o.payment_status === "verified").length;
      const successRate = totalOrders > 0 ? Math.round((verifiedOrders / totalOrders) * 100) : 0;

      const ratings = ratingsRes.data || [];
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
        : 0;

      setStats({
        totalCustomers,
        totalOrders: verifiedOrders,
        averageRating: Math.round(averageRating * 10) / 10,
        successRate,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const indicators = [
    {
      icon: <Users className="h-6 w-6" />,
      value: stats.totalCustomers.toLocaleString() + "+",
      label: t.store.stats.happyCustomers,
    },
    {
      icon: <ShoppingCart className="h-6 w-6" />,
      value: stats.totalOrders.toLocaleString() + "+",
      label: t.additional.ordersCompleted,
    },
    {
      icon: <Star className="h-6 w-6" />,
      value: stats.averageRating > 0 ? `${stats.averageRating}/5` : "N/A",
      label: t.additional.averageRating,
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      value: stats.successRate + "%",
      label: t.additional.successRateLabel,
    },
  ];

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {indicators.map((indicator, index) => (
            <Card key={index} className="text-center p-6 border-2 border-border shadow-brutal-sm">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary border-2 border-border flex items-center justify-center text-primary-foreground">
                {indicator.icon}
              </div>
              <div className="text-3xl font-black text-primary">{indicator.value}</div>
              <div className="text-sm text-muted-foreground font-medium">{indicator.label}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
