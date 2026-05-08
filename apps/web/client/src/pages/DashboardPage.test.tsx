import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { dashboardApi } from "../api/client";
import { DashboardPage } from "./DashboardPage";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    dashboardApi: {
      summary: vi.fn()
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
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("DashboardPage", () => {
  it("links mobile received data to the field monitor", async () => {
    vi.mocked(dashboardApi.summary).mockResolvedValue({
      cards: [
        {
          key: "mobile-received-data",
          title: "Mobile Received Data",
          total: 2,
          tone: "cyan",
          badges: [{ label: "Can Rows Today", value: 4, tone: "blue" }]
        }
      ]
    });

    renderPage();

    const link = await screen.findByRole("link", { name: /Mobile Received Data/i });
    expect(link).toHaveAttribute("href", "/admin/field-monitor");
  });
});
