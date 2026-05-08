import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { systemCansApi } from "../api/client";
import { SystemCansPage } from "./SystemCansPage";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    systemCansApi: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      history: vi.fn(),
      remove: vi.fn()
    }
  };
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <SystemCansPage />
    </QueryClientProvider>
  );
}

describe("SystemCansPage", () => {
  it("opens a QR label modal for a can row", async () => {
    vi.mocked(systemCansApi.list).mockResolvedValue({
      data: [
        {
          id: 1,
          canCode: "AR001",
          status: "In warehouse",
          agentName: null,
          reference: null,
          lastUpdated: "2026-05-08T09:00:00.000Z",
          createdAt: "2026-05-08T09:00:00.000Z",
          updatedAt: "2026-05-08T09:00:00.000Z"
        }
      ],
      facets: { statuses: [], agents: [] },
      page: 1,
      pageSize: 50,
      total: 1,
      pageCount: 1
    });

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "QR" }));

    expect(screen.getByRole("heading", { name: "AR001 QR code" })).toBeInTheDocument();
    expect(screen.getAllByText("AR001").length).toBeGreaterThan(1);
  });
});
