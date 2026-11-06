"use client";

// TODO: replace with generated Supabase Database types after the preview integration tests pass.
// @ts-nocheck

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, Plus, Search, Send, UserRound } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

// TODO: replace inferred Supabase query types with generated Database types after initial integration verification.

type Profile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
type NativeMessage = { id: string; conversation_id: string; sender_id: string; content: string; created_at: string };
type NativeChat = { id: string; title: string | null; updated_at: string; members: Profile[]; lastMessage?: NativeMessage };

export default function NativeMessenger() {
  const supabase = useMemo(() => getSupabase(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [profileError, setProfileError] = useState("");
  const [chats, setChats] = useState<NativeChat[]>([]);
  const [active, setActive] = useState<NativeChat | null>(null);
  const [messages, setMessages] = useState<NativeMessage[]>([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Profile[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadChats = useCallback(async (uid: string) => {
    const { data: memberships, error: membershipError } = await supabase
      .from("native_conversation_participants").select("conversation_id").eq("user_id", uid);
    if (membershipError) { setError(membershipError.message); return; }
    const ids = (memberships ?? []).map((m) => m.conversation_id);
    if (!ids.length) { setChats([]); return; }
    const [{ data: conversations, error: chatsError }, { data: participantRows }] = await Promise.all([
      supabase.from("native_conversations").select("id,title,updated_at").in("id", ids).order("updated_at", { ascending: false }),
      supabase.from("native_conversation_participants").select("conversation_id,user_id,profiles(id,username,display_name,avatar_url)").in("conversation_id", ids),
    ]);
    if (chatsError) { setError(chatsError.message); return; }
    const { data: latest } = await supabase.from("native_messages").select("*").in("conversation_id", ids).order("created_at", { ascending: false }).limit(300);
    const next = (conversations ?? []).map((c) => ({
      ...c,
      members: (participantRows ?? []).filter((p) => p.conversation_id === c.id).map((p) => p.profiles).filter(Boolean) as Profile[],
      lastMessage: (latest ?? []).find((m) => m.conversation_id === c.id) as NativeMessage | undefined,
    })) as NativeChat[];
    setChats(next);
    setActive((current) => current ? next.find((c) => c.id === current.id) ?? current : null);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error: messageError } = await supabase.from("native_messages").select("*")
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(300);
    if (messageError) setError(messageError.message);
    else setMessages((data ?? []) as NativeMessage[]);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { setLoading(false); setError("Sign in to use Dropchat Messenger."); return; }
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!alive) return;
      if (data) setProfile(data as Profile);
      await loadChats(user.id);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [loadChats]);

  useEffect(() => {
    if (!active) { setMessages([]); return; }
    loadMessages(active.id);
    if (userId) {
      supabase.from("native_conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", active.id)
        .eq("user_id", userId)
        .then(() => {});
    }
    const channel = supabase.channel("native-messages-" + active.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "native_messages", filter: "conversation_id=eq." + active.id },
        () => loadMessages(active.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active?.id, loadMessages]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("native-chat-list-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "native_messages" },
        () => loadChats(userId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, loadChats]);

  useEffect(() => {
    let alive = true;
    const term = query.trim();
    if (!term || !userId) { setPeople([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id,username,display_name,avatar_url")
        .neq("id", userId).or("username.ilike.%" + term + "%,display_name.ilike.%" + term + "%").limit(12);
      if (alive) setPeople((data ?? []) as Profile[]);
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, userId]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setBusy(true); setProfileError("");
    const { data, error: saveError } = await supabase.from("profiles").upsert({
      id: userId, display_name: displayName.trim(), username: username.trim().replace(/^@/, ""),
    }).select().single();
    if (saveError) setProfileError(saveError.message);
    else setProfile(data as Profile);
    setBusy(false);
  }

  async function startChat(person: Profile) {
    setBusy(true); setError("");
    const { data, error: createError } = await supabase.rpc("create_native_conversation", { p_member_ids: [person.id], p_title: null });
    if (createError) setError(createError.message);
    else {
      await loadChats(userId!);
      const { data: chat } = await supabase.from("native_conversations").select("id,title,updated_at").eq("id", data).single();
      if (chat) {
        const item: NativeChat = { ...chat, members: [profile!, person] };
        setChats((prev) => [item, ...prev.filter((c) => c.id !== item.id)]);
        setActive(item);
      }
      setShowNew(false); setQuery(""); setPeople([]);
    }
    setBusy(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !active || !userId || busy) return;
    setBusy(true); setError("");
    const { error: sendError } = await supabase.from("native_messages").insert({
      conversation_id: active.id, sender_id: userId, content,
    });
    if (sendError) setError(sendError.message);
    else { setText(""); await loadMessages(active.id); await loadChats(userId); }
    setBusy(false);
  }

  const titleFor = (chat: NativeChat) => chat.title || chat.members.filter((m) => m.id !== userId).map((m) => m.display_name || (m.username ? "@" + m.username : "Dropchat user")).join(", ") || "Conversation";
  const activeTitle = active ? titleFor(active) : "";
  const initials = (name: string) => name.trim().slice(0, 1).toUpperCase() || "D";

  if (loading) return <div className="grid h-dvh place-items-center bg-zinc-950 text-zinc-400">Loading Dropchat Messenger…</div>;

  if (!profile) return (
    <main className="grid min-h-dvh place-items-center bg-zinc-950 p-4 text-zinc-100">
      <form onSubmit={saveProfile} className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <MessageCircle size={28} className="text-sky-400" />
        <h1 className="text-xl font-semibold">Create your Dropchat profile</h1>
        <p className="text-sm text-zinc-400">Choose a username so other people can find you on Dropchat.</p>
        <input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="w-full rounded-lg bg-zinc-950 p-3 text-sm outline-none ring-1 ring-zinc-700 focus:ring-sky-500" />
        <input required maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="w-full rounded-lg bg-zinc-950 p-3 text-sm outline-none ring-1 ring-zinc-700 focus:ring-sky-500" />
        {profileError && <p className="text-sm text-red-400">{profileError}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-sky-600 p-3 text-sm font-semibold disabled:opacity-50">{busy ? "Saving…" : "Create profile"}</button>
      </form>
    </main>
  );

  return (
    <main className="flex h-dvh bg-zinc-950 text-zinc-100">
      <aside className={(active ? "hidden md:flex" : "flex") + " w-full flex-col border-r border-zinc-800 md:w-96"}>
        <header className="flex items-center justify-between border-b border-zinc-800 p-4">
          <a href="/" className="text-xs text-zinc-400 hover:text-white">← Unified Inbox</a>
          <h1 className="font-semibold">Dropchat</h1>
          <button onClick={() => setShowNew(true)} aria-label="New chat" className="rounded-full bg-sky-600 p-2"><Plus size={18}/></button>
        </header>
        <div className="border-b border-zinc-800 px-4 py-3 text-sm text-zinc-400">Signed in as <span className="text-zinc-200">{profile.display_name || profile.username}</span></div>
        {showNew && <div className="space-y-3 border-b border-zinc-800 p-4">
          <div className="flex items-center gap-2"><Search size={16}/><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find people by name or username" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></div>
          {people.map((person) => <button key={person.id} disabled={busy} onClick={() => startChat(person)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-900"><span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-800">{initials(person.display_name || person.username || "D")}</span><span className="min-w-0"><span className="block text-sm">{person.display_name || person.username}</span><span className="text-xs text-zinc-500">@{person.username}</span></span></button>)}
          {query && people.length === 0 && <p className="text-xs text-zinc-500">No matching users found.</p>}
        </div>}
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => <button key={chat.id} onClick={() => setActive(chat)} className={"flex w-full items-center gap-3 border-b border-zinc-900 p-4 text-left hover:bg-zinc-900 " + (active?.id === chat.id ? "bg-zinc-900" : "")}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-950 text-sky-300">{initials(titleFor(chat))}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{titleFor(chat)}</span><span className="block truncate text-xs text-zinc-500">{chat.lastMessage?.content || "Start a conversation"}</span></span>
          </button>)}
          {chats.length === 0 && <p className="p-8 text-center text-sm text-zinc-500">No Dropchat conversations yet. Start a new chat.</p>}
        </div>
      </aside>
      <section className={(active ? "flex" : "hidden md:flex") + " min-w-0 flex-1 flex-col"}>
        {active ? <>
          <header className="flex items-center gap-3 border-b border-zinc-800 p-4"><button onClick={() => setActive(null)} className="md:hidden" aria-label="Back"><ArrowLeft size={20}/></button><span className="grid h-9 w-9 place-items-center rounded-full bg-sky-950 text-sky-300">{initials(activeTitle)}</span><div><h2 className="text-sm font-semibold">{activeTitle}</h2><p className="text-xs text-zinc-500">Dropchat Messenger</p></div></header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => <div key={m.id} className={"flex " + (m.sender_id === userId ? "justify-end" : "justify-start")}><div className={"max-w-[80%] rounded-2xl px-3 py-2 text-sm " + (m.sender_id === userId ? "bg-sky-700" : "bg-zinc-800")}><p className="whitespace-pre-wrap break-words">{m.content}</p><time className="mt-1 block text-right text-[10px] text-zinc-300">{new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time></div></div>)}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-zinc-800 p-3"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message on Dropchat…" className="min-w-0 flex-1 rounded-xl bg-zinc-900 px-4 py-3 text-sm outline-none ring-1 ring-zinc-800 focus:ring-sky-500"/><button disabled={!text.trim() || busy} aria-label="Send" className="rounded-xl bg-sky-600 px-4 disabled:opacity-50"><Send size={18}/></button></form>
        </> : <div className="hidden flex-1 flex-col items-center justify-center gap-2 text-zinc-500 md:flex"><UserRound size={36}/><p className="text-sm">Select a conversation or start a new one.</p></div>}
        {error && <p role="alert" className="border-t border-red-900 bg-red-950/40 px-4 py-2 text-xs text-red-300">{error}</p>}
      </section>
    </main>
  );
}
