import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface StockLog {
  id: string;
  product_id: string;
  user_id: string;
  operation: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_at: string;
  products?: {
    name: string;
  };
  user_name?: string;
  user_email?: string;
}

export const StockActivityLog = () => {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data: logsData, error: logsError } = await supabase
        .from("stock_logs")
        .select(`
          *,
          products(name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      // Fetch user details separately since there's no direct FK
      const userIds = [...new Set(logsData?.map(log => log.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enrichedLogs = logsData?.map(log => ({
        ...log,
        user_name: profileMap.get(log.user_id)?.full_name || "Unknown",
        user_email: profileMap.get(log.user_id)?.email || "",
      })) || [];

      setLogs(enrichedLogs);
    } catch (error) {
      console.error("Error fetching stock logs:", error);
      toast.error("Failed to load stock activity logs");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading stock activity...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Previous Stock</TableHead>
                <TableHead>New Stock</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No stock activity logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.products?.name || "Unknown"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{log.user_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.user_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.operation === "add" ? "default" : "destructive"}>
                        {log.operation === "add" ? "Added" : "Removed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.quantity}</TableCell>
                    <TableCell>{log.previous_stock}</TableCell>
                    <TableCell className="font-medium">{log.new_stock}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.reason || <span className="text-muted-foreground italic">No reason provided</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
