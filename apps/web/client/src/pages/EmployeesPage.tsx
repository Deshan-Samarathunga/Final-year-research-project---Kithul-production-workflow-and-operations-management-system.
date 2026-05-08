import { FormEvent, useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, KeyRound, Plus, Save, Trash2, X } from "lucide-react";
import { employeesApi, type Employee, type EmployeeFilters, type FacetOption } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { OptionColumnFilter, TextColumnFilter } from "../components/ColumnFilters";
import { DataTable, type Column } from "../components/Table";
import { Modal } from "../components/Modal";
import { PagePanel } from "../components/PagePanel";
import { Pagination } from "../components/Pagination";

const roles = [
  "Field Collection",
  "Inventory Management",
  "Order Management",
  "Finance Management",
  "Labeling",
  "Packaging",
  "Processing"
];

const employeeStatuses = ["Active", "Inactive"];

function countFor(options: FacetOption[] | undefined, value: string) {
  return options?.find((option) => option.value === value)?.count ?? 0;
}

type EmployeeDialogState =
  | { mode: "create"; employee?: never }
  | { mode: "edit"; employee: Employee };

function EmployeeDialog({
  state,
  onClose
}: {
  state: EmployeeDialogState;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState(state.employee?.userId ?? "");
  const [fullName, setFullName] = useState(state.employee?.fullName ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(state.employee?.role ?? "Field Collection");
  const [status, setStatus] = useState<Employee["status"]>(state.employee?.status ?? "Active");
  const [defaultLogin, setDefaultLogin] = useState(state.employee?.defaultLogin ?? true);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      if (state.mode === "create") {
        return employeesApi.create({ userId, fullName, password, role, status, defaultLogin });
      }
      return employeesApi.update(state.employee.id, { userId, fullName, role, status, defaultLogin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
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
      title={state.mode === "create" ? "Add employee" : "Edit employee"}
      description={
        state.mode === "create"
          ? "Create a new employee login."
          : "Update employee details and default login behavior."
      }
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose} icon={<X className="h-4 w-4" />}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="employee-form"
            variant="primary"
            disabled={mutation.isPending}
            icon={state.mode === "create" ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          >
            {state.mode === "create" ? "Add employee" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="employee-form" className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">
          User ID
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="Enter user ID"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Full Name
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Enter full name"
            required
          />
        </label>
        {state.mode === "create" ? (
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Enter password"
              required
              minLength={6}
            />
          </label>
        ) : null}
        <label className="block text-sm font-medium text-slate-700">
          Role
          <select
            className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {roles.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {state.mode === "edit" ? (
          <>
            <label className="block text-sm font-medium text-slate-700">
              Status
              <select
                className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={status}
                onChange={(event) => setStatus(event.target.value as Employee["status"])}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Default Login
              <select
                className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={defaultLogin ? "true" : "false"}
                onChange={(event) => setDefaultLogin(event.target.value === "true")}
              >
                <option value="true">Use this employee</option>
                <option value="false">Do not preselect</option>
              </select>
            </label>
            <p className="text-xs text-slate-500">This sets who is preselected at login for the chosen role.</p>
          </>
        ) : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
      </form>
    </Modal>
  );
}

function ChangePasswordDialog({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => employeesApi.changePassword(employee.id, { password, confirmPassword }),
    onSuccess: onClose,
    onError: (mutationError: Error) => setError(mutationError.message)
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    mutation.mutate();
  }

  return (
    <Modal
      title="Change password"
      description={`Set a new password for ${employee.fullName}.`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="password-form" variant="primary" disabled={mutation.isPending}>
            Update password
          </Button>
        </>
      }
    >
      <form id="password-form" className="space-y-3" onSubmit={submit}>
        <input
          className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="New password"
          required
          minLength={6}
        />
        <input
          className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          placeholder="Confirm new password"
          required
          minLength={6}
        />
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
      </form>
    </Modal>
  );
}

export function EmployeesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [dialog, setDialog] = useState<EmployeeDialogState | null>(null);
  const [passwordEmployee, setPasswordEmployee] = useState<Employee | null>(null);
  const queryClient = useQueryClient();
  const filterKey = JSON.stringify(filters);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.employees(page, pageSize, search, filterKey),
    queryFn: () => employeesApi.list({ page, pageSize, search, filters })
  });
  const remove = useMutation({
    mutationFn: employeesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] })
  });

  const updateFilter = useCallback((key: keyof EmployeeFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const columns = useMemo<Column<Employee>[]>(
    () => [
      {
        header: "Employee",
        filterControl: (
          <TextColumnFilter
            value={filters.employee ?? ""}
            placeholder="Search employees"
            onChange={(value) => updateFilter("employee", value)}
          />
        ),
        accessor: (row) => row.fullName
      },
      {
        header: "Role",
        filterControl: (
          <OptionColumnFilter
            value={filters.role ?? ""}
            allLabel={`All roles (${data?.total ?? 0})`}
            searchPlaceholder="Search roles"
            options={roles.map((role) => ({ label: role, value: role, count: countFor(data?.facets.roles, role) }))}
            onChange={(value) => updateFilter("role", value)}
          />
        ),
        accessor: (row) => <span className="text-slate-700">{row.role}</span>
      },
      {
        header: "Status",
        filterControl: (
          <OptionColumnFilter
            value={filters.status ?? ""}
            allLabel={`All (${data?.total ?? 0})`}
            searchPlaceholder="Search status"
            options={employeeStatuses.map((status) => ({
              label: status,
              value: status,
              count: countFor(data?.facets.statuses, status)
            }))}
            onChange={(value) => updateFilter("status", value)}
          />
        ),
        accessor: (row) => row.status
      },
      {
        header: "User ID",
        filterControl: (
          <TextColumnFilter
            value={filters.userId ?? ""}
            placeholder="Search user IDs"
            onChange={(value) => updateFilter("userId", value)}
          />
        ),
        accessor: (row) => <code>{row.userId}</code>
      },
      {
        header: "Default Login",
        filterControl: (
          <OptionColumnFilter
            value={filters.defaultLogin ?? ""}
            allLabel={`All (${data?.total ?? 0})`}
            searchPlaceholder="Search default login"
            options={[
              { label: "Default", value: "true", count: countFor(data?.facets.defaultLogin, "true") },
              { label: "Not default", value: "false", count: countFor(data?.facets.defaultLogin, "false") }
            ]}
            onChange={(value) => updateFilter("defaultLogin", value)}
          />
        ),
        accessor: (row) => (row.defaultLogin ? "Default" : "-")
      },
      {
        header: "Actions",
        align: "right",
        accessor: (row) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="dark"
              className="h-8"
              onClick={() => setDialog({ mode: "edit", employee: row })}
              icon={<Edit3 className="h-4 w-4" />}
            >
              Edit
            </Button>
            <Button type="button" className="h-8" onClick={() => setPasswordEmployee(row)} icon={<KeyRound className="h-4 w-4" />}>
              Change password
            </Button>
            <Button
              type="button"
              variant="danger"
              className="h-8"
              onClick={() => {
                if (confirm(`Delete ${row.fullName}?`)) remove.mutate(row.id);
              }}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Delete
            </Button>
          </div>
        )
      }
    ],
    [data?.facets.defaultLogin, data?.facets.roles, data?.facets.statuses, data?.total, filters, remove, updateFilter]
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
              placeholder="Search employees"
            />
            <Button type="button" variant="primary" onClick={() => setDialog({ mode: "create" })} icon={<Plus className="h-4 w-4" />}>
              Add employee
            </Button>
          </>
        }
      >
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          rowKey={(row) => row.id}
          empty={<span className="text-slate-500">{isLoading ? "Loading employees..." : "No employees found"}</span>}
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

      {dialog ? <EmployeeDialog state={dialog} onClose={() => setDialog(null)} /> : null}
      {passwordEmployee ? <ChangePasswordDialog employee={passwordEmployee} onClose={() => setPasswordEmployee(null)} /> : null}
    </>
  );
}
