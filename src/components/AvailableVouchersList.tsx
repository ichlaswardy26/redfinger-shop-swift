 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Skeleton } from "@/components/ui/skeleton";
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 import { AvailableVoucher } from "@/hooks/useAvailableVouchers";
 import { Tag, ChevronDown, ChevronUp, Percent, Clock, Sparkles, TicketX } from "lucide-react";
 import { differenceInDays } from "date-fns";
 import { useState } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { t } from "@/lib/translations";
 
 interface AvailableVouchersListProps {
   vouchers: AvailableVoucher[];
   isLoading: boolean;
   onApply: (code: string) => void;
   disabled?: boolean;
 }
 
 export const AvailableVouchersList = ({
   vouchers,
   isLoading,
   onApply,
   disabled = false,
 }: AvailableVouchersListProps) => {
   const [isOpen, setIsOpen] = useState(true);
 
   if (isLoading) {
     return (
       <div className="space-y-2 mt-4">
         <div className="flex items-center gap-2 text-sm text-muted-foreground">
           <Tag className="h-4 w-4" />
           <span>Loading available vouchers...</span>
         </div>
         <div className="space-y-2">
           <Skeleton className="h-16 w-full" />
           <Skeleton className="h-16 w-full" />
         </div>
       </div>
     );
   }
 
   if (vouchers.length === 0) {
     return (
       <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30">
         <div className="flex flex-col items-center justify-center text-center gap-2 py-2">
           <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
             <TicketX className="h-5 w-5 text-muted-foreground" />
           </div>
           <p className="text-sm text-muted-foreground">
             {t.vouchers.suggestions.empty}
           </p>
           <p className="text-xs text-muted-foreground/70">
             {t.vouchers.suggestions.emptyHint}
           </p>
         </div>
       </div>
     );
   }
 
   const bestVoucher = vouchers[0];
 
   return (
     <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
       <CollapsibleTrigger asChild>
         <Button
           variant="ghost"
           className="w-full flex items-center justify-between p-2 h-auto hover:bg-muted/50"
         >
           <div className="flex items-center gap-2 text-sm">
             <Tag className="h-4 w-4 text-primary" />
             <span className="font-medium">{t.vouchers.suggestions.title}</span>
             <Badge variant="secondary" className="text-xs">
               {vouchers.length}
             </Badge>
           </div>
           {isOpen ? (
             <ChevronUp className="h-4 w-4 text-muted-foreground" />
           ) : (
             <ChevronDown className="h-4 w-4 text-muted-foreground" />
           )}
         </Button>
       </CollapsibleTrigger>
 
       <CollapsibleContent>
         <AnimatePresence>
           <motion.div
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: "auto" }}
             exit={{ opacity: 0, height: 0 }}
             className="space-y-2 pt-2 max-h-[240px] overflow-y-auto"
           >
             {vouchers.map((voucher, index) => {
               const daysUntilExpiry = differenceInDays(
                 new Date(voucher.valid_until),
                 new Date()
               );
               const isExpiringSoon = daysUntilExpiry <= 3;
               const isBestValue = index === 0 && vouchers.length > 1;
 
               return (
                 <motion.div
                   key={voucher.id}
                   initial={{ opacity: 0, y: -10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: index * 0.05 }}
                   className="relative rounded-lg border-2 border-border p-3 bg-card hover:border-primary/50 transition-colors"
                 >
                   {isBestValue && (
                     <div className="absolute -top-2 -right-2">
                       <Badge className="bg-primary text-primary-foreground text-xs flex items-center gap-1">
                         <Sparkles className="h-3 w-3" />
                       {t.vouchers.suggestions.bestValue}
                       </Badge>
                     </div>
                   )}
 
                   <div className="flex items-start justify-between gap-3">
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 flex-wrap">
                         <Badge variant="outline" className="font-mono text-xs">
                           {voucher.code}
                         </Badge>
                         <Badge variant="secondary" className="text-xs">
                           {voucher.discount_type === "percentage" ? (
                             <span className="flex items-center gap-1">
                               <Percent className="h-3 w-3" />
                               {voucher.discount_value}%
                             </span>
                           ) : (
                             <span>Rp {voucher.discount_value.toLocaleString()}</span>
                           )}
                         </Badge>
                       </div>
 
                       <p className="text-sm font-medium mt-1 truncate">
                         {voucher.name}
                       </p>
 
                       <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                         {voucher.min_order_amount && voucher.min_order_amount > 0 && (
                           <span>{t.vouchers.suggestions.min}: Rp {voucher.min_order_amount.toLocaleString()}</span>
                         )}
                         {voucher.max_discount_amount && (
                           <span>{t.vouchers.suggestions.max}: Rp {voucher.max_discount_amount.toLocaleString()}</span>
                         )}
                         {isExpiringSoon && (
                           <span className="flex items-center gap-1 text-destructive">
                             <Clock className="h-3 w-3" />
                             {daysUntilExpiry <= 0 ? t.vouchers.suggestions.expiresToday : `${daysUntilExpiry} ${t.vouchers.suggestions.expiresInDays}`}
                           </span>
                         )}
                       </div>
 
                       <p className="text-sm font-bold text-primary mt-1">
                         {t.vouchers.suggestions.save} Rp {voucher.potential_discount.toLocaleString()}
                       </p>
                     </div>
 
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => onApply(voucher.code)}
                       disabled={disabled}
                       className="shrink-0"
                     >
                         {t.vouchers.suggestions.apply}
                     </Button>
                   </div>
                 </motion.div>
               );
             })}
           </motion.div>
         </AnimatePresence>
       </CollapsibleContent>
     </Collapsible>
   );
 };