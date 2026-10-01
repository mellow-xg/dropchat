import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "");

export type Platform = "whatsapp" | "telegram" | "instagram" | "native";

export interface Conversation {
  id: string;
  user_id: string;
  platform: Platform;
  external_chat_id: string;
  title: string | null;
  avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count?: number; // add this column (see NOTES.md)
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  platform: Platform;
  external_msg_id: string | null;
  sender_name: string | null;
  sender_id: string | null;
  is_from_me: boolean;
  content: string | null;
  media_url: string | null;
  status: "sent" | "delivered" | "read" | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

