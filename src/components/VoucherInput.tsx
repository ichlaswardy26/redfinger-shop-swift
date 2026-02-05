 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Badge } from "@/components/ui/badge";
 import { Loader2, Tag, X, CheckCircle, Percent } from "lucide-react";
 import { useVoucher, ValidatedVoucher } from "@/hooks/useVoucher";
 import { useAvailableVouchers } from "@/hooks/useAvailableVouchers";
 import { useBusinessRule } from "@/hooks/useBusinessRules";
 import { AvailableVouchersList } from "@/components/AvailableVouchersList";
 import { motion, AnimatePresence } from "framer-motion";
 import { t } from "@/lib/translations";
 
 interface VoucherInputProps {
   orderAmount: number;
   productId: string;
   categoryId?: string;
   onVoucherApplied: (voucher: ValidatedVoucher | null, discountAmount: number) => void;
   disabled?: boolean;
 }
 
 export const VoucherInput = ({
   orderAmount,
   productId,
   categoryId,
   onVoucherApplied,
   disabled = false,
 }: VoucherInputProps) => {
   const [code, setCode] = useState("");
   const { validateVoucher, clearVoucher, isValidating, validatedVoucher, discountAmount } = useVoucher();
 
   // Fetch business rules for show_available_vouchers setting
   const { data: voucherSettings } = useBusinessRule("voucher");
   const showAvailableVouchers = voucherSettings?.show_available_vouchers ?? true;
 
   // Fetch available vouchers
   const {
     vouchers: availableVouchers,
     isLoading: isLoadingVouchers,
   } = useAvailableVouchers(
     orderAmount,
     productId,
     categoryId,
     showAvailableVouchers && !validatedVoucher
   );
 
   const handleApply = async () => {
     const result = await validateVoucher(code, orderAmount, productId, categoryId);
     if (result.valid && result.voucher) {
       onVoucherApplied(result.voucher, result.discount_amount || 0);
     }
   };
 
   const handleApplyFromSuggestion = async (voucherCode: string) => {
     setCode(voucherCode);
     const result = await validateVoucher(voucherCode, orderAmount, productId, categoryId);
     if (result.valid && result.voucher) {
       onVoucherApplied(result.voucher, result.discount_amount || 0);
     }
   };
 
   const handleRemove = () => {
     clearVoucher();
     setCode("");
     onVoucherApplied(null, 0);
   };
 
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === "Enter" && !isValidating && code.trim() && !disabled) {
       e.preventDefault();
       handleApply();
     }
   };
 
   return (
     <div className="space-y-3">
       <Label className="flex items-center gap-2 text-sm font-medium">
         <Tag className="h-4 w-4" />
        {t.vouchers.voucherCode}
       </Label>
 
       <AnimatePresence mode="wait">
         {validatedVoucher ? (
           <motion.div
             key="applied"
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border-2 border-primary/30"
           >
             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                 <CheckCircle className="h-5 w-5 text-primary" />
               </div>
               <div>
                 <div className="flex items-center gap-2">
                   <span className="font-bold text-primary">{validatedVoucher.code}</span>
                   <Badge variant="secondary" className="text-xs">
                     {validatedVoucher.discount_type === "percentage" ? (
                       <><Percent className="h-3 w-3 mr-1" />{validatedVoucher.discount_value}%</>
                     ) : (
                       <>Rp {validatedVoucher.discount_value.toLocaleString()}</>
                     )}
                   </Badge>
                 </div>
                 <p className="text-sm text-muted-foreground">{validatedVoucher.name}</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <span className="text-sm font-bold text-primary">
                 -Rp {discountAmount.toLocaleString()}
               </span>
               <Button
                 variant="ghost"
                 size="icon"
                 className="h-8 w-8"
                 onClick={handleRemove}
                 disabled={disabled}
               >
                 <X className="h-4 w-4" />
               </Button>
             </div>
           </motion.div>
         ) : (
           <motion.div
             key="input"
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="flex gap-2"
           >
             <div className="flex-1">
               <Input
                placeholder={t.vouchers.enterCode}
                 value={code}
                 onChange={(e) => setCode(e.target.value.toUpperCase())}
                 onKeyDown={handleKeyDown}
                 disabled={isValidating || disabled}
                 className="font-mono uppercase"
               />
             </div>
             <Button
               onClick={handleApply}
               disabled={isValidating || !code.trim() || disabled}
               variant="outline"
             >
               {isValidating ? (
                 <Loader2 className="h-4 w-4 animate-spin" />
               ) : (
                  t.actions.apply
               )}
             </Button>
           </motion.div>
         )}
       </AnimatePresence>
 
       {/* Available vouchers suggestions */}
       {showAvailableVouchers && !validatedVoucher && (
         <AvailableVouchersList
           vouchers={availableVouchers}
           isLoading={isLoadingVouchers}
           onApply={handleApplyFromSuggestion}
           disabled={disabled || isValidating}
         />
       )}
     </div>
   );
 };