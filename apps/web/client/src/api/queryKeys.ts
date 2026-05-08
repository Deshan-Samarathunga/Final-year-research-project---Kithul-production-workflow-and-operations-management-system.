export const queryKeys = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,
  employees: (page: number, pageSize: number, search: string, filters = "") =>
    ["employees", page, pageSize, search, filters] as const,
  centers: (page: number, pageSize: number, search: string, filters = "") => ["centers", page, pageSize, search, filters] as const,
  systemCans: (page: number, pageSize: number, search: string, filters = "") =>
    ["system-cans", page, pageSize, search, filters] as const,
  canHistory: (id: number) => ["system-cans", id, "history"] as const,
  fieldMonitor: ["field-monitor"] as const,
  issueNotes: (status: string, page: number, pageSize: number, search: string, filters = "") =>
    ["issue-notes", status, page, pageSize, search, filters] as const,
  transferNotes: (status: string, page: number, pageSize: number, search: string, filters = "") =>
    ["transfer-notes", status, page, pageSize, search, filters] as const
};
