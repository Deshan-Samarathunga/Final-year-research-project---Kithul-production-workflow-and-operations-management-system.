import { FormEvent, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { fieldCollectionApi, systemCansApi, type IssueNoteItem, type SystemCan, type TransferNoteItem } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { Button } from "../components/Button";
import { DataTable, type Column } from "../components/Table";
import { PagePanel } from "../components/PagePanel";
import { formatDate } from "../utils/format";

const sapQualityWarningLimits = {
  ph: { min: 5.5, max: 6.5 },
  brix: { min: 9.5, max: 12 },
  temperatureC: { min: 4, max: 35 }
};

export function IssueNoteDetailPage() {
  const id = Number(useParams().id);
  const queryClient = useQueryClient();
  const [canCode, setCanCode] = useState("");
  const [canSearch, setCanSearch] = useState("");
  const [canDropdownOpen, setCanDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [phValue, setPhValue] = useState("");
  const [brixValue, setBrixValue] = useState("");
  const [temperatureC, setTemperatureC] = useState("");
  const [error, setError] = useState("");
  const [qualityItemId, setQualityItemId] = useState<number | null>(null);
  const [qualityPh, setQualityPh] = useState("");
  const [qualityBrix, setQualityBrix] = useState("");
  const [qualityTemperature, setQualityTemperature] = useState("");
  const [qualityDecision, setQualityDecision] = useState<"Accepted" | "Spoiled">("Accepted");
  const [qualityReason, setQualityReason] = useState("");
  const [qualityError, setQualityError] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["issue-note", id],
    queryFn: () => fieldCollectionApi.detail(id),
    enabled: Number.isFinite(id)
  });
  const { data: systemCans, isLoading: systemCansLoading } = useQuery({
    queryKey: queryKeys.systemCans(1, 100, "", "issue-note-select"),
    queryFn: () => systemCansApi.list({ page: 1, pageSize: 100 }),
    enabled: data?.status === "Active"
  });

  const invalidateIssue = () => {
    queryClient.invalidateQueries({ queryKey: ["issue-note", id] });
    queryClient.invalidateQueries({ queryKey: ["issue-notes"] });
  };
  const addCan = useMutation({
    mutationFn: () =>
      fieldCollectionApi.addIssueCan(id, {
        canCode,
        quantity: Number(quantity),
        phValue: Number(phValue),
        brixValue: Number(brixValue),
        temperatureC: data?.type === "Sap" ? Number(temperatureC) : null
      }),
    onSuccess: () => {
      setCanCode("");
      setCanSearch("");
      setQuantity("");
      setPhValue("");
      setBrixValue("");
      setTemperatureC("");
      invalidateIssue();
    },
    onError: (mutationError: Error) => setError(mutationError.message)
  });
  const removeCan = useMutation({
    mutationFn: (itemId: number) => fieldCollectionApi.removeIssueCan(id, itemId),
    onSuccess: invalidateIssue,
    onError: (mutationError: Error) => setError(mutationError.message)
  });
  const createQualityCheck = useMutation({
    mutationFn: () =>
      fieldCollectionApi.createQualityCheck(qualityItemId ?? 0, {
        phValue: Number(qualityPh),
        brixValue: Number(qualityBrix),
        temperatureC: Number(qualityTemperature),
        decision: qualityDecision,
        reason: qualityReason.trim() || null
      }),
    onSuccess: () => {
      setQualityItemId(null);
      setQualityReason("");
      invalidateIssue();
    },
    onError: (mutationError: Error) => setQualityError(mutationError.message)
  });
  const returnCan = useMutation({
    mutationFn: (itemId: number) => fieldCollectionApi.returnIssueCan(itemId),
    onSuccess: invalidateIssue,
    onError: (mutationError: Error) => setError(mutationError.message)
  });
  const canEdit = data?.status === "Active";
  const isSapIssue = data?.type === "Sap";
  const selectedQualityItem = (data?.items ?? []).find((item) => item.id === qualityItemId) ?? null;
  const selectedCanCodes = new Set((data?.items ?? []).map((item) => item.canCode));
  const allSystemCans = systemCans?.data ?? [];
  const addableSystemCans = allSystemCans.filter((can) => can.status === "In warehouse" && !selectedCanCodes.has(can.canCode));
  const filteredSystemCans = useMemo(() => {
    const search = canSearch.trim().toLowerCase();
    if (!search) return allSystemCans;
    return allSystemCans.filter(
      (can) =>
        can.canCode.toLowerCase().includes(search) ||
        can.status.toLowerCase().includes(search) ||
        (can.agentName ?? "").toLowerCase().includes(search)
    );
  }, [allSystemCans, canSearch]);
  const columns: Column<IssueNoteItem>[] = [
    { header: "#", accessor: (row) => row.id },
    { header: "Can Code", accessor: (row) => row.canCode },
    { header: "Quantity", align: "right", accessor: (row) => row.quantity },
    { header: "pH Value", align: "right", accessor: (row) => row.phValue },
    { header: "Brix", align: "right", accessor: (row) => row.brixValue },
    ...(isSapIssue
      ? [
          {
            header: "Temp (C)",
            align: "right" as const,
            accessor: (row: IssueNoteItem) => row.temperatureC ?? "-"
          }
        ]
      : []),
    ...(isSapIssue
      ? [
          {
            header: "Processing",
            accessor: (row: IssueNoteItem) => <ProcessingStatus item={row} />
          }
        ]
      : []),
    ...(canEdit
      ? [
          {
            header: "Actions",
            align: "right" as const,
            accessor: (row: IssueNoteItem) => (
              <Button
                type="button"
                variant="danger"
                disabled={removeCan.isPending}
                onClick={() => {
                  setError("");
                  removeCan.mutate(row.id);
                }}
                icon={<Trash2 className="h-4 w-4" />}
              >
                Remove
              </Button>
            )
          }
        ]
      : [])
      .concat(
        isSapIssue
          ? [
              {
                header: "Quality Check",
                align: "right" as const,
                accessor: (row: IssueNoteItem) => (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setError("");
                        setQualityError("");
                        openQualityCheck(row);
                      }}
                      icon={<ClipboardCheck className="h-4 w-4" />}
                    >
                      Check
                    </Button>
                    {row.processingStatus === "Spoiled" ? (
                      <Button
                        type="button"
                        variant="danger"
                        disabled={returnCan.isPending}
                        onClick={() => {
                          setError("");
                          returnCan.mutate(row.id);
                        }}
                        icon={<RotateCcw className="h-4 w-4" />}
                      >
                        Mark returned
                      </Button>
                    ) : null}
                  </div>
                )
              }
            ]
          : []
      )
  ];

  function submitCan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!addableSystemCans.some((can) => can.canCode === canCode)) {
      setError("Select an in-warehouse system can");
      return;
    }
    if (isSapIssue && temperatureC.trim() === "") {
      setError("Temperature is required for Sap issue notes");
      return;
    }
    addCan.mutate();
  }

  function selectCan(can: SystemCan) {
    setCanCode(can.canCode);
    setCanSearch(`${can.canCode} - ${can.status}`);
    setCanDropdownOpen(false);
    setError("");
  }

  function openQualityCheck(item: IssueNoteItem) {
    const latestCheck = item.processingQualityChecks?.[0];
    setQualityItemId(item.id);
    setQualityPh(String(latestCheck?.phValue ?? item.phValue));
    setQualityBrix(String(latestCheck?.brixValue ?? item.brixValue));
    setQualityTemperature(String(latestCheck?.temperatureC ?? item.temperatureC ?? ""));
    setQualityDecision(latestCheck?.decision ?? "Accepted");
    setQualityReason(latestCheck?.reason ?? "");
  }

  function qualityWarnings() {
    const ph = Number(qualityPh);
    const brix = Number(qualityBrix);
    const temperature = Number(qualityTemperature);
    const warnings = [
      Number.isFinite(ph) && (ph < sapQualityWarningLimits.ph.min || ph > sapQualityWarningLimits.ph.max)
        ? `pH outside ${sapQualityWarningLimits.ph.min}-${sapQualityWarningLimits.ph.max}`
        : "",
      Number.isFinite(brix) && (brix < sapQualityWarningLimits.brix.min || brix > sapQualityWarningLimits.brix.max)
        ? `Brix outside ${sapQualityWarningLimits.brix.min}-${sapQualityWarningLimits.brix.max}`
        : "",
      Number.isFinite(temperature) &&
      (temperature < sapQualityWarningLimits.temperatureC.min || temperature > sapQualityWarningLimits.temperatureC.max)
        ? `Temperature outside ${sapQualityWarningLimits.temperatureC.min}-${sapQualityWarningLimits.temperatureC.max} C`
        : ""
    ].filter(Boolean);
    return warnings;
  }

  function submitQualityCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQualityError("");
    if (!qualityItemId) {
      setQualityError("Select a can row to check");
      return;
    }
    createQualityCheck.mutate();
  }

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
      {canEdit ? (
        <form
          className={`grid gap-3 border-b border-slate-200 bg-slate-50 p-4 ${
            isSapIssue
              ? "lg:grid-cols-[minmax(16rem,1fr)_8rem_7rem_7rem_8rem_auto]"
              : "lg:grid-cols-[minmax(18rem,1fr)_9rem_8rem_8rem_auto]"
          }`}
          onSubmit={submitCan}
        >
          <label className="text-sm font-medium text-slate-700">
            Add system can
            <div className="relative mt-2">
              <div className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  value={canSearch}
                  onChange={(event) => {
                    setCanSearch(event.target.value);
                    setCanCode("");
                    setCanDropdownOpen(true);
                  }}
                  onFocus={() => setCanDropdownOpen(true)}
                  onBlur={() => window.setTimeout(() => setCanDropdownOpen(false), 120)}
                  placeholder={systemCansLoading ? "Loading system cans..." : "Search system cans"}
                  autoComplete="off"
                  required
                />
              </div>
              {canDropdownOpen ? (
                <div className="absolute left-0 right-0 top-10 z-20 max-h-64 overflow-auto rounded-md border border-slate-300 bg-white py-1 text-sm shadow-xl">
                  {filteredSystemCans.length > 0 ? (
                    filteredSystemCans.map((can) => (
                      <button
                        key={can.id}
                        type="button"
                        disabled={can.status !== "In warehouse" || selectedCanCodes.has(can.canCode)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectCan(can)}
                      >
                        <span className="font-semibold text-slate-950">{can.canCode}</span>
                        <span className="truncate text-slate-500">
                          {selectedCanCodes.has(can.canCode) ? "Already added" : can.status}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-slate-500">{systemCansLoading ? "Loading system cans..." : "No matching system cans"}</div>
                  )}
                </div>
              ) : null}
            </div>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Quantity
            <input
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            pH
            <input
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={phValue}
              onChange={(event) => setPhValue(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Brix
            <input
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={brixValue}
              onChange={(event) => setBrixValue(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              required
            />
          </label>
          {isSapIssue ? (
            <label className="text-sm font-medium text-slate-700">
              Temperature (C)
              <input
                className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={temperatureC}
                onChange={(event) => setTemperatureC(event.target.value)}
                type="number"
                min="0"
                step="0.1"
                required
              />
            </label>
          ) : null}
          <div className="flex items-end">
            <Button type="submit" variant="primary" disabled={addCan.isPending || systemCansLoading || addableSystemCans.length === 0} icon={<Plus className="h-4 w-4" />}>
              Add can
            </Button>
          </div>
          {error ? <p className={`rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ${isSapIssue ? "lg:col-span-6" : "lg:col-span-5"}`}>{error}</p> : null}
        </form>
      ) : error ? (
        <p className="border-b border-slate-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{error}</p>
      ) : null}
      {isSapIssue && selectedQualityItem ? (
        <form className="grid gap-3 border-b border-slate-200 bg-white p-4 lg:grid-cols-[10rem_8rem_8rem_8rem_10rem_minmax(12rem,1fr)_auto]" onSubmit={submitQualityCheck}>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Quality can</div>
            <div className="mt-2 text-sm font-black text-slate-950">{selectedQualityItem.canCode}</div>
          </div>
          <label className="text-sm font-medium text-slate-700">
            pH
            <input
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={qualityPh}
              onChange={(event) => setQualityPh(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Brix
            <input
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={qualityBrix}
              onChange={(event) => setQualityBrix(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Temp (C)
            <input
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={qualityTemperature}
              onChange={(event) => setQualityTemperature(event.target.value)}
              type="number"
              min="0"
              step="0.1"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Decision
            <select
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={qualityDecision}
              onChange={(event) => setQualityDecision(event.target.value as "Accepted" | "Spoiled")}
            >
              <option value="Accepted">Accepted</option>
              <option value="Spoiled">Spoiled</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Reason
            <input
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={qualityReason}
              onChange={(event) => setQualityReason(event.target.value)}
              placeholder={qualityDecision === "Spoiled" ? "Spoilage reason" : "Optional"}
            />
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="primary" disabled={createQualityCheck.isPending} icon={<ClipboardCheck className="h-4 w-4" />}>
              Save check
            </Button>
            <Button type="button" variant="ghost" onClick={() => setQualityItemId(null)}>
              Cancel
            </Button>
          </div>
          {qualityWarnings().length > 0 ? (
            <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-800 lg:col-span-7">
              Warning: {qualityWarnings().join("; ")}
            </p>
          ) : null}
          {qualityError ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 lg:col-span-7">{qualityError}</p> : null}
        </form>
      ) : null}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(row) => row.id}
        empty={
          <span className="text-slate-500">
            {isLoading ? "Loading cans..." : canEdit ? "No cans recorded yet. Add a can above." : "No cans recorded for this note"}
          </span>
        }
      />
    </PagePanel>
  );
}

export function TransferNoteDetailPage() {
  const id = Number(useParams().id);
  const queryClient = useQueryClient();
  const [canCode, setCanCode] = useState("");
  const [canSearch, setCanSearch] = useState("");
  const [canDropdownOpen, setCanDropdownOpen] = useState(false);
  const [error, setError] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["transfer-note", id],
    queryFn: () => fieldCollectionApi.transferDetail(id),
    enabled: Number.isFinite(id)
  });
  const { data: systemCans, isLoading: systemCansLoading } = useQuery({
    queryKey: queryKeys.systemCans(1, 100, "", "transfer-note-select"),
    queryFn: () => systemCansApi.list({ page: 1, pageSize: 100 }),
    enabled: data?.status === "Active"
  });

  const invalidateTransfer = () => {
    queryClient.invalidateQueries({ queryKey: ["transfer-note", id] });
    queryClient.invalidateQueries({ queryKey: ["transfer-notes"] });
  };
  const addCan = useMutation({
    mutationFn: () => fieldCollectionApi.addTransferCan(id, { canCode }),
    onSuccess: () => {
      setCanCode("");
      invalidateTransfer();
    },
    onError: (mutationError: Error) => setError(mutationError.message)
  });
  const removeCan = useMutation({
    mutationFn: (itemId: number) => fieldCollectionApi.removeTransferCan(id, itemId),
    onSuccess: invalidateTransfer,
    onError: (mutationError: Error) => setError(mutationError.message)
  });
  const completeTransfer = useMutation({
    mutationFn: () => fieldCollectionApi.updateTransfer(id, { status: "Completed" }),
    onSuccess: invalidateTransfer,
    onError: (mutationError: Error) => setError(mutationError.message)
  });
  const canEdit = data?.status === "Active";
  const selectedCanCodes = new Set((data?.items ?? []).map((item) => item.canCode));
  const allSystemCans = systemCans?.data ?? [];
  const addableSystemCans = allSystemCans.filter((can) => can.status === "In warehouse" && !selectedCanCodes.has(can.canCode));
  const filteredSystemCans = useMemo(() => {
    const search = canSearch.trim().toLowerCase();
    if (!search) return allSystemCans;
    return allSystemCans.filter(
      (can) =>
        can.canCode.toLowerCase().includes(search) ||
        can.status.toLowerCase().includes(search) ||
        (can.agentName ?? "").toLowerCase().includes(search)
    );
  }, [allSystemCans, canSearch]);
  const columns: Column<TransferNoteItem>[] = [
    { header: "#", accessor: (row) => row.id },
    { header: "Can Code", accessor: (row) => row.canCode },
    ...(canEdit
      ? [
          {
            header: "Actions",
            align: "right" as const,
            accessor: (row: TransferNoteItem) => (
              <Button
                type="button"
                variant="danger"
                disabled={removeCan.isPending}
                onClick={() => {
                  setError("");
                  removeCan.mutate(row.id);
                }}
                icon={<Trash2 className="h-4 w-4" />}
              >
                Remove
              </Button>
            )
          }
        ]
      : [])
  ];

  function submitCan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!addableSystemCans.some((can) => can.canCode === canCode)) {
      setError("Select an in-warehouse system can");
      return;
    }
    addCan.mutate();
  }

  function selectCan(can: SystemCan) {
    setCanCode(can.canCode);
    setCanSearch(`${can.canCode} - ${can.status}`);
    setCanDropdownOpen(false);
    setError("");
  }

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
          <div className="flex gap-2">
            {canEdit ? (
              <Button
                type="button"
                variant="primary"
                disabled={completeTransfer.isPending}
                onClick={() => {
                  setError("");
                  completeTransfer.mutate();
                }}
                icon={<CheckCircle2 className="h-4 w-4" />}
              >
                Complete
              </Button>
            ) : null}
            <Link to="/admin/field-collection/transfers">
              <Button icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
            </Link>
          </div>
        </>
      }
    >
      <div className="grid gap-3 border-b border-slate-200 p-4 text-sm sm:grid-cols-2">
        <Metric label="Status" value={data?.status ?? "-"} />
        <Metric label="Can Count" value={String(data?.canCount ?? 0)} />
      </div>
      {canEdit ? (
        <form className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50 p-4" onSubmit={submitCan}>
          <label className="min-w-64 flex-1 text-sm font-medium text-slate-700">
            Add system can
            <div className="relative mt-2">
              <div className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  value={canSearch}
                  onChange={(event) => {
                    setCanSearch(event.target.value);
                    setCanCode("");
                    setCanDropdownOpen(true);
                  }}
                  onFocus={() => setCanDropdownOpen(true)}
                  onBlur={() => window.setTimeout(() => setCanDropdownOpen(false), 120)}
                  placeholder={systemCansLoading ? "Loading system cans..." : "Search system cans"}
                  autoComplete="off"
                  required
                />
              </div>
              {canDropdownOpen ? (
                <div className="absolute left-0 right-0 top-10 z-20 max-h-64 overflow-auto rounded-md border border-slate-300 bg-white py-1 text-sm shadow-xl">
                  {filteredSystemCans.length > 0 ? (
                    filteredSystemCans.map((can) => (
                      <button
                        key={can.id}
                        type="button"
                        disabled={can.status !== "In warehouse" || selectedCanCodes.has(can.canCode)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectCan(can)}
                      >
                        <span className="font-semibold text-slate-950">{can.canCode}</span>
                        <span className="truncate text-slate-500">
                          {selectedCanCodes.has(can.canCode) ? "Already added" : can.status}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-slate-500">{systemCansLoading ? "Loading system cans..." : "No matching system cans"}</div>
                  )}
                </div>
              ) : null}
            </div>
          </label>
          <Button type="submit" variant="primary" disabled={addCan.isPending || systemCansLoading || addableSystemCans.length === 0} icon={<Plus className="h-4 w-4" />}>
            Add can
          </Button>
          {error ? <p className="basis-full rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
        </form>
      ) : error ? (
        <p className="border-b border-slate-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{error}</p>
      ) : null}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(row) => row.id}
        empty={
          <span className="text-slate-500">
            {isLoading ? "Loading cans..." : canEdit ? "No cans recorded yet. Add an empty can above." : "No cans recorded for this transfer"}
          </span>
        }
      />
    </PagePanel>
  );
}

function ProcessingStatus({ item }: { item: IssueNoteItem }) {
  const latestCheck = item.processingQualityChecks?.[0];
  const tone =
    item.processingStatus === "Accepted"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : item.processingStatus === "Spoiled"
        ? "border-red-200 bg-red-50 text-red-700"
        : item.processingStatus === "Returned"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className="min-w-40">
      <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${tone}`}>
        {item.processingStatus ?? "Pending"}
      </span>
      {latestCheck ? (
        <div className="mt-1 text-xs text-slate-500">
          pH {latestCheck.phValue} / Brix {latestCheck.brixValue} / {latestCheck.temperatureC} C
          {latestCheck.warningMessage ? <div className="font-semibold text-yellow-700">{latestCheck.warningMessage}</div> : null}
        </div>
      ) : (
        <div className="mt-1 text-xs text-slate-500">No processing check</div>
      )}
    </div>
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
