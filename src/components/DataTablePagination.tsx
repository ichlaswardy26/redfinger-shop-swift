import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "@/lib/translations";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  showRowCount?: boolean;
}

export function DataTablePagination<TData>({ table, showRowCount = true }: DataTablePaginationProps<TData>) {
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  // Handle empty state
  if (totalRows === 0) {
    return (
      <div className="flex items-center justify-center px-2 py-4">
        <p className="text-sm text-muted-foreground">{t.table.noResults}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
      <div className="flex items-center gap-4">
        {showRowCount && (
          <p className="text-sm text-muted-foreground">
            {totalRows} result{totalRows !== 1 ? 's' : ''}
          </p>
        )}
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {t.additional.rowsPerPageLabel}
          </p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">
          {t.ui.page} {currentPage} {t.ui.ofPages} {pageCount || 1}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className="h-8 w-8 p-0 hidden sm:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 hidden sm:flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
