 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Skeleton } from "@/components/ui/skeleton";
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 import { AvailableVoucher } from "@/hooks/useAvailableVouchers";
 import { Tag, ChevronDown, ChevronUp, Percent, Clock, Sparkles } from "lucide-react";
 import { format, differenceInDays } from "date-fns";
 import { useState } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 
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
     return null;
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
             <span className="font-medium">Available vouchers for you</span>
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
                         Best Value
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
                           <span>Min: Rp {voucher.min_order_amount.toLocaleString()}</span>
                         )}
                         {voucher.max_discount_amount && (
                           <span>Max: Rp {voucher.max_discount_amount.toLocaleString()}</span>
                         )}
                         {isExpiringSoon && (
                           <span className="flex items-center gap-1 text-destructive">
                             <Clock className="h-3 w-3" />
                             {daysUntilExpiry <= 0 ? "Expires today" : `${daysUntilExpiry}d left`}
                           </span>
                         )}
                       </div>
 
                       <p className="text-sm font-bold text-primary mt-1">
                         Save Rp {voucher.potential_discount.toLocaleString()}
                       </p>
                     </div>
 
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => onApply(voucher.code)}
                       disabled={disabled}
                       className="shrink-0"
                     >
                       Apply
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