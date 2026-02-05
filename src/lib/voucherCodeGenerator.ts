 // Character set excluding confusing characters (0/O, 1/I/L)
 const CHAR_SET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
 
 /**
  * Generate a single random code using crypto-secure random values
  */
 export function generateRandomCode(length: number): string {
   let code = "";
   const array = new Uint8Array(length);
   crypto.getRandomValues(array);
   for (let i = 0; i < length; i++) {
     code += CHAR_SET[array[i] % CHAR_SET.length];
   }
   return code;
 }
 
 export type CodePattern = "prefix-random" | "sequential" | "random";
 
 export interface CodeGeneratorOptions {
   prefix?: string;
   codeLength: number;
   startSequence?: number;
 }
 
 /**
  * Generate multiple unique codes based on the specified pattern
  */
 export function generateBulkCodes(
   quantity: number,
   pattern: CodePattern,
   options: CodeGeneratorOptions
 ): string[] {
   const codes = new Set<string>();
   let sequenceNumber = options.startSequence || 1;
   
   // Safety limit to prevent infinite loops
   const maxAttempts = quantity * 10;
   let attempts = 0;
   
   while (codes.size < quantity && attempts < maxAttempts) {
     let code: string;
     
     switch (pattern) {
       case "prefix-random":
         code = options.prefix 
           ? `${options.prefix.toUpperCase()}-${generateRandomCode(options.codeLength)}`
           : generateRandomCode(options.codeLength);
         break;
       case "sequential":
         const paddedNum = String(sequenceNumber).padStart(4, "0");
         code = options.prefix 
           ? `${options.prefix.toUpperCase()}${paddedNum}`
           : `CODE${paddedNum}`;
         sequenceNumber++;
         break;
       case "random":
       default:
         code = generateRandomCode(options.codeLength);
         break;
     }
     
     codes.add(code);
     attempts++;
   }
   
   return Array.from(codes);
 }
 
 /**
  * Generate preview codes for the UI
  */
 export function generatePreviewCodes(
   pattern: CodePattern,
   options: CodeGeneratorOptions,
   count: number = 3
 ): string[] {
   return generateBulkCodes(count, pattern, options);
 }
 
 /**
  * Export codes to CSV format
  */
 export function exportCodesToCSV(
   codes: string[],
   campaignName: string,
   discountType: string,
   discountValue: number,
   validFrom: string,
   validUntil: string
 ): string {
   const headers = "code,name,discount_type,discount_value,valid_from,valid_until,campaign";
   const rows = codes.map(code => 
     `${code},"${campaignName}",${discountType},${discountValue},${validFrom},${validUntil},"${campaignName}"`
   );
   return [headers, ...rows].join("\n");
 }
 
 /**
  * Download CSV file
  */
 export function downloadCSV(content: string, filename: string): void {
   const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
   const link = document.createElement("a");
   const url = URL.createObjectURL(blob);
   link.setAttribute("href", url);
   link.setAttribute("download", filename);
   link.style.visibility = "hidden";
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
 }