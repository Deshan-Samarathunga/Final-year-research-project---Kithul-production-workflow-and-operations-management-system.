export const queryKeys = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,
  employees: (page: number, pageSize: number, search: string) =>
    ["employees", page, pageSize, search] as const,
  centers: (page: number, pageSize: number, search: string) => ["centers", page, pageSize, search] as const,
  systemCans: (page: number, pageSize: number, search: string) =>
    ["system-cans", page, pageSize, search] as const,
  canHistory: (id: number) => ["system-cans", id, "history"] as const,
  issueNotes: (status: string, page: number, pageSize: number, search: string) =>
    ["issue-notes", status, page, pageSize, search] as const
};
