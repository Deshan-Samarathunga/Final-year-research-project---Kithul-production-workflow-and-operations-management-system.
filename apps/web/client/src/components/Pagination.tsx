import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "./Button";

export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="mt-auto flex min-h-[58px] shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-3 text-sm text-slate-700">
      <div className="flex items-center gap-3">
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Rows per page"
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>
          Showing {start}-{end} of {total}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="mr-2">
          Page {page} of {pageCount}
        </span>
        <Button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Previous
        </Button>
        <Button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          icon={<ArrowRight className="h-4 w-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
