# Dropchat V2 — Implementation Status

Updated: 6 November 2026  
Working branch: `v2-native-messenger-foundation`

## Product definition

Dropchat is both:
- a first-party messenger (Native Messages); and
- a client shell for separate external messaging environments.

Native Messages is not the cross-platform aggregate inbox. It must show only conversations whose platform is `native`.

## Implemented in this branch

- Added a reusable, horizontally scrollable platform switcher.
- Added platform entries for Native, WhatsApp, Telegram, Instagram and SMS.
- Set Native as the initial selected platform.
- Lifted platform selection into the application shell so switching platform clears the currently open conversation and returns to the selected platform's list.
- Filtered the conversation query by exactly one selected platform; removed the old All-platform list from the sidebar.
- Added the platform selector to the conversation view.
- Added SMS to the TypeScript platform type and badge map.
- Updated product title and sign-in copy to identify Dropchat as its own messenger.
- Changed WhatsApp account pairing to send the Supabase access token in an Authorization bearer header instead of trusting a client-supplied user ID.
- Native conversations no longer require a row in `connected_accounts` to show as connected.

## Existing code reused

- Supabase Auth browser client.
- Conversation and message tables.
- Realtime conversation and message subscriptions.
- Existing bridge endpoint for message sending.
- Existing WhatsApp pairing flow.

## Not yet implemented / not verified

- Native media upload pipeline and attachment access policies.
- Native group administration (group creation is supported by the initial RPC, but member management is not).
- Native delivery/read receipts, presence and typing indicators.
- Native server-side rate limiting and abuse controls.
- Native delivery/read receipts, presence and typing indicators.
- Native media upload pipeline and attachment access policies.
- Telegram TDLib integration.
- Instagram Direct integration.
- SMS device integration and Android permission/role handling.
- WhatsApp/Instagram isolated WebView containers.
- Platform-specific push notifications.
- Durable event queue, retry policy, deduplication and synchronization cursors.
- Offline outgoing-message queue and full local database.
- Desktop Tauri shell and Android native shell.
- Automated build, typecheck and end-to-end verification for this branch.

The current UI and data filtering do not, by themselves, prove that these integrations or native messaging features work.

## Next implementation sequence

### Phase 1A — Native data model (foundation applied)
- Added `profiles`, `native_conversations`, `native_conversation_participants` and `native_messages`.
- Enabled RLS on all four tables.
- Added participant-aware reads and writes, a private membership-check helper, and a constrained conversation-creation RPC.
- Revoked public/anonymous execution of the automatic RLS event-trigger function.
- Added the missing composite index for the existing external-message foreign key.
- Added message activity triggers for chat previews and per-user read-state updates.
- Enabled Realtime publication for `native_messages`.
- Kept the public conversation-creation RPC as `SECURITY INVOKER`; privileged implementation is isolated in the non-exposed `private` schema.
- Versioned the SQL in `supabase/migrations/`.
- Remaining verification: two-user isolation tests and an end-to-end native conversation test.

### Phase 1B — Native messaging (UI foundation added; test pending)
- Added `/native` first-party messenger route.
- Added profile setup with username and display name.
- Added user lookup and direct/group conversation creation through the RPC.
- Added participant-scoped message history, realtime updates and native message inserts.
- Added a link from the main inbox to Dropchat Messenger.
- Remaining: verify with two accounts, handle duplicate direct chats, add server-side rate limits and test realtime access denial.

### Phase 1C — Mobile inbox polish
- Match the supplied mobile reference more closely.
- Add bottom navigation, empty/loading/error states and accessible controls.
- Verify responsive behavior on narrow Android screens.

### Phase 2 — External adapters
- Implement Telegram only after TDLib authentication/session and lifecycle design is validated.
- Keep WhatsApp and Instagram WebView sessions isolated; do not claim that isolation eliminates platform enforcement risk.
- Keep SMS behind Android permission and distribution-policy checks.

## Verification checklist

- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Sign in / sign out
- [ ] Native inbox displays only `platform = 'native'`
- [ ] Switching platforms clears the selected chat
- [ ] RLS denies cross-user conversation and message access
- [ ] Pairing request includes a verified bearer token
- [ ] Bridge verifies the token and conversation/account ownership
- [ ] Two test users exchange a native message in realtime

> Build note (6 Nov 2026): the NativeMessenger UI currently has a temporary `@ts-nocheck` while Supabase generated database types and the PostgREST relationship typings are finalized. Earlier preview builds failed during `npm run build`; the latest preview build is queued and must be confirmed before merge or production promotion.
