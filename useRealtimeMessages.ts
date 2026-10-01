"use client";

import { useEffect, useState } from "react";
import { supabase, type Message } from "@/lib/supabase";

export type RealtimeStatus = "connecting" | "live" | "offline";

export function useRealtimeMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setStatus("connecting");

    // 1. load history
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (cancelled) return;
        setMessages((prev) => {
          const ids = new Set((data ?? []).map((m) => m.id));
          return [...(data ?? []), ...prev.filter((m) => !ids.has(m.id))];
        });
        setLoading(false);
      });

    // 2. subscribe to new rows for this chat only
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );
        }
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED")
          setStatus("offline");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, status };
}
