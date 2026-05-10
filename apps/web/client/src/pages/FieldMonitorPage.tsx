import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, Clock, DatabaseZap, FileText, RefreshCw, Rows3 } from "lucide-react";
import {
  fieldCollectionApi,
  type FieldMonitorResponse,
  type IssueNote,
  type IssueNoteItem,
  type MobileSyncEvent,
  type TransferNote
} from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { Badge, type BadgeTone } from "../components/Badge";
import { Button } from "../components/Button";
import { PagePanel } from "../components/PagePanel";
import { formatDateTime } from "../utils/format";

type CanRow = IssueNoteItem & { issueNote: IssueNote };

const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2
});

function statusTone(status: string): BadgeTone {
  if (status === "Success" || status === "Completed") return "green";
  if (status === "Failed") return "red";
  if (status === "Active") return "blue";
  return "slate";
}

function syncCount(event: MobileSyncEvent) {
  return event.issueNoteCount + event.issueNoteItemCount + event.transferNoteCount + event.transferNoteItemCount;
}

function displayDate(value?: string | null) {
  return value ? formatDateTime(value) : "-";
}

function collectorName(row: { submittedByEmployee?: { fullName: string } | null; submittedByEmployeeId?: number | null }) {
  return row.submittedByEmployee?.fullName ?? (row.submittedByEmployeeId ? `Employee #${row.submittedByEmployeeId}` : "-");
}

function centerLabel(row: { center?: { centerId: string; agent: string } | null }) {
  return row.center ? `${row.center.centerId} - ${row.center.agent}` : "-";
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone = "blue"
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "blue" | "green" | "red" | "slate";
}) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    red: "border-red-100 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${tones[tone]}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-black text-slate-950">{value}</p>
          {hint ? <p className="mt-1 truncate text-sm text-slate-500">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-black text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
        {text}
      </td>
    </tr>
  );
}

function SyncEventsTable({ events }: { events: MobileSyncEvent[] }) {
  return (
    <table className="min-w-full border-collapse text-sm">
      <thead className="bg-slate-100 text-xs font-black uppercase tracking-[0.18em] text-slate-800">
        <tr>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Time</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Employee</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Status</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Received</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Error</th>
        </tr>
      </thead>
      <tbody>
        {events.length === 0 ? <EmptyRow colSpan={5} text="No mobile sync events received yet" /> : null}
        {events.map((event) => (
          <tr key={event.id} className="border-b border-slate-200 last:border-b-0">
            <td className="whitespace-nowrap px-4 py-3">{displayDate(event.completedAt ?? event.startedAt)}</td>
            <td className="whitespace-nowrap px-4 py-3">{event.employee?.fullName ?? "-"}</td>
            <td className="px-4 py-3">
              <Badge tone={statusTone(event.status)}>{event.status}</Badge>
            </td>
            <td className="whitespace-nowrap px-4 py-3">
              {syncCount(event)} total
              <span className="ml-2 text-xs text-slate-500">
                N:{event.issueNoteCount} C:{event.issueNoteItemCount} T:{event.transferNoteCount} TC:
                {event.transferNoteItemCount}
              </span>
            </td>
            <td className="max-w-[360px] truncate px-4 py-3 text-slate-600">{event.errorMessage ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IssueNotesTable({ notes }: { notes: IssueNote[] }) {
  return (
    <table className="min-w-full border-collapse text-sm">
      <thead className="bg-slate-100 text-xs font-black uppercase tracking-[0.18em] text-slate-800">
        <tr>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Issue Note</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Collector</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Center / Agent</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Type</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Status</th>
          <th className="border-b border-slate-200 px-4 py-2 text-right">Cans</th>
          <th className="border-b border-slate-200 px-4 py-2 text-right">Qty</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Updated</th>
          <th className="border-b border-slate-200 px-4 py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {notes.length === 0 ? <EmptyRow colSpan={9} text="No mobile issue notes received yet" /> : null}
        {notes.map((note) => (
          <tr key={note.id} className="border-b border-slate-200 last:border-b-0">
            <td className="whitespace-nowrap px-4 py-3 font-semibold">{note.issueNoteName}</td>
            <td className="whitespace-nowrap px-4 py-3">{collectorName(note)}</td>
            <td className="whitespace-nowrap px-4 py-3">{centerLabel(note)}</td>
            <td className="px-4 py-3">{note.type}</td>
            <td className="px-4 py-3">
              <Badge tone={statusTone(note.status)}>{note.status}</Badge>
            </td>
            <td className="px-4 py-3 text-right">{note.canCount}</td>
            <td className="px-4 py-3 text-right">{numberFormat.format(note.totalQty)}</td>
            <td className="whitespace-nowrap px-4 py-3">{displayDate(note.updatedAt)}</td>
            <td className="px-4 py-3 text-right">
              <Link className="font-bold text-blue-700 hover:text-blue-800" to={`/admin/field-collection/issue-notes/${note.id}`}>
                View
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CanRowsTable({ rows }: { rows: CanRow[] }) {
  return (
    <table className="min-w-full border-collapse text-sm">
      <thead className="bg-slate-100 text-xs font-black uppercase tracking-[0.18em] text-slate-800">
        <tr>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Issue Note</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Can Code</th>
          <th className="border-b border-slate-200 px-4 py-2 text-right">Quantity</th>
          <th className="border-b border-slate-200 px-4 py-2 text-right">pH</th>
          <th className="border-b border-slate-200 px-4 py-2 text-right">Brix</th>
          <th className="border-b border-slate-200 px-4 py-2 text-right">Temp (C)</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Collector</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? <EmptyRow colSpan={7} text="No received can rows yet" /> : null}
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-slate-200 last:border-b-0">
            <td className="whitespace-nowrap px-4 py-3 font-semibold">{row.issueNote.issueNoteName}</td>
            <td className="whitespace-nowrap px-4 py-3">{row.canCode}</td>
            <td className="px-4 py-3 text-right">{numberFormat.format(row.quantity)}</td>
            <td className="px-4 py-3 text-right">{numberFormat.format(row.phValue)}</td>
            <td className="px-4 py-3 text-right">{numberFormat.format(row.brixValue)}</td>
            <td className="px-4 py-3 text-right">{row.temperatureC == null ? "-" : numberFormat.format(row.temperatureC)}</td>
            <td className="whitespace-nowrap px-4 py-3">{collectorName(row.issueNote)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TransferNotesTable({ notes }: { notes: TransferNote[] }) {
  return (
    <table className="min-w-full border-collapse text-sm">
      <thead className="bg-slate-100 text-xs font-black uppercase tracking-[0.18em] text-slate-800">
        <tr>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Transfer Note</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Collector</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Center / Agent</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Status</th>
          <th className="border-b border-slate-200 px-4 py-2 text-right">Cans</th>
          <th className="border-b border-slate-200 px-4 py-2 text-left">Updated</th>
          <th className="border-b border-slate-200 px-4 py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {notes.length === 0 ? <EmptyRow colSpan={7} text="No mobile transfer notes received yet" /> : null}
        {notes.map((note) => (
          <tr key={note.id} className="border-b border-slate-200 last:border-b-0">
            <td className="whitespace-nowrap px-4 py-3 font-semibold">{note.transferNoteNo}</td>
            <td className="whitespace-nowrap px-4 py-3">{collectorName(note)}</td>
            <td className="whitespace-nowrap px-4 py-3">{centerLabel(note)}</td>
            <td className="px-4 py-3">
              <Badge tone={statusTone(note.status)}>{note.status}</Badge>
            </td>
            <td className="px-4 py-3 text-right">{note.canCount}</td>
            <td className="whitespace-nowrap px-4 py-3">{displayDate(note.updatedAt)}</td>
            <td className="px-4 py-3 text-right">
              <Link className="font-bold text-blue-700 hover:text-blue-800" to={`/admin/field-collection/transfers/${note.id}`}>
                View
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MonitorContent({ data }: { data: FieldMonitorResponse }) {
  return (
    <div className="flex-1 overflow-y-auto border-t border-slate-200 p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Last Sync"
          value={data.metrics.lastSyncAt ? formatDateTime(data.metrics.lastSyncAt) : "No sync yet"}
          hint={data.metrics.lastSyncEmployee ?? "Waiting for mobile data"}
          tone="blue"
        />
        <MetricCard
          icon={<FileText className="h-5 w-5" />}
          label="Issue Notes Today"
          value={String(data.metrics.receivedIssueNotesToday)}
          hint="Received from mobile"
          tone="green"
        />
        <MetricCard
          icon={<Rows3 className="h-5 w-5" />}
          label="Can Rows Today"
          value={String(data.metrics.receivedCanRowsToday)}
          hint="Quantity, pH, Brix rows"
          tone="blue"
        />
        <MetricCard
          icon={<Activity className="h-5 w-5" />}
          label="Active Mobile Notes"
          value={String(data.metrics.activeMobileNotes)}
          hint="Still editable on mobile"
          tone="slate"
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Failed Syncs Today"
          value={String(data.metrics.failedSyncsToday)}
          hint="Needs attention"
          tone={data.metrics.failedSyncsToday > 0 ? "red" : "green"}
        />
      </div>

      <div className="mt-4 grid gap-4">
        <Section title="Recent Sync Events" subtitle="Every mobile sync attempt is logged here.">
          <SyncEventsTable events={data.syncEvents} />
        </Section>
        <Section title="Recent Issue Notes" subtitle="Mobile-origin collection notes received by the server.">
          <IssueNotesTable notes={data.issueNotes} />
        </Section>
        <Section title="Recent Can Rows" subtitle="Latest can quantity, pH, and Brix rows from issue notes.">
          <CanRowsTable rows={data.issueNoteItems} />
        </Section>
        <Section title="Recent Transfer Notes" subtitle="Mobile-origin empty-can transfer records.">
          <TransferNotesTable notes={data.transferNotes} />
        </Section>
      </div>
    </div>
  );
}

export function FieldMonitorPage() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: queryKeys.fieldMonitor,
    queryFn: fieldCollectionApi.monitor,
    refetchInterval: 10000
  });

  return (
    <PagePanel
      toolbar={
        <>
          <div>
            <h1 className="text-lg font-black text-slate-950">Field Collection Monitor</h1>
            <p className="text-sm text-slate-500">Mobile received data, sync status, and recent can rows.</p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => refetch()}
            disabled={isFetching}
            icon={isFetching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center border-t border-slate-200 text-sm font-semibold text-slate-500">
          Loading mobile monitor...
        </div>
      ) : null}
      {isError ? (
        <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Could not load mobile field collection monitor.
        </div>
      ) : null}
      {data ? <MonitorContent data={data} /> : null}
    </PagePanel>
  );
}
