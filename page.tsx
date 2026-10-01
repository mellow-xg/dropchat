"use client";

import { useState } from "react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import LinkAccountModal from "@/components/LinkAccountModal";
import type { Conversation } from "@/lib/supabase";

export default function Home() {
  const [active, setActive] = useState<Conversation | null>(null);
  const [modal, setModal] = useState(false);

  return (
    <AuthGate>
      <main className="flex h-dvh bg-zinc-950 text-zinc-100">
        {/* mobile: list OR chat; desktop: both */}
        <div className={`${active ? "hidden md:flex" : "flex"} h-full w-full md:w-auto`}>
          <Sidebar
            activeId={active?.id ?? null}
            onSelect={setActive}
            onOpenLinkModal={() => setModal(true)}
          />
        </div>
        <div className={`${active ? "flex" : "hidden md:flex"} h-full flex-1`}>
          <ChatWindow conversation={active} onBack={() => setActive(null)} />
        </div>
        <LinkAccountModal open={modal} onClose={() => setModal(false)} />
      </main>
    </AuthGate>
  );
}
