import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Receipt, LayoutDashboard, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface BottomNavProps {
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const BottomNav = ({ isAdmin, isAuthenticated }: BottomNavProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logged out successfully",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="grid grid-cols-4 h-16">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center gap-1 ${
            location.pathname === "/" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-xs">Store</span>
        </Link>
        
        <Link
          to="/transactions"
          className={`flex flex-col items-center justify-center gap-1 ${
            location.pathname === "/transactions" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Receipt className="h-5 w-5" />
          <span className="text-xs">Orders</span>
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            className={`flex flex-col items-center justify-center gap-1 ${
              location.pathname === "/admin" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs">Admin</span>
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 text-muted-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-xs">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
