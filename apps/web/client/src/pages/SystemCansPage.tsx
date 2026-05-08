import { FormEvent, useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Plus, Trash2, X } from "lucide-react";
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

const canStatuses = ["In warehouse", "Dispatched", "Lost", "Retired"];
const canFilterStatuses = ["In warehouse", "Dispatched", "Collected", "Lost", "Retired"];

function countFor(options: FacetOption[] | undefined, value: string) {
  return options?.find((option) => option.value === value)?.count ?? 0;
}

function statusTone(status: string): BadgeTone {
  if (status === "Dispatched") return "teal";
  if (status === "Lost") return "red";
  if (status === "Retired") return "slate";
  return "yellow";
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

  const columns = useMemo<Column<SystemCan>[]>(
    () => [
      {
        header: "",
        filter: "none",
        className: "w-12",
        accessor: () => <input type="checkbox" className="h-4 w-4 rounded border-slate-300" aria-label="Select can" />
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
    [data?.facets.agents, data?.facets.statuses, data?.total, filters, remove, updateDateRange, updateFilter]
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
            <Button type="button" variant="primary" onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>
              Add can
            </Button>
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
    </>
  );
}
