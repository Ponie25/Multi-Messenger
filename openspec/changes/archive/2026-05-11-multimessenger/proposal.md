## Why

Managing multiple Facebook Messenger accounts requires repeatedly logging out and back in, which is slow and disruptive. A dedicated desktop app with isolated sessions per account eliminates this friction and enables seamless multi-account messaging.

## What Changes

- New Electron desktop application built from scratch
- Sidebar for switching between multiple Facebook accounts instantly
- Each account runs in an isolated webview with its own cookie/session store
- Unread badge counts displayed per account in the sidebar
- Native OS notifications from all accounts simultaneously (per-account toggle)
- Account name and avatar auto-detected via DOM injection after login

## Capabilities

### New Capabilities

- `account-management`: Add, remove, and persist multiple Facebook accounts with isolated sessions
- `webview-shell`: Electron app shell with React/Tailwind sidebar and multi-webview layout
- `notifications`: Native OS notifications from all account webviews with per-account enable/disable
- `unread-badges`: Inject JS into webviews to read unread counts and display badges in sidebar

### Modified Capabilities

## Impact

- New project — no existing code affected
- Dependencies: Electron, React, Tailwind CSS, Electron Store, TypeScript
- Targets macOS and Windows
- Requires Electron's `session.fromPartition()` for session isolation
- Web Notifications API used for native notifications (no custom notification logic needed)
