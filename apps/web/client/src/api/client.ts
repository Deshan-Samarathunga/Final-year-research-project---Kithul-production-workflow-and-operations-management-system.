const API_URL = import.meta.env.VITE_API_URL ?? "";

export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type FacetOption = {
  value: string;
  count: number;
};

export type EmployeeFilters = {
  employee?: string;
  role?: string;
  status?: string;
  userId?: string;
  defaultLogin?: string;
};

export type CenterFilters = {
  centerId?: string;
  location?: string;
  agent?: string;
  contact?: string;
  status?: string;
};

export type SystemCanFilters = {
  canCode?: string;
  status?: string;
  agentName?: string;
  reference?: string;
  updatedFrom?: string;
  updatedTo?: string;
};

export type FieldCollectionFilters = {
  issueNote?: string;
  type?: string;
  centerAgent?: string;
  collectionFrom?: string;
  collectionTo?: string;
};

export type TransferNoteFilters = {
  transferNote?: string;
  agent?: string;
  transferFrom?: string;
  transferTo?: string;
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
  mobileLocalId: string | null;
  issueNoteName: string;
  collectionDate: string;
  centerId: number | null;
  center: Center | null;
  submittedByEmployeeId: number | null;
  submittedByEmployee?: Employee | null;
  type: string;
  status: "Active" | "Completed";
  canCount: number;
  totalQty: number;
  items?: IssueNoteItem[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IssueNoteItem = {
  id: number;
  mobileLocalId: string | null;
  issueNoteId: number;
  canCode: string;
  quantity: number;
  phValue: number;
  brixValue: number;
  temperatureC: number | null;
  processingStatus?: "Pending" | "Accepted" | "Spoiled" | "Returned";
  processingQualityChecks?: ProcessingQualityCheck[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProcessingQualityCheck = {
  id: number;
  issueNoteItemId: number;
  phValue: number;
  brixValue: number;
  temperatureC: number;
  decision: "Accepted" | "Spoiled";
  reason: string | null;
  phWarning: boolean;
  brixWarning: boolean;
  temperatureWarning: boolean;
  warningMessage: string | null;
  checkedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type IssueNoteResponse = PaginatedResponse<IssueNote> & {
  counts: {
    active: number;
    completed: number;
  };
  facets: {
    types: FacetOption[];
    agents: FacetOption[];
  };
};

export type TransferNoteItem = {
  id: number;
  mobileLocalId: string | null;
  transferNoteId: number;
  canCode: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransferNote = {
  id: number;
  mobileLocalId: string | null;
  transferNoteNo: string;
  transferDate: string;
  centerId: number | null;
  center: Center | null;
  submittedByEmployeeId: number | null;
  submittedByEmployee?: Employee | null;
  status: "Active" | "Completed";
  canCount: number;
  items?: TransferNoteItem[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransferNoteResponse = PaginatedResponse<TransferNote> & {
  counts: {
    active: number;
    completed: number;
  };
  facets: {
    agents: FacetOption[];
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

export type MobileSyncEvent = {
  id: number;
  employeeId: number | null;
  employee: Employee | null;
  status: "Success" | "Failed";
  issueNoteCount: number;
  issueNoteItemCount: number;
  transferNoteCount: number;
  transferNoteItemCount: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type FieldMonitorResponse = {
  serverTime: string;
  metrics: {
    lastSyncAt: string | null;
    lastSyncEmployee: string | null;
    receivedIssueNotesToday: number;
    receivedCanRowsToday: number;
    activeMobileNotes: number;
    failedSyncsToday: number;
  };
  latestSuccessfulSync: MobileSyncEvent | null;
  syncEvents: MobileSyncEvent[];
  issueNotes: IssueNote[];
  issueNoteItems: Array<IssueNoteItem & { issueNote: IssueNote }>;
  transferNotes: TransferNote[];
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

function cleanParams(params: Record<string, string | undefined> = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));
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
  list: (params: { page: number; pageSize: number; search?: string; filters?: EmployeeFilters }) => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search ? { search: params.search } : {}),
      ...cleanParams(params.filters)
    });
    return api<PaginatedResponse<Employee> & { facets: { roles: FacetOption[]; statuses: FacetOption[]; defaultLogin: FacetOption[] } }>(
      `/api/employees?${query}`
    );
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
  list: (params: { page: number; pageSize: number; search?: string; filters?: CenterFilters }) => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search ? { search: params.search } : {}),
      ...cleanParams(params.filters)
    });
    return api<PaginatedResponse<Center> & { facets: { agents: FacetOption[]; statuses: FacetOption[] } }>(
      `/api/centers?${query}`
    );
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
  list: (params: { page: number; pageSize: number; search?: string; filters?: SystemCanFilters }) => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search ? { search: params.search } : {}),
      ...cleanParams(params.filters)
    });
    return api<PaginatedResponse<SystemCan> & { facets: { statuses: FacetOption[]; agents: FacetOption[] } }>(
      `/api/system-cans?${query}`
    );
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
  monitor: () => api<FieldMonitorResponse>("/api/field-collection/monitor"),
  list: (params: { status: "Active" | "Completed"; page: number; pageSize: number; search?: string; filters?: FieldCollectionFilters }) => {
    const query = new URLSearchParams({
      status: params.status,
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search ? { search: params.search } : {}),
      ...cleanParams(params.filters)
    });
    return api<IssueNoteResponse>(`/api/field-collection/issue-notes?${query}`);
  },
  create: (payload: { issueNoteName: string; collectionDate: string; centerId: number; type: string }) =>
    api<IssueNote>("/api/field-collection/issue-notes", { method: "POST", json: payload }),
  detail: (id: number) => api<IssueNote>(`/api/field-collection/issue-notes/${id}`),
  update: (id: number, payload: Partial<IssueNote>) =>
    api<IssueNote>(`/api/field-collection/issue-notes/${id}`, { method: "PATCH", json: payload }),
  addIssueCan: (id: number, payload: { canCode: string; quantity: number; phValue: number; brixValue: number; temperatureC?: number | null }) =>
    api<IssueNote>(`/api/field-collection/issue-notes/${id}/items`, { method: "POST", json: payload }),
  removeIssueCan: (id: number, itemId: number) =>
    api<void>(`/api/field-collection/issue-notes/${id}/items/${itemId}`, { method: "DELETE" }),
  createQualityCheck: (
    itemId: number,
    payload: { phValue: number; brixValue: number; temperatureC: number; decision: "Accepted" | "Spoiled"; reason?: string | null }
  ) => api<ProcessingQualityCheck>(`/api/field-collection/issue-note-items/${itemId}/quality-checks`, { method: "POST", json: payload }),
  returnIssueCan: (itemId: number) => api<IssueNoteItem>(`/api/field-collection/issue-note-items/${itemId}/return`, { method: "POST" }),
  transfers: (params: { status: "Active" | "Completed"; page: number; pageSize: number; search?: string; filters?: TransferNoteFilters }) => {
    const query = new URLSearchParams({
      status: params.status,
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search ? { search: params.search } : {}),
      ...cleanParams(params.filters)
    });
    return api<TransferNoteResponse>(`/api/field-collection/transfer-notes?${query}`);
  },
  createTransfer: (payload: { transferNoteNo: string; transferDate: string; centerId: number }) =>
    api<TransferNote>("/api/field-collection/transfer-notes", { method: "POST", json: payload }),
  transferDetail: (id: number) => api<TransferNote>(`/api/field-collection/transfer-notes/${id}`),
  updateTransfer: (id: number, payload: Partial<Pick<TransferNote, "transferNoteNo" | "transferDate" | "centerId" | "status">>) =>
    api<TransferNote>(`/api/field-collection/transfer-notes/${id}`, { method: "PATCH", json: payload }),
  addTransferCan: (id: number, payload: { canCode: string }) =>
    api<TransferNote>(`/api/field-collection/transfer-notes/${id}/items`, { method: "POST", json: payload }),
  removeTransferCan: (id: number, itemId: number) =>
    api<void>(`/api/field-collection/transfer-notes/${id}/items/${itemId}`, { method: "DELETE" })
};
