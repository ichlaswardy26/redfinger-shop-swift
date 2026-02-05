 import { useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 
 export interface ValidatedVoucher {
   id: string;
   code: string;
   name: string;
   discount_type: "percentage" | "fixed";
   discount_value: number;
   max_discount_amount: number | null;
 }
 
 export interface VoucherValidationResult {
   valid: boolean;
   voucher?: ValidatedVoucher;
   discount_amount?: number;
   original_amount?: number;
   final_amount?: number;
   error?: string;
 }
 
 export const useVoucher = () => {
   const [isValidating, setIsValidating] = useState(false);
   const [validatedVoucher, setValidatedVoucher] = useState<ValidatedVoucher | null>(null);
   const [discountAmount, setDiscountAmount] = useState<number>(0);
   const { toast } = useToast();
 
   const validateVoucher = async (
     code: string,
     orderAmount: number,
     productId: string,
     categoryId?: string
   ): Promise<VoucherValidationResult> => {
     if (!code.trim()) {
       return { valid: false, error: "Please enter a voucher code" };
     }
 
     setIsValidating(true);
     try {
       const { data, error } = await supabase.functions.invoke("validate-voucher", {
         body: {
           code: code.toUpperCase().trim(),
           order_amount: orderAmount,
           product_id: productId,
           category_id: categoryId,
         },
       });
 
       if (error) {
         console.error("Voucher validation error:", error);
         return { valid: false, error: "Failed to validate voucher" };
       }
 
       if (data.valid) {
         setValidatedVoucher(data.voucher);
         setDiscountAmount(data.discount_amount);
         toast({
           title: "Voucher Applied!",
           description: `${data.voucher.name} - Discount Rp ${data.discount_amount.toLocaleString()}`,
         });
       } else {
         toast({
           title: "Invalid Voucher",
           description: data.error || "Voucher could not be applied",
           variant: "destructive",
         });
       }
 
       return data as VoucherValidationResult;
     } catch (error) {
       console.error("Voucher validation error:", error);
       return { valid: false, error: "Failed to validate voucher" };
     } finally {
       setIsValidating(false);
     }
   };
 
   const clearVoucher = () => {
     setValidatedVoucher(null);
     setDiscountAmount(0);
   };
 
   return {
     validateVoucher,
     clearVoucher,
     isValidating,
     validatedVoucher,
     discountAmount,
   };
 };