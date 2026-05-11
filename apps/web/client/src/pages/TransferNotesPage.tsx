import { FormEvent, useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Plus, Search, X } from "lucide-react";
import { centersApi, fieldCollectionApi, type TransferNote, type TransferNoteFilters } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { Button } from "../components/Button";
import { DateRangeColumnFilter, OptionColumnFilter, TextColumnFilter, type DateRangeValue } from "../components/ColumnFilters";
import { DataTable, type Column } from "../components/Table";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { PagePanel } from "../components/PagePanel";
import { Pagination } from "../components/Pagination";
import { formatDate } from "../utils/format";
import { FieldCollectionTabs } from "./FieldCollectionPage";

function todayInputValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function TransferNoteDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [transferNoteNo, setTransferNoteNo] = useState("");
  const [transferDate, setTransferDate] = useState(todayInputValue);
  const [centerId, setCenterId] = useState("");
  const [error, setError] = useState("");
  const { data: centers } = useQuery({
    queryKey: queryKeys.centers(1, 100, ""),
    queryFn: () => centersApi.list({ page: 1, pageSize: 100 })
  });
  const mutation = useMutation({
    mutationFn: () =>
      fieldCollectionApi.createTransfer({
        transferNoteNo,
        transferDate,
        centerId: Number(centerId)
      }),
    onSuccess: (transferNote) => {
      queryClient.invalidateQueries({ queryKey: ["transfer-notes"] });
      onClose();
      navigate(`/admin/field-collection/transfers/${transferNote.id}`);
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
      title="Create transfer note"
      description="Select a center and transfer date, then add empty cans from the note detail screen."
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose} icon={<X className="h-4 w-4" />}>
            Cancel
          </Button>
          <Button type="submit" form="transfer-note-form" variant="primary" disabled={mutation.isPending} icon={<Plus className="h-4 w-4" />}>
            Create transfer note
          </Button>
        </>
      }
    >
      <form id="transfer-note-form" className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">
          Transfer note no
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={transferNoteNo}
            onChange={(event) => setTransferNoteNo(event.target.value)}
            placeholder="Enter transfer note number"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Transfer date
          <span className="mt-2 flex h-9 items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 text-sm text-blue-700">
            <Calendar className="h-4 w-4" />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={transferDate}
              onChange={(event) => setTransferDate(event.target.value)}
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
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
      </form>
    </Modal>
  );
}

export function TransferNotesPage() {
  const [status, setStatus] = useState<"Active" | "Completed">("Active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TransferNoteFilters>({});
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const filterKey = JSON.stringify(filters);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.transferNotes(status, page, pageSize, search, filterKey),
    queryFn: () => fieldCollectionApi.transfers({ status, page, pageSize, search, filters })
  });

  const updateFilter = useCallback((key: keyof TransferNoteFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const updateTransferRange = useCallback((value: DateRangeValue) => {
    setFilters((current) => ({ ...current, transferFrom: value.from, transferTo: value.to }));
    setPage(1);
  }, []);

  const columns = useMemo<Column<TransferNote>[]>(
    () => [
      {
        header: "Transfer Note",
        filterControl: (
          <TextColumnFilter
            value={filters.transferNote ?? ""}
            placeholder="Search transfer notes"
            onChange={(value) => updateFilter("transferNote", value)}
          />
        ),
        accessor: (row) => row.transferNoteNo
      },
      {
        header: "Agent",
        filterControl: (
          <OptionColumnFilter
            value={filters.agent ?? ""}
            allLabel={`All agents (${data?.total ?? 0})`}
            searchPlaceholder="Search agents"
            options={(data?.facets.agents ?? []).map((agent) => ({
              label: agent.value,
              value: agent.value,
              count: agent.count
            }))}
            onChange={(value) => updateFilter("agent", value)}
          />
        ),
        accessor: (row) => row.center?.agent ?? "-"
      },
      {
        header: "Transfer Date",
        filterControl: (
          <DateRangeColumnFilter
            value={{ from: filters.transferFrom ?? "", to: filters.transferTo ?? "" }}
            onChange={updateTransferRange}
          />
        ),
        accessor: (row) => formatDate(row.transferDate)
      },
      { header: "Can Count", filter: "sort", align: "right", accessor: (row) => row.canCount },
      {
        header: "Actions",
        align: "right",
        accessor: (row) => (
          <Link to={`/admin/field-collection/transfers/${row.id}`}>
            <Button icon={<Search className="h-4 w-4" />}>View</Button>
          </Link>
        )
      }
    ],
    [data?.facets.agents, data?.total, filters, updateFilter, updateTransferRange]
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
                completed={data?.counts.completed ?? 0}
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
                placeholder="Search transfer notes"
              />
            </div>
            <div className="flex gap-2">
              <Link to="/admin/field-collection">
                <Button icon={<ArrowLeft className="h-4 w-4" />}>Back to issue notes</Button>
              </Link>
              <Button type="button" variant="primary" onClick={() => setTransferDialogOpen(true)} icon={<Plus className="h-4 w-4" />}>
                New transfer note
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
              <span className="text-slate-500">Loading transfer notes...</span>
            ) : status === "Active" ? (
              <EmptyState
                title="No active transfer notes yet"
                description="Create a transfer note to move empty cans to a collection center."
                action="New transfer note"
                onAction={() => setTransferDialogOpen(true)}
              />
            ) : (
              <span className="text-slate-500">No completed transfer notes found</span>
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
      {transferDialogOpen ? <TransferNoteDialog onClose={() => setTransferDialogOpen(false)} /> : null}
    </>
  );
}
