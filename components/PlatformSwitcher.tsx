"use client";

import { Instagram, MessageCircle, MessageSquare, Send, Smartphone } from "lucide-react";
import type { Platform } from "@/lib/supabase";

const ITEMS: { id: Platform; label: string; color: string; Icon: typeof MessageSquare }[] = [
  { id: "native", label: "Native", color: "bg-violet-600", Icon: MessageSquare },
  { id: "whatsapp", label: "WhatsApp", color: "bg-green-500", Icon: MessageCircle },
  { id: "telegram", label: "Telegram", color: "bg-sky-500", Icon: Send },
  { id: "instagram", label: "Instagram", color: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600", Icon: Instagram },
  { id: "sms", label: "SMS", color: "bg-indigo-500", Icon: Smartphone },
];

export default function PlatformSwitcher({
  value,
  onChange,
}: {
  value: Platform;
  onChange: (platform: Platform) => void;
}) {
  return (
    <nav aria-label="Messaging platforms" className="flex w-full items-start gap-3 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
      {ITEMS.map(({ id, label, color, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            aria-label={`Open ${label} messages`}
            onClick={() => onChange(id)}
            className="flex min-w-[66px] shrink-0 flex-col items-center gap-1.5 text-xs"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm transition ${color} ${active ? "ring-2 ring-violet-300 ring-offset-2 ring-offset-zinc-950" : "opacity-80 hover:opacity-100"}`}>
              <Icon size={23} strokeWidth={2.2} />
            </span>
            <span className={active ? "font-semibold text-violet-300" : "text-zinc-400"}>{label}</span>
            <span className={`h-1 w-8 rounded-full ${active ? "bg-violet-400" : "bg-transparent"}`} />
          </button>
        );
      })}
    </nav>
  );
}