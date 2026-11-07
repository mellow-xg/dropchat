"use client";

import { useState } from "react";
import AuthGate from "@/components/AuthGate";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import LinkAccountModal from "@/components/LinkAccountModal";
import type { Conversation, Platform } from "@/lib/supabase";

export default function Home() {
  const [active, setActive] = useState<Conversation | null>(null);
  const [platform, setPlatform] = useState<Platform>("native");
  const [modal, setModal] = useState(false);

  function changePlatform(next: Platform) {
    setPlatform(next);
    setActive(null);
  }

  function selectConversation(conversation: Conversation) {
    setPlatform(conversation.platform);
    setActive(conversation);
  }

  return (
    <AuthGate>
      <main className="flex h-dvh bg-zinc-950 text-zinc-100">
        <div className={`${active ? "hidden md:flex" : "flex"} h-full w-full md:w-auto`}>
          <Sidebar
            activeId={active?.id ?? null}
            onSelect={selectConversation}
            onOpenLinkModal={() => setModal(true)}
            selectedPlatform={platform}
            onPlatformChange={changePlatform}
          />
        </div>
        <div className={`${active ? "flex" : "hidden md:flex"} h-full flex-1`}>
          <ChatWindow conversation={active} onBack={() => setActive(null)} onPlatformChange={changePlatform} />
        </div>
        <LinkAccountModal open={modal} onClose={() => setModal(false)} />
      </main>
    </AuthGate>
  );
}

