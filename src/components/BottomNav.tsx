import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, Shield, User, Briefcase } from "lucide-react";

interface BottomNavProps {
  isAdmin: boolean;
  isStaff: boolean;
  isAuthenticated: boolean;
}

const BottomNav = ({ isAdmin, isStaff, isAuthenticated }: BottomNavProps) => {
  const location = useLocation();
  
  const getNavItems = () => {
    const items = [
      { path: "/", icon: Home, label: "Home" },
    ];
    
    if (isAuthenticated) {
      items.push({ path: "/transactions", icon: ShoppingBag, label: "Orders" });
    }
    
    if (isAdmin) {
      items.push({ path: "/admin", icon: Shield, label: "Admin" });
    } else if (isStaff) {
      items.push({ path: "/staff", icon: Briefcase, label: "Staff" });
    }
    
    if (isAuthenticated && !isAdmin && !isStaff) {
      items.push({ path: "/profile", icon: User, label: "Profile" });
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
