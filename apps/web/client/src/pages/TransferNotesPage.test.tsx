import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { centersApi, fieldCollectionApi } from "../api/client";
import { TransferNotesPage } from "./TransferNotesPage";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    centersApi: {
      list: vi.fn()
    },
    fieldCollectionApi: {
      transfers: vi.fn(),
      createTransfer: vi.fn()
    }
  };
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TransferNotesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TransferNotesPage", () => {
  it("opens the create transfer note dialog", async () => {
    vi.mocked(fieldCollectionApi.transfers).mockResolvedValue({
      data: [],
      counts: { active: 0, completed: 0 },
      facets: { agents: [] },
      page: 1,
      pageSize: 50,
      total: 0,
      pageCount: 1
    });
    vi.mocked(centersApi.list).mockResolvedValue({
      data: [
        {
          id: 1,
          centerId: "C001",
          location: "Deniyaya",
          agent: "Test Agent",
          contactPhone: null,
          status: "Active",
          createdAt: "2026-05-10T00:00:00.000Z",
          updatedAt: "2026-05-10T00:00:00.000Z"
        }
      ],
      facets: { agents: [], statuses: [] },
      page: 1,
      pageSize: 100,
      total: 1,
      pageCount: 1
    });

    renderPage();

    await userEvent.click((await screen.findAllByRole("button", { name: /New transfer note/i }))[0]);

    expect(screen.getByRole("heading", { name: "Create transfer note" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Transfer note no/i)).toBeInTheDocument();
  });
});
