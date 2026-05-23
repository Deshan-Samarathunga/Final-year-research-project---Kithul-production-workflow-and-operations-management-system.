import { FormEvent, useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Calendar, Plus, Search, X } from "lucide-react";
import { centersApi, fieldCollectionApi, type FieldCollectionFilters, type IssueNote } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { Button } from "../components/Button";
import { DateRangeColumnFilter, OptionColumnFilter, TextColumnFilter, type DateRangeValue } from "../components/ColumnFilters";
import { DataTable, type Column } from "../components/Table";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { PagePanel } from "../components/PagePanel";
import { Pagination } from "../components/Pagination";
import { formatDate } from "../utils/format";

const issueTypes = ["Field collection", "Direct collection", "Transfer return"];

function countFor(options: { value: string; count: number }[] | undefined, value: string) {
  return options?.find((option) => option.value === value)?.count ?? 0;
}

export function FieldCollectionTabs({
  status,
  active,
  completed,
  onStatusChange
}: {
  status: "Active" | "Completed";
  active: number;
  completed: number;
  onStatusChange: (status: "Active" | "Completed") => void;
}) {
  return (
    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
      {[
        ["Active", active],
        ["Completed", completed]
      ].map(([label, count]) => {
        const selected = status === label;
        return (
          <button
            key={label}
            type="button"
            className={`flex h-8 items-center gap-4 rounded px-4 text-sm font-semibold ${
              selected ? "bg-blue-600 text-white" : "text-slate-700"
            }`}
            onClick={() => onStatusChange(label as "Active" | "Completed")}
          >
            {label}
            <span className={`rounded-md px-2 py-0.5 text-xs ${selected ? "bg-white text-blue-700" : "bg-white text-slate-900"}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function IssueNoteDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [issueNoteName, setIssueNoteName] = useState("");
  const [collectionDate, setCollectionDate] = useState("2026-05-03");
  const [centerId, setCenterId] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const { data: centers } = useQuery({
    queryKey: queryKeys.centers(1, 100, ""),
    queryFn: () => centersApi.list({ page: 1, pageSize: 100 })
  });
  const mutation = useMutation({
    mutationFn: () =>
      fieldCollectionApi.create({
        issueNoteName,
        collectionDate,
        centerId: Number(centerId),
        type
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-notes"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
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
      title="Create issue note"
      description="Provide the collection details to add a new issue note."
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose} icon={<X className="h-4 w-4" />}>
            Cancel
          </Button>
          <Button type="submit" form="issue-note-form" variant="primary" disabled={mutation.isPending} icon={<Plus className="h-4 w-4" />}>
            Create issue note
          </Button>
        </>
      }
    >
      <form id="issue-note-form" className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">
          Issue note name
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={issueNoteName}
            onChange={(event) => setIssueNoteName(event.target.value)}
            placeholder="Enter a descriptive name"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Collection date
          <span className="mt-2 flex h-9 items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 text-sm text-blue-700">
            <Calendar className="h-4 w-4" />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={collectionDate}
              onChange={(event) => setCollectionDate(event.target.value)}
              type="date"
              required
            />
          </span>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Collection center
          <span className="mt-2 flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="h-4 w-4 text-slate-500" />
            <select
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={centerId}
              onChange={(event) => setCenterId(event.target.value)}
              required
            >
              <option value="">Select center</option>
              {(centers?.data ?? []).map((center) => (
                <option key={center.id} value={center.id}>
                  {center.centerId} - {center.location}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Issue note type
          <span className="mt-2 flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="h-4 w-4 text-slate-500" />
            <select className="min-w-0 flex-1 bg-transparent outline-none" value={type} onChange={(event) => setType(event.target.value)} required>
              <option value="">Select issue note type</option>
              {issueTypes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </span>
        </label>
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
      </form>
    </Modal>
  );
}

export function FieldCollectionPage() {
  const [status, setStatus] = useState<"Active" | "Completed">("Active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FieldCollectionFilters>({});
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const filterKey = JSON.stringify(filters);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.issueNotes(status, page, pageSize, search, filterKey),
    queryFn: () => fieldCollectionApi.list({ status, page, pageSize, search, filters })
  });

  const updateFilter = useCallback((key: keyof FieldCollectionFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const updateCollectionRange = useCallback((value: DateRangeValue) => {
    setFilters((current) => ({ ...current, collectionFrom: value.from, collectionTo: value.to }));
    setPage(1);
  }, []);

  const columns = useMemo<Column<IssueNote>[]>(
    () => [
      {
        header: "Issue Note",
        filterControl: (
          <TextColumnFilter
            value={filters.issueNote ?? ""}
            placeholder="Search issue notes"
            onChange={(value) => updateFilter("issueNote", value)}
          />
        ),
        accessor: (row) => row.issueNoteName
      },
      {
        header: "Type",
        filterControl: (
          <OptionColumnFilter
            value={filters.type ?? ""}
            allLabel={`All types (${data?.total ?? 0})`}
            searchPlaceholder="Search types"
            options={(data?.facets.types.length ? data.facets.types : issueTypes.map((type) => ({ value: type, count: 0 }))).map((type) => ({
              label: type.value,
              value: type.value,
              count: countFor(data?.facets.types, type.value)
            }))}
            onChange={(value) => updateFilter("type", value)}
          />
        ),
        accessor: (row) => row.type
      },
      {
        header: "Collection Date",
        filterControl: (
          <DateRangeColumnFilter
            value={{ from: filters.collectionFrom ?? "", to: filters.collectionTo ?? "" }}
            onChange={updateCollectionRange}
          />
        ),
        accessor: (row) => formatDate(row.collectionDate)
      },
      {
        header: "Center Agent",
        filterControl: (
          <OptionColumnFilter
            value={filters.centerAgent ?? ""}
            allLabel={`All agents (${data?.total ?? 0})`}
            searchPlaceholder="Search agents"
            options={(data?.facets.agents ?? []).map((agent) => ({
              label: agent.value,
              value: agent.value,
              count: agent.count
            }))}
            onChange={(value) => updateFilter("centerAgent", value)}
          />
        ),
        accessor: (row) => row.center?.agent ?? "-"
      },
      { header: "Can Count", filter: "sort", align: "right", accessor: (row) => row.canCount },
      { header: "Total Qty", filter: "sort", align: "right", accessor: (row) => row.totalQty },
      {
        header: "Actions",
        align: "right",
        accessor: (row) => (
          <Link to={`/admin/field-collection/issue-notes/${row.id}`}>
            <Button icon={<Search className="h-4 w-4" />}>{row.status === "Active" ? "Continue" : "View"}</Button>
          </Link>
        )
      }
    ],
    [data?.facets.agents, data?.facets.types, data?.total, filters, updateCollectionRange, updateFilter]
  );

  return (
    <>
      <PagePanel
        toolbar={
          <>
            <div className="flex flex-wrap items-center gap-3">
              <FieldCollectionTabs
                status={status}
                active={data?.counts.active ?? 0}
                completed={data?.counts.completed ?? 118}
                onStatusChange={(nextStatus) => {
                  setStatus(nextStatus);
                  setPage(1);
                }}
              />
              <input
                className="h-9 w-56 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search issue notes"
              />
            </div>
            <div className="flex gap-2">
              <Link to="/admin/field-collection/transfers">
                <Button type="button" icon={<ArrowRight className="h-4 w-4" />}>
                  Transfer notes
                </Button>
              </Link>
              <Button type="button" variant="primary" onClick={() => setIssueDialogOpen(true)}>
                New issue note
              </Button>
            </div>
          </>
        }
      >
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          rowKey={(row) => row.id}
          empty={
            isLoading ? (
              <span className="text-slate-500">Loading issue notes...</span>
            ) : status === "Active" ? (
              <EmptyState
                title="No active issue notes yet"
                description="Create a new issue note to capture collection details. You can resume it later from this screen."
                action="New issue note"
                onAction={() => setIssueDialogOpen(true)}
              />
            ) : (
              <span className="text-slate-500">No completed issue notes found</span>
            )
          }
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
      {issueDialogOpen ? <IssueNoteDialog onClose={() => setIssueDialogOpen(false)} /> : null}
    </>
  );
}
