const API_URL = import.meta.env.VITE_API_URL ?? "";

export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type AdminUser = {
  id: number;
  userId: string;
  email: string;
  displayName: string;
};

export type Employee = {
  id: number;
  userId: string;
  fullName: string;
  role: string;
  status: "Active" | "Inactive";
  defaultLogin: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Center = {
  id: number;
  centerId: string;
  location: string;
  agent: string;
  contactPhone: string | null;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
};

export type SystemCan = {
  id: number;
  canCode: string;
  status: "In warehouse" | "Dispatched" | "Lost" | "Retired";
  agentName: string | null;
  reference: string | null;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
};

export type CanHistory = {
  id: number;
  canId: number;
  status: string;
  agentName: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
};

export type SystemCanWithHistory = SystemCan & {
  histories: CanHistory[];
};

export type IssueNote = {
  id: number;
  issueNoteName: string;
  collectionDate: string;
  centerId: number | null;
  center: Center | null;
  type: string;
  status: "Active" | "Completed";
  canCount: number;
  totalQty: number;
  createdAt: string;
  updatedAt: string;
};

export type IssueNoteResponse = PaginatedResponse<IssueNote> & {
  counts: {
    active: number;
    completed: number;
  };
};

export type DashboardCard = {
  key: string;
  title: string;
  total: number;
  tone: string;
  badges: Array<{
    label: string;
    value: number;
    tone: "blue" | "green" | "red" | "yellow" | "purple";
  }>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown
  ) {
    super(message);
  }
}

type RequestOptions = RequestInit & {
  json?: unknown;
};

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body ? String(body.message) : "Request failed";
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

export const authApi = {
  me: () => api<{ user: AdminUser }>("/api/auth/me"),
  login: (payload: { userId: string; password: string }) =>
    api<{ user: AdminUser }>("/api/auth/login", { method: "POST", json: payload }),
  logout: () => api<void>("/api/auth/logout", { method: "POST" })
};

export const dashboardApi = {
  summary: () => api<{ cards: DashboardCard[] }>("/api/dashboard/summary")
};

export const employeesApi = {
  list: (params: { page: number; pageSize: number; search?: string }) => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search ? { search: params.search } : {})
    });
    return api<PaginatedResponse<Employee>>(`/api/employees?${query}`);
  },
  create: (payload: {
    userId: string;
    fullName: string;
    password: string;
    role: string;
    status?: string;
    defaultLogin: boolean;
  }) => api<Employee>("/api/employees", { method: "POST", json: payload }),
  update: (id: number, payload: Partial<Omit<Employee, "id" | "createdAt" | "updatedAt">>) =>
    api<Employee>(`/api/employees/${id}`, { method: "PATCH", json: payload }),
  changePassword: (id: number, payload: { password: string; confirmPassword: string }) =>
    api<void>(`/api/employees/${id}/password`, { method: "PATCH", json: payload }),
  remove: (id: number) => api<void>(`/api/employees/${id}`, { method: "DELETE" })
};

export const centersApi = {
  list: (params: { page: number; pageSize: number; search?: string }) => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search ? { search: params.search } : {})
    });
    return api<PaginatedResponse<Center>>(`/api/centers?${query}`);
  },
  create: (payload: {
    centerId: string;
    location: string;
    agent: string;
    contactPhone?: string | null;
    status?: string;
  }) => api<Center>("/api/centers", { method: "POST", json: payload }),
  update: (id: number, payload: Partial<Omit<Center, "id" | "centerId" | "createdAt" | "updatedAt">>) =>
    api<Center>(`/api/centers/${id}`, { method: "PATCH", json: payload }),
  remove: (id: number) => api<void>(`/api/centers/${id}`, { method: "DELETE" })
};

export const systemCansApi = {
  list: (params: { page: number; pageSize: number; search?: string }) => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search ? { search: params.search } : {})
    });
    return api<PaginatedResponse<SystemCan>>(`/api/system-cans?${query}`);
  },
  create: (payload: {
    canCode: string;
    status: string;
    agentName?: string | null;
    reference?: string | null;
    note?: string | null;
  }) => api<SystemCan>("/api/system-cans", { method: "POST", json: payload }),
  update: (id: number, payload: Partial<SystemCan>) =>
    api<SystemCan>(`/api/system-cans/${id}`, { method: "PATCH", json: payload }),
  history: (id: number) => api<SystemCanWithHistory>(`/api/system-cans/${id}/history`),
  remove: (id: number) => api<void>(`/api/system-cans/${id}`, { method: "DELETE" })
};

export const fieldCollectionApi = {
  list: (params: { status: "Active" | "Completed"; page: number; pageSize: number; search?: string }) => {
    const query = new URLSearchParams({
      status: params.status,
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search ? { search: params.search } : {})
    });
    return api<IssueNoteResponse>(`/api/field-collection/issue-notes?${query}`);
  },
  create: (payload: { issueNoteName: string; collectionDate: string; centerId: number; type: string }) =>
    api<IssueNote>("/api/field-collection/issue-notes", { method: "POST", json: payload }),
  update: (id: number, payload: Partial<IssueNote>) =>
    api<IssueNote>(`/api/field-collection/issue-notes/${id}`, { method: "PATCH", json: payload })
};
