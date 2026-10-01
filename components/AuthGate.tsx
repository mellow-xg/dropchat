"use client";

import { useEffect, useState } from "react";
import { MessagesSquare } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { error } =
        mode === "in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) setMsg(error.message);
      else if (mode === "up") setMsg("Account created. Check your email to confirm, then sign in.");
    } catch {
      setMsg("Authentication is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div className="h-dvh bg-zinc-950" />;
  if (session) return <>{children}</>;

  return (
    <div className="flex h-dvh items-center justify-center bg-zinc-950 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-zinc-900 p-6 ring-1 ring-zinc-800"
      >
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-slate-700 p-2 text-white">
            <MessagesSquare size={20} />
          </span>
          <div>
            <h1 className="text-base font-semibold text-zinc-100">Unified Inbox</h1>
            <p className="text-xs text-zinc-400">All your chats in one place</p>
          </div>
        </div>

        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-lg bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-slate-500"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          className="w-full rounded-lg bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-slate-500"
        />

        {msg && <p className="text-sm text-amber-400">{msg}</p>}

        <button
          disabled={busy}
          className="w-full rounded-lg bg-slate-600 py-2.5 text-sm font-medium text-white hover:bg-slate-500 disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setMsg(null);
          }}
          className="w-full text-center text-sm text-zinc-400 hover:text-zinc-200"
        >
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

