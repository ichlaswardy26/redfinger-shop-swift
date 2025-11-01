import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { ShoppingBag } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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

  return (
    <>
      <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              <ShoppingBag className="h-6 w-6 text-primary" />
              <span className="hidden sm:inline">Redfinger Store</span>
              <span className="sm:hidden">Redfinger</span>
            </Link>

            {/* Desktop Sign In Button for guests */}
            {!user && (
              <Button onClick={() => window.location.href = "/auth/signin"}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>
      
      <BottomNav isAdmin={isAdmin} isAuthenticated={!!user} />
    </>
  );
};

export default Navbar;
