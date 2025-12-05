import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingBag, Shield, User, Briefcase, LogOut, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BottomNavProps {
  isAdmin: boolean;
  isStaff: boolean;
  isAuthenticated: boolean;
}

interface NavItem {
  path: string;
  icon: any;
  label: string;
  action?: () => void;
}

const BottomNav = ({ isAdmin, isStaff, isAuthenticated }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };
  
  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      { path: "/", icon: Home, label: "Home" },
    ];
    
    if (isAuthenticated) {
      items.push({ path: "/transactions", icon: ShoppingBag, label: "Orders" });
      
      // Show both admin and staff if user has both roles
      if (isAdmin) {
        items.push({ path: "/admin", icon: Shield, label: "Admin" });
      }
      if (isStaff) {
        items.push({ path: "/staff", icon: Briefcase, label: "Staff" });
      }
      
      // Add logout action
      items.push({ path: "logout", icon: LogOut, label: "Logout", action: handleSignOut });
    } else {
      // For guests, add sign in and sign up
      items.push({ path: "/auth/signin", icon: LogIn, label: "Sign In" });
      items.push({ path: "/auth/signup", icon: UserPlus, label: "Sign Up" });
    }
    
    return items;
  };
  
  const navItems = getNavItems();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t shadow-lg">
      <div className={`grid h-16 ${navItems.length === 4 ? 'grid-cols-4' : navItems.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} max-w-screen-sm mx-auto`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          if (item.action) {
            return (
              <button
                key={item.path}
                onClick={item.action}
                className="flex flex-col items-center justify-center gap-1 transition-all text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 transition-all ${
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
