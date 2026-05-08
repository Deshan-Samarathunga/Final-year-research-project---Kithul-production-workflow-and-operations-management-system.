import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "./App";

vi.mock("./api/client", async () => {
  const actual = await vi.importActual<typeof import("./api/client")>("./api/client");
  return {
    ...actual,
    authApi: {
      me: vi.fn().mockRejectedValue(new Error("Authentication required")),
      login: vi.fn(),
      logout: vi.fn()
    }
  };
});

describe("App protected routes", () => {
  it("redirects unauthenticated users to login", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/admin/employees"]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: /Administration/i })).toBeInTheDocument());
  });
});
