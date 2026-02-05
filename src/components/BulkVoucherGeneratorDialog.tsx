 import { useState, useEffect, useMemo } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Progress } from "@/components/ui/progress";
 import { Calendar } from "@/components/ui/calendar";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { Badge } from "@/components/ui/badge";
 import { cn } from "@/lib/utils";
 import { format, addMonths } from "date-fns";
 import { 
   CalendarIcon, Loader2, Package, Check, Copy, Download,
   Percent, Banknote
 } from "lucide-react";
 import {
   generateBulkCodes,
   generatePreviewCodes,
   exportCodesToCSV,
   downloadCSV,
   type CodePattern,
 } from "@/lib/voucherCodeGenerator";
 
 interface BulkVoucherGeneratorDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onComplete: () => void;
 }
 
 type GenerationStep = "configure" | "generating" | "complete";
 
 export const BulkVoucherGeneratorDialog = ({
   open,
   onOpenChange,
   onComplete,
 }: BulkVoucherGeneratorDialogProps) => {
   const { toast } = useToast();
   
   // Configuration state
   const [campaignName, setCampaignName] = useState("");
   const [quantity, setQuantity] = useState(10);
   const [codePattern, setCodePattern] = useState<CodePattern>("prefix-random");
   const [codeLength, setCodeLength] = useState(6);
   const [prefix, setPrefix] = useState("");
   const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
   const [discountValue, setDiscountValue] = useState(10);
   const [minOrderAmount, setMinOrderAmount] = useState(0);
   const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | undefined>();
   const [perUserLimit, setPerUserLimit] = useState(1);
   const [validFrom, setValidFrom] = useState<Date>(new Date());
   const [validUntil, setValidUntil] = useState<Date>(addMonths(new Date(), 1));
   const [isActive, setIsActive] = useState(true);
   const [firstOrderOnly, setFirstOrderOnly] = useState(false);
   const [singleUse, setSingleUse] = useState(true);
   
   // Generation state
   const [step, setStep] = useState<GenerationStep>("configure");
   const [progress, setProgress] = useState(0);
   const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
   const [copiedAll, setCopiedAll] = useState(false);
   
   // Preview codes
   const previewCodes = useMemo(() => {
     return generatePreviewCodes(codePattern, { prefix, codeLength }, 3);
   }, [codePattern, prefix, codeLength]);
   
   // Reset state when dialog closes
   useEffect(() => {
     if (!open) {
       setTimeout(() => {
         setStep("configure");
         setProgress(0);
         setGeneratedCodes([]);
         setCopiedAll(false);
       }, 300);
     }
   }, [open]);
   
   const handleGenerate = async () => {
     if (!campaignName.trim()) {
       toast({ title: "Please enter a campaign name", variant: "destructive" });
       return;
     }
     
     if (quantity < 1 || quantity > 1000) {
       toast({ title: "Quantity must be between 1 and 1000", variant: "destructive" });
       return;
     }
     
     setStep("generating");
     setProgress(0);
     
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("Not authenticated");
       
       // Generate unique codes
       const codes = generateBulkCodes(quantity, codePattern, { prefix, codeLength });
       
       // Check for existing codes
       const { data: existingCodes } = await supabase
         .from("vouchers")
         .select("code")
         .in("code", codes);
       
       const existingSet = new Set(existingCodes?.map(v => v.code) || []);
       const uniqueCodes = codes.filter(code => !existingSet.has(code));
       
       if (uniqueCodes.length < codes.length) {
         // Regenerate colliding codes
         const needed = codes.length - uniqueCodes.length;
         const extraCodes = generateBulkCodes(needed + 10, codePattern, { 
           prefix, 
           codeLength,
           startSequence: quantity + 1 
         });
         
         for (const code of extraCodes) {
           if (!existingSet.has(code) && !uniqueCodes.includes(code)) {
             uniqueCodes.push(code);
             if (uniqueCodes.length >= quantity) break;
           }
         }
       }
       
       const finalCodes = uniqueCodes.slice(0, quantity);
       const batchId = crypto.randomUUID();
       
       // Insert in chunks of 50
       const chunkSize = 50;
       const chunks: string[][] = [];
       for (let i = 0; i < finalCodes.length; i += chunkSize) {
         chunks.push(finalCodes.slice(i, i + chunkSize));
       }
       
       let inserted = 0;
       for (const chunk of chunks) {
         const vouchers = chunk.map(code => ({
           code,
           name: campaignName,
           description: `Bulk generated - Campaign: ${campaignName}`,
           discount_type: discountType,
           discount_value: discountValue,
           min_order_amount: minOrderAmount,
           max_discount_amount: discountType === "percentage" ? maxDiscountAmount : null,
           usage_limit: singleUse ? 1 : null,
           per_user_limit: perUserLimit,
           valid_from: validFrom.toISOString(),
           valid_until: validUntil.toISOString(),
           is_active: isActive,
           first_order_only: firstOrderOnly,
           campaign_id: campaignName.replace(/\s+/g, "_").toUpperCase(),
           batch_id: batchId,
           created_by: user.id,
         }));
         
         const { error } = await supabase.from("vouchers").insert(vouchers);
         if (error) throw error;
         
         inserted += chunk.length;
         setProgress(Math.round((inserted / finalCodes.length) * 100));
       }
       
       setGeneratedCodes(finalCodes);
       setStep("complete");
       toast({ title: `Successfully generated ${finalCodes.length} vouchers!` });
       
     } catch (error) {
       console.error("Error generating vouchers:", error);
       toast({ 
         title: "Error generating vouchers", 
         description: error instanceof Error ? error.message : "Unknown error",
         variant: "destructive" 
       });
       setStep("configure");
     }
   };
   
   const handleCopyAll = () => {
     navigator.clipboard.writeText(generatedCodes.join("\n"));
     setCopiedAll(true);
     setTimeout(() => setCopiedAll(false), 2000);
     toast({ title: "All codes copied to clipboard" });
   };
   
   const handleDownloadCSV = () => {
     const csv = exportCodesToCSV(
       generatedCodes,
       campaignName,
       discountType,
       discountValue,
       format(validFrom, "yyyy-MM-dd"),
       format(validUntil, "yyyy-MM-dd")
     );
     downloadCSV(csv, `vouchers_${campaignName.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.csv`);
     toast({ title: "CSV downloaded" });
   };
   
   const handleClose = () => {
     if (step === "complete") {
       onComplete();
     }
     onOpenChange(false);
   };
   
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Package className="h-5 w-5" />
             Bulk Voucher Generator
           </DialogTitle>
           <DialogDescription>
             Generate multiple voucher codes for promotional campaigns
           </DialogDescription>
         </DialogHeader>
         
         {step === "configure" && (
           <div className="space-y-6">
             {/* Campaign Settings */}
             <div className="space-y-4">
               <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                 Campaign Settings
               </h3>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="campaignName">Campaign Name *</Label>
                   <Input
                     id="campaignName"
                     value={campaignName}
                     onChange={(e) => setCampaignName(e.target.value)}
                     placeholder="February Sale 2024"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="quantity">Number of Vouchers *</Label>
                   <Input
                     id="quantity"
                     type="number"
                     min={1}
                     max={1000}
                     value={quantity}
                     onChange={(e) => setQuantity(Number(e.target.value))}
                   />
                 </div>
               </div>
             </div>
             
             {/* Code Format */}
             <div className="space-y-4">
               <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                 Code Format
               </h3>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Code Pattern</Label>
                   <RadioGroup
                     value={codePattern}
                     onValueChange={(v) => setCodePattern(v as CodePattern)}
                     className="space-y-2"
                   >
                     <div className="flex items-center space-x-2">
                       <RadioGroupItem value="prefix-random" id="prefix-random" />
                       <Label htmlFor="prefix-random" className="cursor-pointer">
                         Prefix + Random
                       </Label>
                     </div>
                     <div className="flex items-center space-x-2">
                       <RadioGroupItem value="sequential" id="sequential" />
                       <Label htmlFor="sequential" className="cursor-pointer">
                         Sequential
                       </Label>
                     </div>
                     <div className="flex items-center space-x-2">
                       <RadioGroupItem value="random" id="random" />
                       <Label htmlFor="random" className="cursor-pointer">
                         Full Random
                       </Label>
                     </div>
                   </RadioGroup>
                 </div>
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <Label htmlFor="prefix">Prefix (optional)</Label>
                     <Input
                       id="prefix"
                       value={prefix}
                       onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                       placeholder="FEB24"
                       maxLength={10}
                     />
                   </div>
                   {codePattern !== "sequential" && (
                     <div className="space-y-2">
                       <Label htmlFor="codeLength">Code Length</Label>
                       <Input
                         id="codeLength"
                         type="number"
                         min={4}
                         max={12}
                         value={codeLength}
                         onChange={(e) => setCodeLength(Number(e.target.value))}
                       />
                     </div>
                   )}
                   <div className="space-y-2">
                     <Label>Preview</Label>
                     <div className="flex flex-wrap gap-1">
                       {previewCodes.map((code, i) => (
                         <Badge key={i} variant="secondary" className="font-mono text-xs">
                           {code}
                         </Badge>
                       ))}
                     </div>
                   </div>
                 </div>
               </div>
             </div>
             
             {/* Discount Settings */}
             <div className="space-y-4">
               <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                 Discount Settings
               </h3>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Discount Type</Label>
                   <RadioGroup
                     value={discountType}
                     onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}
                     className="flex gap-4"
                   >
                     <div className="flex items-center space-x-2">
                       <RadioGroupItem value="percentage" id="percentage" />
                       <Label htmlFor="percentage" className="cursor-pointer flex items-center gap-1">
                         <Percent className="h-3 w-3" /> Percentage
                       </Label>
                     </div>
                     <div className="flex items-center space-x-2">
                       <RadioGroupItem value="fixed" id="fixed" />
                       <Label htmlFor="fixed" className="cursor-pointer flex items-center gap-1">
                         <Banknote className="h-3 w-3" /> Fixed
                       </Label>
                     </div>
                   </RadioGroup>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="discountValue">
                     Discount Value {discountType === "percentage" ? "(%)" : "(Rp)"}
                   </Label>
                   <Input
                     id="discountValue"
                     type="number"
                     min={1}
                     value={discountValue}
                     onChange={(e) => setDiscountValue(Number(e.target.value))}
                   />
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="minOrder">Min. Order (Rp)</Label>
                   <Input
                     id="minOrder"
                     type="number"
                     min={0}
                     value={minOrderAmount}
                     onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                   />
                 </div>
                 {discountType === "percentage" && (
                   <div className="space-y-2">
                     <Label htmlFor="maxDiscount">Max Discount (Rp)</Label>
                     <Input
                       id="maxDiscount"
                       type="number"
                       min={0}
                       value={maxDiscountAmount || ""}
                       onChange={(e) => setMaxDiscountAmount(e.target.value ? Number(e.target.value) : undefined)}
                       placeholder="No limit"
                     />
                   </div>
                 )}
                 <div className="space-y-2">
                   <Label htmlFor="perUserLimit">Per User Limit</Label>
                   <Input
                     id="perUserLimit"
                     type="number"
                     min={1}
                     value={perUserLimit}
                     onChange={(e) => setPerUserLimit(Number(e.target.value))}
                   />
                 </div>
               </div>
             </div>
             
             {/* Validity Period */}
             <div className="space-y-4">
               <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                 Validity Period
               </h3>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Valid From</Label>
                   <Popover>
                     <PopoverTrigger asChild>
                       <Button
                         variant="outline"
                         className={cn(
                           "w-full justify-start text-left font-normal",
                           !validFrom && "text-muted-foreground"
                         )}
                       >
                         <CalendarIcon className="mr-2 h-4 w-4" />
                         {validFrom ? format(validFrom, "PPP") : "Pick a date"}
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0" align="start">
                       <Calendar
                         mode="single"
                         selected={validFrom}
                         onSelect={(date) => date && setValidFrom(date)}
                         initialFocus
                       />
                     </PopoverContent>
                   </Popover>
                 </div>
                 <div className="space-y-2">
                   <Label>Valid Until</Label>
                   <Popover>
                     <PopoverTrigger asChild>
                       <Button
                         variant="outline"
                         className={cn(
                           "w-full justify-start text-left font-normal",
                           !validUntil && "text-muted-foreground"
                         )}
                       >
                         <CalendarIcon className="mr-2 h-4 w-4" />
                         {validUntil ? format(validUntil, "PPP") : "Pick a date"}
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0" align="start">
                       <Calendar
                         mode="single"
                         selected={validUntil}
                         onSelect={(date) => date && setValidUntil(date)}
                         initialFocus
                       />
                     </PopoverContent>
                   </Popover>
                 </div>
               </div>
             </div>
             
             {/* Options */}
             <div className="space-y-4">
               <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                 Options
               </h3>
               <div className="space-y-3">
                 <div className="flex items-center space-x-2">
                   <Checkbox
                     id="isActive"
                     checked={isActive}
                     onCheckedChange={(checked) => setIsActive(checked as boolean)}
                   />
                   <Label htmlFor="isActive" className="cursor-pointer">
                     Active (start immediately)
                   </Label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Checkbox
                     id="firstOrderOnly"
                     checked={firstOrderOnly}
                     onCheckedChange={(checked) => setFirstOrderOnly(checked as boolean)}
                   />
                   <Label htmlFor="firstOrderOnly" className="cursor-pointer">
                     First Order Only
                   </Label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Checkbox
                     id="singleUse"
                     checked={singleUse}
                     onCheckedChange={(checked) => setSingleUse(checked as boolean)}
                   />
                   <Label htmlFor="singleUse" className="cursor-pointer">
                     Each code is single-use (usage_limit = 1)
                   </Label>
                 </div>
               </div>
             </div>
             
             <div className="flex justify-end gap-3 pt-4 border-t">
               <Button variant="outline" onClick={() => onOpenChange(false)}>
                 Cancel
               </Button>
               <Button onClick={handleGenerate}>
                 <Package className="h-4 w-4 mr-2" />
                 Generate {quantity} Vouchers
               </Button>
             </div>
           </div>
         )}
         
         {step === "generating" && (
           <div className="py-12 text-center space-y-6">
             <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
             <div className="space-y-2">
               <p className="text-lg font-medium">Generating Vouchers...</p>
               <Progress value={progress} className="w-64 mx-auto" />
               <p className="text-sm text-muted-foreground">
                 {Math.round((progress / 100) * quantity)} of {quantity} vouchers created
               </p>
             </div>
           </div>
         )}
         
         {step === "complete" && (
           <div className="py-6 space-y-6">
             <div className="text-center space-y-4">
               <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                 <Check className="h-8 w-8 text-primary" />
               </div>
               <div>
                 <p className="text-lg font-bold">
                   Successfully Generated {generatedCodes.length} Vouchers!
                 </p>
                 <p className="text-muted-foreground">Campaign: {campaignName}</p>
                 <p className="text-sm text-muted-foreground">
                   {discountType === "percentage" ? `${discountValue}% off` : `Rp ${discountValue.toLocaleString()} off`}
                   {" • "}
                   Valid: {format(validFrom, "MMM d")} - {format(validUntil, "MMM d, yyyy")}
                 </p>
               </div>
             </div>
             
             <div className="flex justify-center gap-3">
               <Button variant="outline" onClick={handleDownloadCSV}>
                 <Download className="h-4 w-4 mr-2" />
                 Download CSV
               </Button>
               <Button variant="outline" onClick={handleCopyAll}>
                 {copiedAll ? (
                   <Check className="h-4 w-4 mr-2" />
                 ) : (
                   <Copy className="h-4 w-4 mr-2" />
                 )}
                 {copiedAll ? "Copied!" : "Copy All Codes"}
               </Button>
             </div>
             
             <div className="space-y-2">
               <Label className="text-sm text-muted-foreground">
                 Preview (first 10 of {generatedCodes.length}):
               </Label>
               <div className="flex flex-wrap gap-1.5 p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
                 {generatedCodes.slice(0, 10).map((code, i) => (
                   <Badge key={i} variant="secondary" className="font-mono text-xs">
                     {code}
                   </Badge>
                 ))}
                 {generatedCodes.length > 10 && (
                   <Badge variant="outline" className="text-xs">
                     +{generatedCodes.length - 10} more
                   </Badge>
                 )}
               </div>
             </div>
             
             <div className="flex justify-center pt-4 border-t">
               <Button onClick={handleClose}>Close</Button>
             </div>
           </div>
         )}
       </DialogContent>
     </Dialog>
   );
 };