import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, Check, Search, SlidersHorizontal } from "lucide-react";

type PopoverPosition = {
  top: number;
  left: number;
};

function FilterPopover({
  icon,
  active,
  width = 288,
  children
}: {
  icon: ReactNode;
  active?: boolean;
  width?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const preferredLeft = rect.left + rect.width / 2 - width / 2;
    const maxLeft = window.innerWidth - width - 12;
    setPosition({
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(preferredLeft, maxLeft))
    });
  }, [open, width]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => window.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-sm border bg-white ${
          active ? "border-blue-400 text-blue-700 ring-2 ring-blue-100" : "border-slate-300 text-slate-600"
        }`}
        onClick={() => setOpen((value) => !value)}
      >
        {icon}
      </button>
      {open ? (
        <div
          ref={panelRef}
          className="fixed z-[80] rounded-md border border-slate-200 bg-white text-sm normal-case tracking-normal text-slate-800 shadow-2xl"
          style={{ top: position.top, left: position.left, width }}
        >
          {children}
        </div>
      ) : null}
    </>
  );
}

export function TextColumnFilter({
  value,
  placeholder,
  onChange
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <FilterPopover icon={<Search className="h-3.5 w-3.5" />} active={Boolean(value)}>
      <div className="p-2">
        <div className="flex items-center gap-2">
          <input
            className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onChange(draft.trim());
            }}
            placeholder={placeholder}
          />
          <button type="button" className="text-xs font-bold text-blue-600" onClick={() => {
            setDraft("");
            onChange("");
          }}>
            Clear
          </button>
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white"
            onClick={() => onChange(draft.trim())}
          >
            Apply
          </button>
        </div>
      </div>
    </FilterPopover>
  );
}

export type FilterOption = {
  label: string;
  value: string;
  count?: number;
};

export function OptionColumnFilter({
  value,
  allLabel,
  searchPlaceholder,
  options,
  onChange
}: {
  value: string;
  allLabel: string;
  searchPlaceholder: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visibleOptions = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));

  function optionText(option: FilterOption) {
    return option.count === undefined ? option.label : `${option.label} (${option.count})`;
  }

  return (
    <FilterPopover icon={<SlidersHorizontal className="h-3.5 w-3.5" />} active={Boolean(value)}>
      <div className="p-2">
        <div className="flex items-center gap-2">
          <input
            className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
          />
          <button type="button" className="text-xs font-bold text-blue-600" onClick={() => {
            setQuery("");
            onChange("");
          }}>
            Clear
          </button>
        </div>
      </div>
      <div className="max-h-72 overflow-auto pb-2">
        <button
          type="button"
          className={`flex w-full items-center justify-between px-3 py-2 text-left ${!value ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"}`}
          onClick={() => onChange("")}
        >
          <span>{allLabel}</span>
          {!value ? <Check className="h-4 w-4" /> : null}
        </button>
        {visibleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`flex w-full items-center justify-between px-3 py-2 text-left ${
              value === option.value ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
            }`}
            onClick={() => onChange(option.value)}
          >
            <span>{optionText(option)}</span>
            {value === option.value ? <Check className="h-4 w-4" /> : null}
          </button>
        ))}
      </div>
    </FilterPopover>
  );
}

export type DateRangeValue = {
  from: string;
  to: string;
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function shiftDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

const datePresets = [
  { label: "Today", range: () => ({ from: toDateInput(new Date()), to: toDateInput(new Date()) }) },
  { label: "Last 7 Days", range: () => ({ from: toDateInput(shiftDays(6)), to: toDateInput(new Date()) }) },
  { label: "Last 30 Days", range: () => ({ from: toDateInput(shiftDays(29)), to: toDateInput(new Date()) }) },
  { label: "This Month", range: () => ({ from: toDateInput(startOfMonth(new Date())), to: toDateInput(new Date()) }) },
  {
    label: "Last Month",
    range: () => {
      const now = new Date();
      const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: toDateInput(startOfMonth(previous)), to: toDateInput(endOfMonth(previous)) };
    }
  }
];

export function DateRangeColumnFilter({
  value,
  onChange
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  const [draft, setDraft] = useState(value);
  const active = Boolean(value.from || value.to);

  useEffect(() => setDraft(value), [value]);

  return (
    <FilterPopover icon={<CalendarDays className="h-3.5 w-3.5" />} active={active} width={520}>
      <div className="grid grid-cols-[160px_1fr]">
        <div className="border-r border-slate-200">
          {datePresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="block w-full border-b border-slate-200 px-3 py-3 text-left font-semibold hover:bg-blue-50 hover:text-blue-700"
              onClick={() => setDraft(preset.range())}
            >
              {preset.label}
            </button>
          ))}
          <div className="border-l-4 border-blue-600 bg-blue-50 px-3 py-4 font-bold text-blue-700">Custom Range</div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              From
              <input
                type="date"
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal tracking-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={draft.from}
                onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              To
              <input
                type="date"
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal tracking-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={draft.to}
                onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
              />
            </label>
          </div>
          <p className="mt-12 text-slate-500">
            {draft.from || draft.to ? `${draft.from || "..."} to ${draft.to || "..."}` : "Select a date range"}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-200 px-4 py-2 font-semibold"
              onClick={() => {
                setDraft({ from: "", to: "" });
                onChange({ from: "", to: "" });
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 font-bold text-white"
              onClick={() => onChange(draft)}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </FilterPopover>
  );
}
