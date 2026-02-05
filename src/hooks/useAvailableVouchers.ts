 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 
 export interface AvailableVoucher {
   id: string;
   code: string;
   name: string;
   description: string | null;
   discount_type: "percentage" | "fixed";
   discount_value: number;
   max_discount_amount: number | null;
   min_order_amount: number | null;
   potential_discount: number;
   first_order_only: boolean;
   valid_until: string;
 }
 
 interface UseAvailableVouchersResult {
   vouchers: AvailableVoucher[];
   isLoading: boolean;
   error: string | null;
   refetch: () => void;
 }
 
 export const useAvailableVouchers = (
   orderAmount: number,
   productId: string,
   categoryId?: string,
   enabled: boolean = true
 ): UseAvailableVouchersResult => {
   const [vouchers, setVouchers] = useState<AvailableVoucher[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
 
   const fetchVouchers = useCallback(async () => {
     if (!enabled || orderAmount <= 0 || !productId) {
       setVouchers([]);
       return;
     }
 
     setIsLoading(true);
     setError(null);
 
     try {
       const { data, error: invokeError } = await supabase.functions.invoke(
         "get-available-vouchers",
         {
           body: {
             order_amount: orderAmount,
             product_id: productId,
             category_id: categoryId,
           },
         }
       );
 
       if (invokeError) {
         console.error("Error fetching available vouchers:", invokeError);
         setError("Failed to load available vouchers");
         setVouchers([]);
         return;
       }
 
       setVouchers(data?.vouchers || []);
     } catch (err) {
       console.error("Error fetching available vouchers:", err);
       setError("Failed to load available vouchers");
       setVouchers([]);
     } finally {
       setIsLoading(false);
     }
   }, [orderAmount, productId, categoryId, enabled]);
 
   useEffect(() => {
     const debounceTimer = setTimeout(() => {
       fetchVouchers();
     }, 300);
 
     return () => clearTimeout(debounceTimer);
   }, [fetchVouchers]);
 
   return {
     vouchers,
     isLoading,
     error,
     refetch: fetchVouchers,
   };
 };