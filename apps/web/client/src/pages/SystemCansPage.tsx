import { FormEvent, useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Download, Plus, Printer, QrCode, Trash2, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { systemCansApi, type FacetOption, type SystemCan, type SystemCanFilters } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { Badge, type BadgeTone } from "../components/Badge";
import { Button } from "../components/Button";
import { DateRangeColumnFilter, OptionColumnFilter, TextColumnFilter, type DateRangeValue } from "../components/ColumnFilters";
import { DataTable, type Column } from "../components/Table";
import { Modal } from "../components/Modal";
import { PagePanel } from "../components/PagePanel";
import { Pagination } from "../components/Pagination";
import { formatDateTime } from "../utils/format";

const canStatuses = ["In warehouse", "Dispatched", "Collected"];
const canFilterStatuses = ["In warehouse", "Dispatched", "Collected"];

function countFor(options: FacetOption[] | undefined, value: string) {
  return options?.find((option) => option.value === value)?.count ?? 0;
}

function statusTone(status: string): BadgeTone {
  if (status === "Dispatched") return "teal";
  if (status === "Collected") return "green";
  return "yellow";
}

function downloadQrSvg(can: SystemCan) {
  const svg = document.getElementById(`can-qr-${can.id}`);
  if (!(svg instanceof SVGElement)) return;

  const source = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${can.canCode}-qr.svg`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function PrintStyles() {
  return (
    <style>
      {`@media print {
        body * { visibility: hidden !important; }
        .qr-print-area, .qr-print-area * { visibility: visible !important; }
        .qr-print-area { position: absolute; inset: 0; padding: 16px; background: white; }
        .qr-no-print { display: none !important; }
      }`}
    </style>
  );
}

function CanQrLabel({ can, large = false }: { can: SystemCan; large?: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-md border border-slate-300 bg-white p-4 text-center">
      <div className="mb-2 text-sm font-black">
        <span className="text-blue-600">Kithul</span>
        <span className="text-orange-500">Flow</span>
      </div>
      <QRCodeSVG
        id={large ? `can-qr-${can.id}` : undefined}
        value={can.canCode}
        size={large ? 220 : 132}
        level="M"
        includeMargin
      />
      <div className="mt-2 text-xl font-black tracking-wide text-slate-950">{can.canCode}</div>
      <div className="text-xs font-semibold text-slate-500">System Can</div>
    </div>
  );
}

function QrDialog({ cans, onClose }: { cans: SystemCan[]; onClose: () => void }) {
  const single = cans.length === 1 ? cans[0] : null;

  return (
    <Modal
      title={single ? `${single.canCode} QR code` : `QR labels (${cans.length})`}
      description="Scan this code from the mobile field collector app to select the can automatically."
      onClose={onClose}
      width={single ? "max-w-md" : "max-w-4xl"}
      footer={
        <div className="qr-no-print flex gap-2">
          <Button type="button" onClick={() => window.print()} icon={<Printer className="h-4 w-4" />}>
            Print
          </Button>
          {single ? (
            <Button type="button" variant="primary" onClick={() => downloadQrSvg(single)} icon={<Download className="h-4 w-4" />}>
              Download SVG
            </Button>
          ) : null}
        </div>
      }
    >
      <PrintStyles />
      <div className="qr-print-area">
        {single ? (
          <CanQrLabel can={single} large />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cans.map((can) => (
              <CanQrLabel key={can.id} can={can} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function AddCanDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [canCode, setCanCode] = useState("");
  const [status, setStatus] = useState("In warehouse");
  const [agentName, setAgentName] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      systemCansApi.create({
        canCode,
        status,
        agentName: agentName || null,
        reference: reference || null,
        note: "Created from admin panel"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-cans"] });
      onClose();
    },
    onError: (mutationError: Error) => setError(mutationError.message)
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    mutation.mutate();
  }

  return (
    <Modal
      title="Add can"
      description="Register a new reusable system can."
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose} icon={<X className="h-4 w-4" />}>
            Cancel
          </Button>
          <Button type="submit" form="can-form" variant="primary" disabled={mutation.isPending} icon={<Plus className="h-4 w-4" />}>
            Add can
          </Button>
        </>
      }
    >
      <form id="can-form" className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">
          Can code
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={canCode}
            onChange={(event) => setCanCode(event.target.value)}
            placeholder="e.g., AR630"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Status
          <select
            className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {canStatuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Agent name
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={agentName}
            onChange={(event) => setAgentName(event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Reference
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Optional"
          />
        </label>
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
      </form>
    </Modal>
  );
}

function HistoryDialog({ can, onClose }: { can: SystemCan; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.canHistory(can.id),
    queryFn: () => systemCansApi.history(can.id)
  });

  return (
    <Modal title={`${can.canCode} history`} description="Status changes and references for this can." onClose={onClose} width="max-w-2xl">
      {isLoading ? (
        <p className="text-sm text-slate-600">Loading history...</p>
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.12em]">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Agent</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {(data?.histories ?? []).map((history) => (
                <tr key={history.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{formatDateTime(history.createdAt)}</td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone(history.status)}>{history.status}</Badge>
                  </td>
                  <td className="px-3 py-2">{history.agentName || "-"}</td>
                  <td className="px-3 py-2">{history.reference || "-"}</td>
                  <td className="px-3 py-2">{history.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export function SystemCansPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<SystemCanFilters>({});
  const [addOpen, setAddOpen] = useState(false);
  const [historyCan, setHistoryCan] = useState<SystemCan | null>(null);
  const [qrCans, setQrCans] = useState<SystemCan[] | null>(null);
  const [selectedCanIds, setSelectedCanIds] = useState<Set<number>>(() => new Set());
  const queryClient = useQueryClient();
  const filterKey = JSON.stringify(filters);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.systemCans(page, pageSize, search, filterKey),
    queryFn: () => systemCansApi.list({ page, pageSize, search, filters })
  });
  const remove = useMutation({
    mutationFn: systemCansApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system-cans"] })
  });

  const updateFilter = useCallback((key: keyof SystemCanFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const updateDateRange = useCallback((value: DateRangeValue) => {
    setFilters((current) => ({ ...current, updatedFrom: value.from, updatedTo: value.to }));
    setPage(1);
  }, []);
  const pageRows = data?.data ?? [];
  const selectedPageCans = pageRows.filter((can) => selectedCanIds.has(can.id));
  const allPageSelected = pageRows.length > 0 && selectedPageCans.length === pageRows.length;

  const togglePageSelection = useCallback(
    (checked: boolean) => {
      setSelectedCanIds((current) => {
        const next = new Set(current);
        for (const can of pageRows) {
          if (checked) next.add(can.id);
          else next.delete(can.id);
        }
        return next;
      });
    },
    [pageRows]
  );

  const toggleCanSelection = useCallback((id: number, checked: boolean) => {
    setSelectedCanIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const columns = useMemo<Column<SystemCan>[]>(
    () => [
      {
        header: "",
        filterControl: (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            aria-label="Select all cans on page"
            checked={allPageSelected}
            onChange={(event) => togglePageSelection(event.target.checked)}
          />
        ),
        className: "w-12",
        accessor: (row) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            aria-label={`Select ${row.canCode}`}
            checked={selectedCanIds.has(row.id)}
            onChange={(event) => toggleCanSelection(row.id, event.target.checked)}
          />
        )
      },
      {
        header: "Can",
        filterControl: (
          <TextColumnFilter
            value={filters.canCode ?? ""}
            placeholder="Search cans"
            onChange={(value) => updateFilter("canCode", value)}
          />
        ),
        accessor: (row) => <span className="font-bold">{row.canCode}</span>
      },
      {
        header: "Status",
        filterControl: (
          <OptionColumnFilter
            value={filters.status ?? ""}
            allLabel={`All (${data?.total ?? 0})`}
            searchPlaceholder="Search status"
            options={canFilterStatuses.map((status) => ({
              label: status,
              value: status,
              count: countFor(data?.facets.statuses, status)
            }))}
            onChange={(value) => updateFilter("status", value)}
          />
        ),
        accessor: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      },
      {
        header: "Agent Name",
        filterControl: (
          <OptionColumnFilter
            value={filters.agentName ?? ""}
            allLabel={`All agents (${data?.total ?? 0})`}
            searchPlaceholder="Search agents"
            options={(data?.facets.agents ?? []).map((agent) => ({
              label: agent.value === "__NULL__" ? "N/A" : agent.value,
              value: agent.value,
              count: agent.count
            }))}
            onChange={(value) => updateFilter("agentName", value)}
          />
        ),
        accessor: (row) => row.agentName || "-"
      },
      {
        header: "Reference",
        filterControl: (
          <TextColumnFilter
            value={filters.reference ?? ""}
            placeholder="Search references"
            onChange={(value) => updateFilter("reference", value)}
          />
        ),
        accessor: (row) => row.reference || "-"
      },
      {
        header: "Last Updated",
        filterControl: (
          <DateRangeColumnFilter
            value={{ from: filters.updatedFrom ?? "", to: filters.updatedTo ?? "" }}
            onChange={updateDateRange}
          />
        ),
        accessor: (row) => formatDateTime(row.lastUpdated)
      },
      {
        header: "Actions",
        align: "right",
        accessor: (row) => (
          <div className="flex justify-end gap-2">
            <Button type="button" className="h-8" onClick={() => setQrCans([row])} icon={<QrCode className="h-4 w-4" />}>
              QR
            </Button>
            <Button type="button" className="h-8" onClick={() => setHistoryCan(row)} icon={<Clock3 className="h-4 w-4" />}>
              History
            </Button>
            <Button
              type="button"
              variant="danger"
              className="h-8"
              onClick={() => {
                if (confirm(`Delete ${row.canCode}?`)) remove.mutate(row.id);
              }}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Delete
            </Button>
          </div>
        )
      }
    ],
    [
      allPageSelected,
      data?.facets.agents,
      data?.facets.statuses,
      data?.total,
      filters,
      remove,
      selectedCanIds,
      toggleCanSelection,
      togglePageSelection,
      updateDateRange,
      updateFilter
    ]
  );

  return (
    <>
      <PagePanel
        toolbar={
          <>
            <input
              className="h-9 w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search cans"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled={selectedPageCans.length === 0}
                onClick={() => setQrCans(selectedPageCans)}
                icon={<QrCode className="h-4 w-4" />}
              >
                Generate QR labels
              </Button>
              <Button type="button" variant="primary" onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>
                Add can
              </Button>
            </div>
          </>
        }
      >
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          rowKey={(row) => row.id}
          empty={<span className="text-slate-500">{isLoading ? "Loading system cans..." : "No cans found"}</span>}
        />
        <Pagination
          page={data?.page ?? page}
          pageCount={data?.pageCount ?? 1}
          pageSize={pageSize}
          total={data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </PagePanel>
      {addOpen ? <AddCanDialog onClose={() => setAddOpen(false)} /> : null}
      {historyCan ? <HistoryDialog can={historyCan} onClose={() => setHistoryCan(null)} /> : null}
      {qrCans ? <QrDialog cans={qrCans} onClose={() => setQrCans(null)} /> : null}
    </>
  );
}
