import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fieldCollectionApi, systemCansApi } from "../api/client";
import { IssueNoteDetailPage } from "./FieldCollectionDetailPage";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    fieldCollectionApi: {
      detail: vi.fn(),
      addIssueCan: vi.fn(),
      removeIssueCan: vi.fn()
    },
    systemCansApi: {
      list: vi.fn()
    }
  };
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin/field-collection/issue-notes/20"]}>
        <Routes>
          <Route path="/admin/field-collection/issue-notes/:id" element={<IssueNoteDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("IssueNoteDetailPage", () => {
  it("shows temperature input for active Sap issue notes", async () => {
    vi.mocked(fieldCollectionApi.detail).mockResolvedValue({
      id: 20,
      mobileLocalId: null,
      issueNoteName: "Morning sap",
      collectionDate: "2026-05-10T00:00:00.000Z",
      centerId: 1,
      center: {
        id: 1,
        centerId: "C001",
        location: "Deniyaya",
        agent: "Test Agent",
        contactPhone: null,
        status: "Active",
        createdAt: "2026-05-10T00:00:00.000Z",
        updatedAt: "2026-05-10T00:00:00.000Z"
      },
      submittedByEmployeeId: null,
      type: "Sap",
      status: "Active",
      canCount: 0,
      totalQty: 0,
      items: [],
      deletedAt: null,
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-10T00:00:00.000Z"
    });
    vi.mocked(systemCansApi.list).mockResolvedValue({
      data: [],
      facets: { statuses: [], agents: [] },
      page: 1,
      pageSize: 100,
      total: 0,
      pageCount: 1
    });

    renderPage();

    expect(await screen.findByLabelText(/Temperature \(C\)/i)).toBeInTheDocument();
  });
});
