"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { BACKEND_URL, getSupabase } from "@/lib/supabase";

type Tab = "whatsapp" | "telegram" | "instagram";
const TABS: { id: Tab; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telegram", label: "Telegram" },
  { id: "instagram", label: "Instagram" },
];

export default function LinkAccountModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("whatsapp");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function getCode() {
    const digits = phone.replace(/\D/g, ""); // country code + number, no "+"
    if (digits.length < 8) {
      setError("Enter your number with country code, e.g. 919876543210.");
      return;
    }
    setLoading(true);
    setError(null);
    setCode(null);
    try {
      const { data } = await getSupabase().auth.getUser();
      if (!data.user) throw new Error("Not signed in");
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id, phoneNumber: digits }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setCode(json.code ?? json.pairingCode);
    } catch (e) {
      setError("Could not get a pairing code. Check the number and try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function close() {
    setCode(null);
    setError(null);
    setPhone("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Link accounts"
        className="w-full max-w-md rounded-2xl bg-zinc-900 p-5 ring-1 ring-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">Link an account</h2>
          <button
            onClick={close}
            aria-label="Close"
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex gap-1 rounded-lg bg-zinc-950 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-md py-1.5 text-sm transition ${
                tab === t.id
                  ? "bg-slate-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "whatsapp" && (
          <div className="space-y-4">
            <label className="block text-sm text-zinc-300">
              Phone number (with country code)
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="919876543210"
                className="mt-1.5 w-full rounded-lg bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-slate-500"
              />
            </label>

            <button
              onClick={getCode}
              disabled={loading}
              className="w-full rounded-lg bg-slate-600 py-2.5 text-sm font-medium text-white hover:bg-slate-500 disabled:opacity-50"
            >
              {loading ? "Getting code…" : "Get pairing code"}
            </button>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {code && (
              <div className="rounded-xl bg-zinc-950 p-4 text-center ring-1 ring-zinc-800">
                <p className="font-mono text-3xl font-bold tracking-[0.25em] text-zinc-50">
                  {code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code}
                </p>
                <button
                  onClick={copy}
                  className="mx-auto mt-3 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-zinc-800"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy code"}
                </button>
                <p className="mt-3 text-left text-xs leading-relaxed text-zinc-400">
                  On your phone, open WhatsApp → Settings → Linked devices → Link a
                  device → Link with phone number instead, then enter this code.
                </p>
              </div>
            )}
          </div>
        )}

        {tab !== "whatsapp" && (
          <p className="rounded-lg bg-zinc-950 p-4 text-sm text-zinc-400 ring-1 ring-zinc-800">
            {tab === "telegram" ? "Telegram" : "Instagram"} linking isn’t built yet.
            WhatsApp is the only bridge available right now.
          </p>
        )}
      </div>
    </div>
  );
}

