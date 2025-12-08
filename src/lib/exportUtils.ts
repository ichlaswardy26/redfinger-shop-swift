import { format } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exportToCSV = (
  data: any[],
  columns: { key: string; header: string }[],
  filename: string
) => {
  if (data.length === 0) {
    return;
  }

  // Create CSV header
  const headers = columns.map(col => col.header).join(",");
  
  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = getNestedValue(item, col.key);
      // Escape quotes and wrap in quotes if contains comma or newline
      const stringValue = formatValue(value);
      if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(",");
  }).join("\n");

  const csv = `${headers}\n${rows}`;
  
  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getNestedValue = (obj: any, path: string): unknown => {
  return path.split(".").reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return format(value, "yyyy-MM-dd HH:mm:ss");
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
