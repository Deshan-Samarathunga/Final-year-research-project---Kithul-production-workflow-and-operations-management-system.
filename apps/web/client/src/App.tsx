import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "./api/client";
import { queryKeys } from "./api/queryKeys";
import { AdminShell } from "./components/AdminShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { CentersPage } from "./pages/CentersPage";
import { SystemCansPage } from "./pages/SystemCansPage";
import { FieldCollectionPage } from "./pages/FieldCollectionPage";
import { IssueNoteDetailPage, TransferNoteDetailPage } from "./pages/FieldCollectionDetailPage";
import { FieldMonitorPage } from "./pages/FieldMonitorPage";
import { TransferNotesPage } from "./pages/TransferNotesPage";

function RequireAuth() {
  const location = useLocation();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    retry: false
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
        Loading KithulFlow...
      </div>
    );
  }

  if (isError || !data?.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <AdminShell displayName={data.user.displayName} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/employees" element={<EmployeesPage />} />
        <Route path="/admin/centers" element={<CentersPage />} />
        <Route path="/admin/system-cans" element={<SystemCansPage />} />
        <Route path="/admin/field-collection" element={<FieldCollectionPage />} />
        <Route path="/admin/field-monitor" element={<FieldMonitorPage />} />
        <Route path="/admin/field-collection/issue-notes/:id" element={<IssueNoteDetailPage />} />
        <Route path="/admin/field-collection/transfers" element={<TransferNotesPage />} />
        <Route path="/admin/field-collection/transfers/:id" element={<TransferNoteDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
