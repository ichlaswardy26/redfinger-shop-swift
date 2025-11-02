import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'staff' | 'user' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        
        setRole(data?.role || 'user');
      } catch (error) {
        console.error("Error checking user role:", error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, []);

  return { role, loading, isAdmin: role === 'admin', isStaff: role === 'staff' };
};
