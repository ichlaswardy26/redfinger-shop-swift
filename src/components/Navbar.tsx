import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  LogOut, 
  Shield, 
  Briefcase, 
  ShoppingBag,
  Home,
  Menu,
  LogIn,
  UserPlus,
  Clock,
  Ticket,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Notification badge component with tooltip
const NotificationBadge = ({ count, label, icon: Icon }: { count: number; label: string; icon: React.ElementType }) => {
  if (count === 0) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center p-0 px-1.5 text-xs gap-1">
          <Icon className="h-3 w-3" />
          {count > 99 ? '99+' : count}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{count} {label}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
      } else {
        setIsAdmin(false);
        setIsStaff(false);
        setPendingCount(0);
        setOpenTicketsCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin || isStaff) {
      fetchNotificationCounts();
      const channel = supabase
        .channel('navbar-notifications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchNotificationCounts)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchNotificationCounts)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [isAdmin, isStaff]);

  const fetchNotificationCounts = async () => {
    try {
      const { data: pendingOrders } = await supabase
        .from("orders")
        .select("id", { count: 'exact' })
        .eq("payment_status", "pending");
      setPendingCount(pendingOrders?.length || 0);

      const { data: openTickets } = await supabase
        .from("support_tickets")
        .select("id", { count: 'exact' })
        .eq("status", "open");
      setOpenTicketsCount(openTickets?.length || 0);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  };

  const checkRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-admin');
      if (error) throw error;
      setIsAdmin(data?.isAdmin || false);
      
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "staff")
        .maybeSingle();
      
      setIsStaff(!!roleData);
    } catch (error) {
      console.error('Error checking roles:', error);
      setIsAdmin(false);
      setIsStaff(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({ title: "Signed out successfully" });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error signing out",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-border bg-background/70 backdrop-blur-glass">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-black tracking-tight px-3 py-1 bg-primary text-primary-foreground border-2 border-border shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal transition-all">
          Redfinger Store
        </Link>

        <div className="flex items-center gap-2">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {!user ? (
              <>
                <Link to="/auth/signin">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth/signup">
                  <Button>Sign Up</Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/transactions">
                  <Button variant={isActive('/transactions') ? 'default' : 'outline'}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    My Orders
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant={isActive('/admin') ? 'default' : 'outline'} className="gap-2">
                      <Shield className="h-4 w-4" />
                      Admin
                      {pendingCount > 0 && (
                        <NotificationBadge count={pendingCount} label="pending orders" icon={Clock} />
                      )}
                      {openTicketsCount > 0 && (
                        <NotificationBadge count={openTicketsCount} label="open tickets" icon={Ticket} />
                      )}
                    </Button>
                  </Link>
                )}
                {isStaff && !isAdmin && (
                  <Link to="/staff">
                    <Button variant={isActive('/staff') ? 'default' : 'outline'} className="gap-2">
                      <Briefcase className="h-4 w-4" />
                      Staff
                      {pendingCount > 0 && (
                        <NotificationBadge count={pendingCount} label="pending orders" icon={Clock} />
                      )}
                      {openTicketsCount > 0 && (
                        <NotificationBadge count={openTicketsCount} label="open tickets" icon={Ticket} />
                      )}
                    </Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full relative">
                      <Avatar className="h-8 w-8 border-2 border-border">
                        <AvatarFallback className="font-bold bg-accent text-accent-foreground">
                          {user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover border-2 border-border shadow-brutal">
                    <DropdownMenuItem disabled className="text-muted-foreground text-xs font-medium">
                      {user.email}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive font-bold">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Mobile Navigation - Dropdown Menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border-2 border-border shadow-brutal">
                <DropdownMenuItem onClick={() => navigate("/")} className="font-medium">
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </DropdownMenuItem>
                
                {!user ? (
                  <>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={() => navigate("/auth/signin")} className="font-medium">
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/auth/signup")} className="font-medium">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Sign Up
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/transactions")} className="font-medium">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      My Orders
                    </DropdownMenuItem>
                    
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="font-medium justify-between">
                        <span className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin Panel
                        </span>
                        <span className="flex items-center gap-1">
                          {pendingCount > 0 && (
                            <Badge variant="destructive" className="text-xs h-5 px-1.5">
                              {pendingCount} orders
                            </Badge>
                          )}
                          {openTicketsCount > 0 && (
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                              {openTicketsCount} tickets
                            </Badge>
                          )}
                        </span>
                      </DropdownMenuItem>
                    )}
                    
                    {isStaff && !isAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/staff")} className="font-medium justify-between">
                        <span className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Staff Panel
                        </span>
                        <span className="flex items-center gap-1">
                          {pendingCount > 0 && (
                            <Badge variant="destructive" className="text-xs h-5 px-1.5">
                              {pendingCount} orders
                            </Badge>
                          )}
                          {openTicketsCount > 0 && (
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                              {openTicketsCount} tickets
                            </Badge>
                          )}
                        </span>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                      {user.email}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive font-bold">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
