import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { fieldCollectionApi, type TransferNote, type TransferNoteFilters } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { Button } from "../components/Button";
import { DateRangeColumnFilter, OptionColumnFilter, TextColumnFilter, type DateRangeValue } from "../components/ColumnFilters";
import { DataTable, type Column } from "../components/Table";
import { EmptyState } from "../components/EmptyState";
import { PagePanel } from "../components/PagePanel";
import { Pagination } from "../components/Pagination";
import { formatDate } from "../utils/format";
import { FieldCollectionTabs } from "./FieldCollectionPage";

export function TransferNotesPage() {
  const [status, setStatus] = useState<"Active" | "Completed">("Active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TransferNoteFilters>({});
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
          <Link to="/admin/field-collection">
            <Button icon={<ArrowLeft className="h-4 w-4" />}>Back to issue notes</Button>
          </Link>
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
          ) : (
            <EmptyState
              title={status === "Active" ? "No active transfer notes yet" : "No completed transfer notes yet"}
              description="Transfer notes created from the mobile app will sync here."
            />
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
  );
}
