import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FieldCollectionTabs } from "./FieldCollectionPage";

describe("FieldCollectionTabs", () => {
  it("switches between active and completed tabs", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();

    render(<FieldCollectionTabs status="Active" active={0} completed={118} onStatusChange={onStatusChange} />);

    await user.click(screen.getByRole("button", { name: /Completed 118/i }));

    expect(onStatusChange).toHaveBeenCalledWith("Completed");
  });
});
