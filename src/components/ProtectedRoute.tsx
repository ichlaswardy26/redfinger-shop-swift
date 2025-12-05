import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireStaff?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute = ({
  children,
  requireAuth = false,
  requireAdmin = false,
  requireStaff = false,
  redirectTo = "/auth/signin",
}: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If auth required but no session
      if (requireAuth && !session) {
        navigate(redirectTo);
        return;
      }

      // If admin required
      if (requireAdmin && session) {
        const { data, error } = await supabase.functions.invoke('verify-admin');
        if (error || !data?.isAdmin) {
          navigate("/");
          return;
        }
      }

      // If staff required
      if (requireStaff && session) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        const hasStaffOrAdmin = roles?.some(r => r.role === 'staff' || r.role === 'admin');
        if (!hasStaffOrAdmin) {
          navigate("/");
          return;
        }
      }

      setAuthorized(true);
    } catch (error) {
      console.error("Error checking access:", error);
      navigate(redirectTo);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
};

// Guest route - only accessible when NOT logged in
export const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkGuest();
  }, []);

  const checkGuest = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
        return;
      }
      setIsGuest(true);
    } catch (error) {
      console.error("Error checking guest status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return isGuest ? <>{children}</> : null;
};
