import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { ShoppingBag, LogOut, LayoutDashboard, Receipt, Menu, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      // Server-side admin verification
      const { data, error } = await supabase.functions.invoke('verify-admin');
      
      if (error) {
        console.error('Error verifying admin status:', error);
        setIsAdmin(false);
        return;
      }
      
      setIsAdmin(data?.isAdmin || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setIsAdmin(false);
      setMobileMenuOpen(false);
      
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

  const NavLinks = () => (
    <>
      {user ? (
        <>
          <Button
            variant="ghost"
            onClick={() => {
              navigate("/transactions");
              setMobileMenuOpen(false);
            }}
            className="w-full md:w-auto justify-start"
          >
            <Receipt className="mr-2 h-4 w-4" />
            My Orders
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              onClick={() => {
                navigate("/admin");
                setMobileMenuOpen(false);
              }}
              className="w-full md:w-auto justify-start"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Admin Panel
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full md:w-auto justify-start"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </>
      ) : (
        <Button 
          onClick={() => {
            navigate("/auth/signin");
            setMobileMenuOpen(false);
          }}
          className="w-full md:w-auto"
        >
          Sign In
        </Button>
      )}
    </>
  );

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline">Redfinger Store</span>
            <span className="sm:hidden">Redfinger</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <NavLinks />
          </div>

          {/* Mobile Navigation */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px]">
              <div className="flex flex-col gap-4 mt-8">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
