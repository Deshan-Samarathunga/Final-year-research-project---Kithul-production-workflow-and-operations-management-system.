import type { ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { clsx } from "clsx";

export type Column<T> = {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  filter?: "search" | "sort" | "date" | "none";
  filterControl?: ReactNode;
};

export function DataTable<T>({
  columns,
  data,
  empty,
  rowKey
}: {
  columns: Column<T>[];
  data: T[];
  empty?: ReactNode;
  rowKey: (row: T) => string | number;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto border-y border-slate-300">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-900">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                className={clsx(
                  "border-r border-slate-300 px-2 py-1.5 font-bold last:border-r-0",
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                  column.className
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {column.header}
                  {column.filterControl ? (
                    column.filterControl
                  ) : column.filter && column.filter !== "none" ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-slate-300 bg-white text-slate-600">
                      {column.filter === "search" ? (
                        <Search className="h-3.5 w-3.5" />
                      ) : (
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      )}
                    </span>
                  ) : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row) => (
              <tr key={rowKey(row)} className="border-t border-slate-300 bg-white hover:bg-slate-50">
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={clsx(
                      "border-r border-slate-300 px-2 py-2.5 last:border-r-0",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.className
                    )}
                  >
                    {column.accessor(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-[40rem] bg-white px-4 text-center">
                {empty ?? <span className="text-slate-500">No records found</span>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
