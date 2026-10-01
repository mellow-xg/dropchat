import { Instagram, MessageCircle, MessageSquare, Send } from "lucide-react";
import type { Platform } from "@/lib/supabase";

const STYLES: Record<Platform, { bg: string; label: string; Icon: typeof Send }> = {
  whatsapp: { bg: "bg-green-500", label: "WhatsApp", Icon: MessageCircle },
  telegram: { bg: "bg-sky-500", label: "Telegram", Icon: Send },
  instagram: {
    bg: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600",
    label: "Instagram",
    Icon: Instagram,
  },
  native: { bg: "bg-purple-500", label: "Native", Icon: MessageSquare },
};

export function platformLabel(p: Platform) {
  return STYLES[p].label;
}

export default function PlatformBadge({
  platform,
  size = 16,
}: {
  platform: Platform;
  size?: number;
}) {
  const { bg, Icon, label } = STYLES[platform];
  return (
    <span
      title={label}
      className={`inline-flex items-center justify-center rounded-full text-white ${bg}`}
      style={{ width: size + 8, height: size + 8 }}
    >
      <Icon size={size - 4} strokeWidth={2.5} />
    </span>
  );
}
