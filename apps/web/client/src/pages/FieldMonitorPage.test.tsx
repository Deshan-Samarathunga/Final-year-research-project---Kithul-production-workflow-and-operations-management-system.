import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { fieldCollectionApi, type FieldMonitorResponse } from "../api/client";
import { FieldMonitorPage } from "./FieldMonitorPage";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    fieldCollectionApi: {
      ...actual.fieldCollectionApi,
      monitor: vi.fn()
    }
  };
});

const monitorResponse: FieldMonitorResponse = {
  serverTime: "2026-05-08T08:10:00.000Z",
  metrics: {
    lastSyncAt: "2026-05-08T08:00:01.000Z",
    lastSyncEmployee: "Field Collector",
    receivedIssueNotesToday: 1,
    receivedCanRowsToday: 1,
    activeMobileNotes: 0,
    failedSyncsToday: 0
  },
  latestSuccessfulSync: null,
  syncEvents: [
    {
      id: 1,
      employeeId: 7,
      employee: {
        id: 7,
        userId: "field01",
        fullName: "Field Collector",
        role: "Field Collection",
        status: "Active",
        defaultLogin: true,
        createdAt: "2026-05-08T08:00:00.000Z",
        updatedAt: "2026-05-08T08:00:00.000Z"
      },
      status: "Success",
      issueNoteCount: 1,
      issueNoteItemCount: 1,
      transferNoteCount: 0,
      transferNoteItemCount: 0,
      errorMessage: null,
      startedAt: "2026-05-08T08:00:00.000Z",
      completedAt: "2026-05-08T08:00:01.000Z"
    }
  ],
  issueNotes: [
    {
      id: 20,
      mobileLocalId: "note-local",
      issueNoteName: "Morning sap",
      collectionDate: "2026-05-08T08:00:00.000Z",
      centerId: 1,
      center: {
        id: 1,
        centerId: "Ajith",
        location: "Thiniyawala",
        agent: "Chathura Maheepala",
        contactPhone: null,
        status: "Active",
        createdAt: "2026-05-08T08:00:00.000Z",
        updatedAt: "2026-05-08T08:00:00.000Z"
      },
      submittedByEmployeeId: 7,
      submittedByEmployee: {
        id: 7,
        userId: "field01",
        fullName: "Field Collector",
        role: "Field Collection",
        status: "Active",
        defaultLogin: true,
        createdAt: "2026-05-08T08:00:00.000Z",
        updatedAt: "2026-05-08T08:00:00.000Z"
      },
      type: "Sap",
      status: "Completed",
      canCount: 1,
      totalQty: 12.5,
      items: [],
      deletedAt: null,
      createdAt: "2026-05-08T08:00:00.000Z",
      updatedAt: "2026-05-08T08:05:00.000Z"
    }
  ],
  issueNoteItems: [
    {
      id: 30,
      mobileLocalId: "item-local",
      issueNoteId: 20,
      canCode: "AR001",
      quantity: 12.5,
      phValue: 6.2,
      brixValue: 14.8,
      deletedAt: null,
      createdAt: "2026-05-08T08:00:00.000Z",
      updatedAt: "2026-05-08T08:05:00.000Z",
      issueNote: {
        id: 20,
        mobileLocalId: "note-local",
        issueNoteName: "Morning sap",
        collectionDate: "2026-05-08T08:00:00.000Z",
        centerId: 1,
        center: null,
        submittedByEmployeeId: 7,
        submittedByEmployee: null,
        type: "Sap",
        status: "Completed",
        canCount: 1,
        totalQty: 12.5,
        deletedAt: null,
        createdAt: "2026-05-08T08:00:00.000Z",
        updatedAt: "2026-05-08T08:05:00.000Z"
      }
    }
  ],
  transferNotes: []
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FieldMonitorPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("FieldMonitorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders mobile sync metrics and received rows", async () => {
    vi.mocked(fieldCollectionApi.monitor).mockResolvedValue(monitorResponse);

    renderPage();

    expect(await screen.findByText("Field Collection Monitor")).toBeInTheDocument();
    expect(await screen.findByText("Issue Notes Today")).toBeInTheDocument();
    expect(screen.getAllByText("Morning sap").length).toBeGreaterThan(0);
    expect(screen.getByText("AR001")).toBeInTheDocument();
    expect(screen.getByText("14.8")).toBeInTheDocument();
  });

  it("refreshes monitor data manually", async () => {
    const user = userEvent.setup();
    vi.mocked(fieldCollectionApi.monitor).mockResolvedValue(monitorResponse);

    renderPage();

    await screen.findByText("Field Collection Monitor");
    const callsAfterLoad = vi.mocked(fieldCollectionApi.monitor).mock.calls.length;
    await user.click(screen.getByRole("button", { name: /Refresh/i }));

    await waitFor(() => expect(fieldCollectionApi.monitor).toHaveBeenCalledTimes(callsAfterLoad + 1));
  });
});
