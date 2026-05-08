import { render, screen } from "@testing-library/react";
import { DataTable, type Column } from "./Table";

type Row = {
  id: number;
  name: string;
  role: string;
};

const columns: Column<Row>[] = [
  { header: "Employee", filter: "search", accessor: (row) => row.name },
  { header: "Role", filter: "sort", accessor: (row) => row.role }
];

describe("DataTable", () => {
  it("renders headers and row values", () => {
    render(<DataTable columns={columns} data={[{ id: 1, name: "Field Collector", role: "Field Collection" }]} rowKey={(row) => row.id} />);

    expect(screen.getByText("Employee")).toBeInTheDocument();
    expect(screen.getByText("Field Collector")).toBeInTheDocument();
    expect(screen.getByText("Field Collection")).toBeInTheDocument();
  });

  it("renders a custom empty state", () => {
    render(<DataTable columns={columns} data={[]} rowKey={(row) => row.id} empty={<span>No data yet</span>} />);

    expect(screen.getByText("No data yet")).toBeInTheDocument();
  });
});
