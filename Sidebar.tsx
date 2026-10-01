"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Plus, Search } from "lucide-react";
import { supabase, type Conversation, type Platform } from "@/lib/supabase";
import PlatformBadge from "./PlatformBadge";
import Avatar from "./Avatar";

const PAGE_SIZE = 30;
type Filter = "all" | Platform;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telegram", label: "Telegram" },
  { id: "instagram", label: "Instagram" },
  { id: "native", label: "Native" },
];

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diffDays = (now.getTime() - d.getTime()) / 86_400_000;
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function SkeletonRows() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-11 w-11 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded bg-zinc-800" />
            <div className="h-3 w-3/4 rounded bg-zinc-900" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  activeId: string | null;
  onSelect: (c: Conversation) => void;
  onOpenLinkModal: () => void;
}

export default function Sidebar({ activeId, onSelect, onOpenLinkModal }: Props) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userLabel, setUserLabel] = useState("You");
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) setUserLabel(u.user_metadata?.full_name ?? u.email ?? "You");
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async (pageToLoad: number, term: string, f: Filter) => {
    setLoading(true);
    let q = supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .range(pageToLoad * PAGE_SIZE, pageToLoad * PAGE_SIZE + PAGE_SIZE - 1);
    if (term) q = q.ilike("title", `%${term}%`);
    if (f !== "all") q = q.eq("platform", f);
    const { data } = await q;
    const rows = (data ?? []) as Conversation[];
    setItems((prev) => (pageToLoad === 0 ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  }, []);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    load(0, search, filter);
  }, [search, filter, load]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const next = page + 1;
          setPage(next);
          load(next, search, filter);
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, page, search, filter, load]);

  useEffect(() => {
    const channel = supabase
      .channel("conversations-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          const row = payload.new as Conversation;
          if (!row?.id) return;
          if (filter !== "all" && row.platform !== filter) return;
          setItems((prev) =>
            [row, ...prev.filter((c) => c.id !== row.id)].sort(
              (a, b) =>
                new Date(b.last_message_at ?? 0).getTime() -
                new Date(a.last_message_at ?? 0).getTime()
            )
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  function open(c: Conversation) {
    onSelect(c);
    if ((c.unread_count ?? 0) > 0) {
      setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread_count: 0 } : x)));
      supabase.from("conversations").update({ unread_count: 0 }).eq("id", c.id).then(() => {});
    }
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-zinc-800 bg-zinc-950 md:w-96">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={userLabel} size={36} />
          <span className="truncate text-sm font-semibold text-zinc-100">{userLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => supabase.auth.signOut()}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
          >
            <LogOut size={18} />
          </button>
          <button
            onClick={onOpenLinkModal}
            aria-label="Link accounts"
            title="Link accounts"
            className="rounded-full bg-slate-700 p-2 text-zinc-100 transition hover:bg-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full rounded-lg bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-500 focus:ring-slate-500"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f.id
                ? "bg-slate-600 text-white"
                : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 && <SkeletonRows />}

        {items.length === 0 && !loading && (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">
            {search || filter !== "all"
              ? "No chats match. Try another search or filter."
              : "No chats yet. Tap + to link your first account."}
          </p>
        )}

        {items.map((c) => {
          const active = c.id === activeId;
          const unread = c.unread_count ?? 0;
          return (
            <button
              key={c.id}
              onClick={() => open(c)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                active ? "bg-slate-800/70" : "hover:bg-zinc-900"
              }`}
            >
              <div className="relative shrink-0">
                <Avatar url={c.avatar_url} name={c.title} />
                <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-zinc-950">
                  <PlatformBadge platform={c.platform} size={14} />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate text-sm text-zinc-100 ${
                      unread ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {c.title ?? c.external_chat_id}
                  </span>
                  <span
                    className={`shrink-0 text-xs ${unread ? "text-slate-300" : "text-zinc-500"}`}
                  >
                    {formatTime(c.last_message_at)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-sm ${unread ? "text-zinc-200" : "text-zinc-400"}`}
                  >
                    {c.last_message ?? "No messages yet"}
                  </span>
                  {unread > 0 && (
                    <span className="shrink-0 rounded-full bg-slate-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        <div ref={sentinel} className="h-8" />
      </div>
    </aside>
  );
}
