import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { Button } from "./Button";
import { authApi } from "../api/client";

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

const navSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Operations",
    items: [{ label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard }]
  },
  {
    title: "Master Data",
    items: [
      { label: "Employees", to: "/admin/employees", icon: Users },
      { label: "Centers", to: "/admin/centers", icon: Building2 },
      { label: "System Cans", to: "/admin/system-cans", icon: ClipboardCheck }
    ]
  }
];

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Administration",
  "/admin/employees": "Employees",
  "/admin/centers": "Centers",
  "/admin/system-cans": "System Cans",
  "/admin/field-collection": "Field Collection",
  "/admin/field-monitor": "Field Monitor"
};

function Sidebar({ open, currentPath, onClose }: { open: boolean; currentPath: string; onClose: () => void }) {
  return (
    <aside
      className={`fixed bottom-4 left-4 top-[72px] z-30 flex w-[288px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel transition lg:static lg:z-auto lg:h-full lg:min-h-0 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-[120%]"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-3">
        <div>
          <p className="font-bold text-slate-950">KithulFlow</p>
          <p className="text-sm text-slate-600">Administration Portal</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-9 bg-slate-100 px-0"
          aria-label="Close sidebar"
          onClick={onClose}
          icon={<Menu className="h-6 w-6" />}
        />
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.35em] text-slate-600">{section.title}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isFieldActive = item.label === "Dashboard" && currentPath === "/admin/field-collection";

                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex h-10 items-center gap-3 rounded-md border px-3 text-sm transition ${
                        isActive || isFieldActive
                          ? "border-blue-300 bg-blue-100 text-blue-700"
                          : "border-transparent text-slate-600 hover:bg-slate-50"
                      }`
                    }
                    onClick={onClose}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-md ${
                            isActive || isFieldActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        {item.label}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function AdminShell({ displayName = "Admin User" }: { displayName?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      navigate("/login", { replace: true });
    }
  });
  const title = pageTitles[location.pathname] ?? "Administration";
  const isField = location.pathname === "/admin/field-collection";

  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-950">
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-9 px-0 lg:hidden"
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(true)}
            icon={<Menu className="h-5 w-5" />}
          />
          <BrandLogo />
          <div className="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-1 py-1 sm:flex">
            <span className="px-3 text-sm text-slate-600">Administration</span>
            {title !== "Administration" ? (
              <>
                <span className="text-slate-400">›</span>
                <span className="rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                  {title}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden rounded-md bg-slate-50 px-3 py-1 sm:block">
            <p className="text-sm font-bold">{displayName}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Administrator</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className={`h-10 w-10 px-0 ${isField ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-blue-300 bg-blue-100 text-blue-700"}`}
            aria-label="Settings"
            icon={isField ? <ClipboardList className="h-6 w-6" /> : <Settings className="h-6 w-6" />}
          />
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 px-0"
            aria-label="Log out"
            onClick={() => logout.mutate()}
            icon={<LogOut className="h-5 w-5" />}
          />
        </div>
      </header>

      {sidebarOpen ? (
        <button className="fixed inset-0 z-20 bg-slate-900/20 lg:hidden" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <main className={`flex h-[calc(100vh-32px)] gap-4 overflow-hidden px-4 pb-4 pt-[72px] ${isField ? "lg:block" : ""}`}>
        {!isField ? <Sidebar open={sidebarOpen} currentPath={location.pathname} onClose={() => setSidebarOpen(false)} /> : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {sidebarOpen && isField ? (
            <Button
              type="button"
              variant="ghost"
              className="fixed right-4 top-16 z-50 h-9 w-9 px-0 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              icon={<X className="h-5 w-5" />}
            />
          ) : null}
          <Outlet />
        </div>
      </main>
      <footer className="fixed bottom-0 left-0 right-0 flex h-8 items-center justify-between border-t border-slate-200 bg-white px-8 text-xs text-slate-600">
        <span>2026 Kithul Flow Ops</span>
        <span>v1.0.0</span>
      </footer>
    </div>
  );
}
