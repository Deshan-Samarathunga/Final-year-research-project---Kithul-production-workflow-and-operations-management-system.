import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, LogIn, User } from "lucide-react";
import { authApi } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { BrandLogo } from "../components/BrandLogo";
import { Button } from "../components/Button";

export function LoginPage() {
  const [userId, setUserId] = useState("admin");
  const [password, setPassword] = useState("Admin@12345");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/admin/dashboard";

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.me, data);
      navigate(from, { replace: true });
    },
    onError: (loginError: Error) => {
      setError(loginError.message);
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    login.mutate({ userId, password });
  }

  if (from === "/login") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-6 shadow-xl">
        <BrandLogo />
        <div className="mt-6">
          <h1 className="text-2xl font-bold text-slate-950">Administration</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to manage KithulFlow operations.</p>
        </div>

        <label className="mt-6 block text-sm font-medium text-slate-700">
          User ID or email
          <span className="mt-2 flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <User className="h-4 w-4 text-slate-500" />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              autoComplete="username"
              required
            />
          </span>
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Password
          <span className="mt-2 flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <Lock className="h-4 w-4 text-slate-500" />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </span>
        </label>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

        <Button
          type="submit"
          variant="primary"
          className="mt-6 w-full"
          disabled={login.isPending}
          icon={<LogIn className="h-4 w-4" />}
        >
          {login.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
