# Phase 10 — Mobile Counsellor streaming

Expo / desktop shell stream Counsellor replies the same way the website does.

## Delivered

- `/api/mobile/assistant/stream` — SSE, Bearer Clerk auth, shared `handleAssistantStreamRequest`
- Web `/api/assistant/stream` refactored onto the same helper
- Mobile `streamAssistantReply` client (progressive on phones; desktop shell may buffer then parse)
- Assistant screen: live status labels, token deltas into the assistant bubble, **Stop** button
- Falls back to JSON `/api/mobile/assistant` if the stream route is missing on an older deploy

## Notes

- Keep `/api/mobile/assistant` for older app builds.
- Desktop Electron bridge still returns a full body; events apply after the response completes until the bridge learns true streaming.
