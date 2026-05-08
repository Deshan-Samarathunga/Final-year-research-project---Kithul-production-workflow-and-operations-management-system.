import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { centersApi, type Center } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { Button } from "../components/Button";
import { DataTable, type Column } from "../components/Table";
import { Modal } from "../components/Modal";
import { PagePanel } from "../components/PagePanel";
import { Pagination } from "../components/Pagination";

type CenterDialogState = { mode: "create"; center?: never } | { mode: "edit"; center: Center };

function CenterDialog({ state, onClose }: { state: CenterDialogState; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [centerId, setCenterId] = useState(state.center?.centerId ?? "");
  const [location, setLocation] = useState(state.center?.location ?? "");
  const [agent, setAgent] = useState(state.center?.agent ?? "");
  const [contactPhone, setContactPhone] = useState(state.center?.contactPhone ?? "");
  const [status, setStatus] = useState<Center["status"]>(state.center?.status ?? "Active");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => {
      if (state.mode === "create") {
        return centersApi.create({ centerId, location, agent, contactPhone: contactPhone || null, status });
      }
      return centersApi.update(state.center.id, { location, agent, contactPhone: contactPhone || null, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
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
      title={state.mode === "create" ? "Add center" : "Edit center"}
      description={
        state.mode === "create"
          ? "Create a new collection center for incoming batches."
          : "Update center details and availability."
      }
      onClose={onClose}
      width="max-w-xl"
      footer={
        <>
          <Button type="button" onClick={onClose} icon={<X className="h-4 w-4" />}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="center-form"
            variant="primary"
            disabled={mutation.isPending}
            icon={<Plus className="h-4 w-4" />}
          >
            {state.mode === "create" ? "Create Center" : "Update Center"}
          </Button>
        </>
      }
    >
      <form id="center-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Center ID *
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
            value={centerId}
            onChange={(event) => setCenterId(event.target.value)}
            placeholder="e.g., center001"
            disabled={state.mode === "edit"}
            required
          />
          <span className="mt-1 block text-xs text-slate-500">
            {state.mode === "edit" ? "Center ID cannot be changed" : "Unique identifier for the center"}
          </span>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Location *
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g., Kegalle"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Center Agent *
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={agent}
            onChange={(event) => setAgent(event.target.value)}
            placeholder="e.g., Agent Name"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Contact Phone
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            placeholder="e.g., +94 71 000 0001"
          />
        </label>
        {state.mode === "edit" ? (
          <label className="sm:col-span-2 block text-sm font-medium text-slate-700">
            Status
            <button
              type="button"
              className="mt-2 flex items-center gap-2"
              onClick={() => setStatus(status === "Active" ? "Inactive" : "Active")}
            >
              <span className={`relative h-6 w-10 rounded-full ${status === "Active" ? "bg-blue-600" : "bg-slate-300"}`}>
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                    status === "Active" ? "left-5" : "left-1"
                  }`}
                />
              </span>
              <span className="font-normal text-slate-700">{status}</span>
            </button>
          </label>
        ) : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2">{error}</p> : null}
      </form>
    </Modal>
  );
}

export function CentersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<CenterDialogState | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.centers(page, pageSize, search),
    queryFn: () => centersApi.list({ page, pageSize, search })
  });
  const remove = useMutation({
    mutationFn: centersApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["centers"] })
  });

  const columns = useMemo<Column<Center>[]>(
    () => [
      { header: "Center ID", filter: "search", accessor: (row) => row.centerId },
      { header: "Location", filter: "search", accessor: (row) => row.location },
      { header: "Agent", filter: "sort", accessor: (row) => row.agent },
      { header: "Contact", filter: "search", accessor: (row) => row.contactPhone || "--" },
      { header: "Status", filter: "sort", accessor: (row) => row.status },
      {
        header: "Actions",
        align: "right",
        accessor: (row) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="dark"
              className="h-8"
              onClick={() => setDialog({ mode: "edit", center: row })}
              icon={<Edit3 className="h-4 w-4" />}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="danger"
              className="h-8"
              onClick={() => {
                if (confirm(`Delete ${row.centerId}?`)) remove.mutate(row.id);
              }}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Delete
            </Button>
          </div>
        )
      }
    ],
    [remove]
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
              placeholder="Search centers"
            />
            <Button type="button" variant="primary" onClick={() => setDialog({ mode: "create" })} icon={<Plus className="h-4 w-4" />}>
              Add center
            </Button>
          </>
        }
      >
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          rowKey={(row) => row.id}
          empty={<span className="text-slate-500">{isLoading ? "Loading centers..." : "No centers found"}</span>}
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
      {dialog ? <CenterDialog state={dialog} onClose={() => setDialog(null)} /> : null}
    </>
  );
}
