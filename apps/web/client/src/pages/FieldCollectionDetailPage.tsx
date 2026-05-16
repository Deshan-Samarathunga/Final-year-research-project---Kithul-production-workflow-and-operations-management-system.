import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { fieldCollectionApi, type IssueNoteItem, type TransferNoteItem } from "../api/client";
import { Button } from "../components/Button";
import { DataTable, type Column } from "../components/Table";
import { PagePanel } from "../components/PagePanel";
import { formatDate } from "../utils/format";

export function IssueNoteDetailPage() {
  const id = Number(useParams().id);
  const { data, isLoading } = useQuery({
    queryKey: ["issue-note", id],
    queryFn: () => fieldCollectionApi.detail(id),
    enabled: Number.isFinite(id)
  });

  const columns: Column<IssueNoteItem>[] = [
    { header: "#", accessor: (row) => row.id },
    { header: "Can Code", accessor: (row) => row.canCode },
    { header: "Quantity", align: "right", accessor: (row) => row.quantity },
    { header: "pH Value", align: "right", accessor: (row) => row.phValue },
    { header: "Brix", align: "right", accessor: (row) => row.brixValue }
  ];

  return (
    <PagePanel
      toolbar={
        <>
          <div>
            <h1 className="text-lg font-black text-slate-950">{data?.issueNoteName ?? "Issue note"}</h1>
            <p className="text-sm text-slate-500">
              {data ? `${data.type} - ${formatDate(data.collectionDate)} - ${data.center?.agent ?? "No center"}` : "Loading..."}
            </p>
          </div>
          <Link to="/admin/field-collection">
            <Button icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
          </Link>
        </>
      }
    >
      <div className="grid gap-3 border-b border-slate-200 p-4 text-sm sm:grid-cols-3">
        <Metric label="Status" value={data?.status ?? "-"} />
        <Metric label="Can Count" value={String(data?.canCount ?? 0)} />
        <Metric label="Total Qty" value={String(data?.totalQty ?? 0)} />
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(row) => row.id}
        empty={<span className="text-slate-500">{isLoading ? "Loading cans..." : "No cans recorded for this note"}</span>}
      />
    </PagePanel>
  );
}

export function TransferNoteDetailPage() {
  const id = Number(useParams().id);
  const { data, isLoading } = useQuery({
    queryKey: ["transfer-note", id],
    queryFn: () => fieldCollectionApi.transferDetail(id),
    enabled: Number.isFinite(id)
  });

  const columns: Column<TransferNoteItem>[] = [
    { header: "#", accessor: (row) => row.id },
    { header: "Can Code", accessor: (row) => row.canCode }
  ];

  return (
    <PagePanel
      toolbar={
        <>
          <div>
            <h1 className="text-lg font-black text-slate-950">{data?.transferNoteNo ?? "Transfer note"}</h1>
            <p className="text-sm text-slate-500">
              {data ? `${formatDate(data.transferDate)} - ${data.center?.agent ?? "No center"}` : "Loading..."}
            </p>
          </div>
          <Link to="/admin/field-collection/transfers">
            <Button icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
          </Link>
        </>
      }
    >
      <div className="grid gap-3 border-b border-slate-200 p-4 text-sm sm:grid-cols-2">
        <Metric label="Status" value={data?.status ?? "-"} />
        <Metric label="Can Count" value={String(data?.canCount ?? 0)} />
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(row) => row.id}
        empty={<span className="text-slate-500">{isLoading ? "Loading cans..." : "No cans recorded for this transfer"}</span>}
      />
    </PagePanel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 font-black text-slate-950">{value}</div>
    </div>
  );
}
