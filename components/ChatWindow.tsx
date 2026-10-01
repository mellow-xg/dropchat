"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Send } from "lucide-react";
import { BACKEND_URL, getSupabase, type Conversation, type Message } from "@/lib/supabase";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import PlatformBadge, { platformLabel } from "./PlatformBadge";
import Avatar from "./Avatar";

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}

function Ticks({ status }: { status: Message["status"] }) {
  if (status === "read") return <CheckCheck size={14} className="text-sky-300" />;
  if (status === "delivered") return <CheckCheck size={14} className="text-slate-300" />;
  return <Check size={14} className="text-slate-300" />;
}

type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "msg"; key: string; m: Message; first: boolean };

function buildRows(messages: Message[]): Row[] {
  const rows: Row[] = [];
  let lastDay = "";
  let prev: Message | null = null;
  for (const m of messages) {
    const day = new Date(m.created_at).toDateString();
    if (day !== lastDay) {
      rows.push({ kind: "day", key: `d-${day}`, label: dayLabel(m.created_at) });
      lastDay = day;
      prev = null;
    }
    const sameSender =
      prev &&
      prev.is_from_me === m.is_from_me &&
      prev.sender_id === m.sender_id &&
      new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
    rows.push({ kind: "msg", key: m.id, m, first: !sameSender });
    prev = m;
  }
  return rows;
}

export default function ChatWindow({
  conversation,
  onBack,
}: {
  conversation: Conversation | null;
  onBack?: () => void;
}) {
  const { messages, loading, status } = useRealtimeMessages(conversation?.id ?? null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountActive, setAccountActive] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rows = useMemo(() => buildRows(messages), [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversation?.id]);

  useEffect(() => {
    if (!conversation) return;
    setAccountActive(null);
    setError(null);
    getSupabase()
      .from("connected_accounts")
      .select("is_active")
      .eq("platform", conversation.platform)
      .eq("is_active", true)
      .limit(1)
      .then(({ data }) => setAccountActive((data ?? []).length > 0));
  }, [conversation?.id, conversation?.platform]);

  // grow textarea with content
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [text]);

  async function send() {
    const body = text.trim();
    if (!body || !conversation || sending) return;
    setSending(true);
    setError(null);
    try {
      const { data } = await getSupabase().auth.getSession();
      const res = await fetch(`${BACKEND_URL}/api/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          text: body,
          platform: conversation.platform,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setText(""); // new row arrives via Realtime
    } catch (e) {
      setError("Message not sent. Check that the bridge server is running, then try again.");
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  if (!conversation) {
    return (
      <div className="hidden flex-1 flex-col items-center justify-center gap-1 bg-zinc-900 md:flex">
        <p className="text-sm font-medium text-zinc-300">No chat selected</p>
        <p className="text-sm text-zinc-500">Pick a conversation from the list.</p>
      </div>
    );
  }

  const statusText =
    status === "offline"
      ? "Reconnecting…"
      : accountActive === false
      ? `${platformLabel(conversation.platform)} not linked`
      : status === "live"
      ? "Live"
      : "Connecting…";
  const statusColor =
    status === "live" && accountActive !== false
      ? "bg-green-500"
      : status === "offline" || accountActive === false
      ? "bg-red-500"
      : "bg-amber-500";

  return (
    <section className="flex h-full flex-1 flex-col bg-zinc-900">
      <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back to chats"
            className="rounded-full p-1.5 text-zinc-300 hover:bg-zinc-800 md:hidden"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <Avatar url={conversation.avatar_url} name={conversation.title} size={40} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-zinc-100">
            {conversation.title ?? conversation.external_chat_id}
          </h2>
          <p className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            {statusText}
          </p>
        </div>
        <PlatformBadge platform={conversation.platform} size={18} />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="animate-pulse space-y-3">
            <div className="h-9 w-1/2 rounded-2xl bg-zinc-800" />
            <div className="ml-auto h-9 w-2/5 rounded-2xl bg-zinc-800/60" />
            <div className="h-9 w-3/5 rounded-2xl bg-zinc-800" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-zinc-500">
            No messages yet. Send the first one below.
          </p>
        )}

        {rows.map((r) =>
          r.kind === "day" ? (
            <div key={r.key} className="my-4 flex justify-center">
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                {r.label}
              </span>
            </div>
          ) : (
            <div
              key={r.key}
              className={`flex ${r.m.is_from_me ? "justify-end" : "justify-start"} ${
                r.first ? "mt-3" : "mt-0.5"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm md:max-w-[65%] ${
                  r.m.is_from_me
                    ? "bg-slate-600 text-slate-50"
                    : "bg-zinc-800 text-zinc-100"
                } ${r.first ? (r.m.is_from_me ? "rounded-tr-md" : "rounded-tl-md") : ""}`}
              >
                {r.first && !r.m.is_from_me && r.m.sender_name && (
                  <p className="mb-0.5 text-xs font-semibold text-slate-400">
                    {r.m.sender_name}
                  </p>
                )}
                {r.m.media_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.m.media_url}
                    alt=""
                    className="mb-1 max-h-64 rounded-lg object-cover"
                  />
                )}
                {r.m.content && (
                  <p className="whitespace-pre-wrap break-words">{r.m.content}</p>
                )}
                <p
                  className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
                    r.m.is_from_me ? "text-slate-300" : "text-zinc-500"
                  }`}
                >
                  {clock(r.m.created_at)}
                  {r.m.is_from_me && <Ticks status={r.m.status} />}
                </p>
              </div>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t border-zinc-800 bg-zinc-950 p-3">
        {error && (
          <p role="alert" className="mb-2 text-xs text-red-400">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message"
            className="flex-1 resize-none rounded-xl bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-500 focus:ring-slate-500"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            aria-label="Send message"
            className="rounded-full bg-slate-600 p-2.5 text-white transition hover:bg-slate-500 disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </footer>
    </section>
  );
}

