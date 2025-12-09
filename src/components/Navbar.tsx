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
  LogOut, 
  Shield, 
  Briefcase, 
  ShoppingBag,
  Home,
  Menu,
  LogIn,
  UserPlus,
  Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const totalNotifications = pendingCount + openTicketsCount;

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
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
                  <Button variant="ghost" className={isActive('/transactions') ? 'bg-muted' : ''}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    My Orders
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" className={`${isActive('/admin') ? 'bg-muted' : ''} relative`}>
                      <Shield className="mr-2 h-4 w-4" />
                      Admin
                      {totalNotifications > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {totalNotifications > 99 ? '99+' : totalNotifications}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )}
                {isStaff && !isAdmin && (
                  <Link to="/staff">
                    <Button variant="ghost" className={`${isActive('/staff') ? 'bg-muted' : ''} relative`}>
                      <Briefcase className="mr-2 h-4 w-4" />
                      Staff
                      {totalNotifications > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {totalNotifications > 99 ? '99+' : totalNotifications}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover">
                    <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                      {user.email}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
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
                <Button variant="ghost" size="icon" className="relative">
                  <Menu className="h-5 w-5" />
                  {(isAdmin || isStaff) && totalNotifications > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]">
                      {totalNotifications > 9 ? '9+' : totalNotifications}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <DropdownMenuItem onClick={() => navigate("/")}>
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </DropdownMenuItem>
                
                {!user ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/auth/signin")}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/auth/signup")}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Sign Up
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/transactions")}>
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      My Orders
                    </DropdownMenuItem>
                    
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="relative">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                        {totalNotifications > 0 && (
                          <Badge variant="destructive" className="ml-auto text-xs">
                            {totalNotifications}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    )}
                    
                    {isStaff && !isAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/staff")} className="relative">
                        <Briefcase className="mr-2 h-4 w-4" />
                        Staff Panel
                        {totalNotifications > 0 && (
                          <Badge variant="destructive" className="ml-auto text-xs">
                            {totalNotifications}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                      {user.email}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
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
