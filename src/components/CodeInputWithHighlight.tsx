import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface CodeInputWithHighlightProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  requiredCount: number;
  allCodesAcrossOrders?: string[]; // For cross-order duplicate detection
}

interface LineStatus {
  code: string;
  isDuplicate: boolean;
  isIntraOrderDuplicate: boolean; // Duplicate within same order
  isCrossOrderDuplicate: boolean; // Duplicate across orders
}

export const CodeInputWithHighlight = ({
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled = false,
  requiredCount,
  allCodesAcrossOrders = [],
}: CodeInputWithHighlightProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [lineStatuses, setLineStatuses] = useState<LineStatus[]>([]);

  // Analyze codes for duplicates
  const analyzeLines = useCallback(() => {
    const lines = value.split('\n');
    const trimmedLines = lines.map(l => l.trim());
    const normalizedLines = trimmedLines.map(l => l.toLowerCase());
    
    // Build cross-order codes set (excluding current order's codes)
    const crossOrderSet = new Set(
      allCodesAcrossOrders.map(c => c.toLowerCase())
    );

    const statuses: LineStatus[] = lines.map((line, index) => {
      const code = line.trim();
      const normalizedCode = code.toLowerCase();
      
      if (!code) {
        return { code, isDuplicate: false, isIntraOrderDuplicate: false, isCrossOrderDuplicate: false };
      }

      // Check intra-order duplicates (same code appears multiple times in this order)
      const firstIndex = normalizedLines.findIndex(l => l === normalizedCode);
      const isIntraOrderDuplicate = firstIndex !== index && firstIndex !== -1;

      // Check cross-order duplicates
      const isCrossOrderDuplicate = crossOrderSet.has(normalizedCode);

      return {
        code,
        isDuplicate: isIntraOrderDuplicate || isCrossOrderDuplicate,
        isIntraOrderDuplicate,
        isCrossOrderDuplicate,
      };
    });

    setLineStatuses(statuses);
  }, [value, allCodesAcrossOrders]);

  useEffect(() => {
    analyzeLines();
  }, [analyzeLines]);

  // Sync scroll between textarea and overlay
  const handleScroll = () => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const duplicateCount = lineStatuses.filter(s => s.isDuplicate).length;
  const validCodeCount = lineStatuses.filter(s => s.code.length > 0).length;
  const isCountCorrect = validCodeCount === requiredCount;

  return (
    <div className="space-y-1">
      <div className="relative">
        {/* Line indicators overlay */}
        <div 
          ref={overlayRef}
          className="absolute left-0 top-0 w-8 h-full overflow-hidden pointer-events-none border-r border-border bg-muted/30 rounded-l-md"
          style={{ height: `${Math.min(rows, 5) * 1.5}rem` }}
        >
          <div className="flex flex-col py-2">
            {lineStatuses.map((status, index) => (
              <div 
                key={index} 
                className="h-6 flex items-center justify-center text-xs"
              >
                {status.code && (
                  status.isDuplicate ? (
                    <div 
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center",
                        status.isCrossOrderDuplicate 
                          ? "bg-destructive/20 text-destructive" 
                          : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      )}
                      title={
                        status.isCrossOrderDuplicate 
                          ? "Duplicate: used in another order" 
                          : "Duplicate: appears multiple times"
                      }
                    >
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500/20 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50 font-mono",
            duplicateCount > 0 && "border-destructive focus-visible:ring-destructive"
          )}
          style={{ lineHeight: '1.5rem' }}
        />

        {/* Duplicate highlight overlay - positioned over textarea */}
        <div 
          className="absolute left-10 right-3 top-2 pointer-events-none overflow-hidden"
          style={{ height: `calc(${Math.min(rows, 5) * 1.5}rem - 1rem)` }}
        >
          {lineStatuses.map((status, index) => (
            <div 
              key={index}
              className={cn(
                "h-6 -mx-1 px-1 rounded transition-colors",
                status.isDuplicate && status.code && "bg-destructive/10"
              )}
              style={{ lineHeight: '1.5rem' }}
            />
          ))}
        </div>
      </div>

      {/* Status summary */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {duplicateCount > 0 ? (
            <span className="text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''} detected
            </span>
          ) : validCodeCount > 0 ? (
            <span className="text-green-600 dark:text-green-500 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              No duplicates
            </span>
          ) : null}
        </div>
        
        <span className={cn(
          "flex items-center gap-1",
          isCountCorrect 
            ? "text-green-600 dark:text-green-500" 
            : validCodeCount > 0 
              ? "text-amber-500 dark:text-amber-400" 
              : "text-muted-foreground"
        )}>
          {validCodeCount}/{requiredCount} codes
        </span>
      </div>
    </div>
  );
};
