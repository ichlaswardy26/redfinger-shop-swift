import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Search, X, Download, CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { t } from "@/lib/translations";

interface FilterOption {
  label: string;
  value: string;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DataTableFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Array<{
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }>;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  showDateFilter?: boolean;
  onReset?: () => void;
  onExport?: () => void;
  exportLabel?: string;
}

export const DataTableFilters = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  dateRange,
  onDateRangeChange,
  showDateFilter = false,
  onReset,
  onExport,
  exportLabel = "Export CSV"
}: DataTableFiltersProps) => {
  // Count active filters
  const activeFilterCount = [
    searchValue ? 1 : 0,
    ...filters.map(f => (f.value && f.value !== 'all') ? 1 : 0),
    (dateRange?.from || dateRange?.to) ? 1 : 0
  ].reduce((a, b) => a + b, 0);
  
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          {filters.map((filter) => (
            <Select
              key={filter.key}
              value={filter.value}
              onValueChange={filter.onChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label}</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {showDateFilter && onDateRangeChange && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dateRange?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>{t.additional.pickDateRange}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={{ from: dateRange?.from, to: dateRange?.to }}
                  onSelect={(range) => onDateRangeChange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          {hasActiveFilters && onReset && (
            <Button variant="outline" size="sm" onClick={onReset} className="gap-1">
              <Filter className="h-4 w-4" />
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
              <X className="h-4 w-4" />
              {t.additional.clearFilters}
            </Button>
          )}
        </div>

        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            {exportLabel}
          </Button>
        )}
      </div>
    </div>
  );
};