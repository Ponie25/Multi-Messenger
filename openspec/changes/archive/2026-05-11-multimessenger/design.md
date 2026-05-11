## Context

New Electron desktop application for managing multiple Facebook Messenger accounts simultaneously. Each account needs a fully isolated browser session (cookies, localStorage, cache) so accounts never interfere with each other. The app shell is built with React + Tailwind CSS. Target platforms: macOS and Windows.

## Goals / Non-Goals

**Goals:**
- Run multiple Facebook Messenger sessions in parallel, each fully isolated
- Switch between accounts instantly via sidebar (no reload, no re-login)
- Display unread message badge per account in sidebar
- Deliver native OS notifications from all accounts simultaneously
- Per-account notification toggle (enable/disable)
- Auto-detect account name and avatar from DOM after login
- Persist account list and preferences across app restarts

**Non-Goals:**
- Linux support (out of scope for v1)
- Facebook features beyond Messenger (News Feed, Groups, etc.)
- Custom notification content (rely on Facebook's own Web Notifications API)
- Syncing data to any remote server
- Automated login / credential storage

## Decisions

### 1. Electron over Tauri or NW.js

Electron provides `session.fromPartition(partitionName)` — a first-class API for creating isolated cookie/cache stores per webview. This is the core primitive the entire multi-account feature depends on. Tauri's webview isolation is less mature and requires Rust for backend logic. Electron's large ecosystem and TypeScript support make it the clear choice.

### 2. `session.fromPartition()` for session isolation

Each account gets a persistent partition named `persist:account-<uuid>`. Using `persist:` prefix means the session survives app restarts. Each `BrowserView` (not `<webview>` tag) is assigned its own partition.

```
Account 1 → session.fromPartition('persist:account-abc123')
Account 2 → session.fromPartition('persist:account-def456')
```

Alternative considered: `<webview>` tag with `partition` attribute — rejected because `WebContentsView` gives better programmatic control (bounds, visibility, lifecycle).

### 3. WebContentsView over BrowserView (updated)

`BrowserView` was deprecated in Electron 29 and replaced by `WebContentsView`. This project uses Electron 30+ and therefore uses `WebContentsView` throughout. `WebContentsView` is attached to the main `BrowserWindow` via `win.contentView.addChildView()` and rendered natively. It provides the same precise control over position/size as `BrowserView` and is the current recommended approach for production Electron apps.

### 4. All BrowserViews loaded at startup (eager loading)

All account BrowserViews are created when the app starts. Switching accounts just changes which BrowserView is visible (setBounds + show/hide). This ensures:
- Web Notifications API fires for all accounts at all times
- No reload delay when switching accounts

Trade-off: Higher RAM usage (~200-300MB per account). Acceptable for a desktop app with typically 2-5 accounts.

### 5. Web Notifications API for notifications

Facebook's web app already uses the browser's Notifications API. In Electron, we grant notification permission automatically per partition:

```ts
session.fromPartition(partition).setPermissionRequestHandler(
  (webContents, permission, callback) => {
    callback(permission === 'notifications')
  }
)
```

No custom notification logic needed. Facebook handles notification content, timing, and grouping.

### 6. DOM injection for unread count and account info

After a BrowserView navigates to `facebook.com/messages` and the user is logged in, inject a content script that:
- Reads the account name and avatar URL from the DOM (profile menu area)
- Observes the document title for changes (format: `"(N) Messenger"`)
- Sends unread count updates to main process via `ipcRenderer`

This is fragile (Facebook DOM changes can break it) but is the only viable approach without a private API. The unread badge is a nice-to-have — if injection breaks, the app still works fully.

### 7. Electron Store for persistence

Account metadata (id, name, avatarUrl, notificationsEnabled, order) stored in a JSON file via `electron-store`. Simple, no database overhead, sufficient for 2-10 accounts.

### 8. React + Tailwind for app shell UI

The sidebar and settings UI are built with React (rendered in the main BrowserWindow). The BrowserViews are positioned to fill the remaining space to the right of the sidebar. React state manages which account is active and sidebar badge counts (updated via IPC from BrowserViews).

## Risks / Trade-offs

- **Facebook DOM changes break badge/avatar injection** → Mitigation: Treat injection as best-effort. App works without it. Add error boundary around injection logic.
- **High RAM usage with many accounts** → Mitigation: Document recommended max accounts (5). Future: add suspend/resume for inactive accounts.
- **Facebook may detect Electron's user agent and degrade experience** → Mitigation: Set user agent to match Chrome on the respective OS.
- **Web Notifications require user to grant permission on first login** → Mitigation: Auto-approve in `setPermissionRequestHandler`. User sees Facebook's own notification prompt inside the webview.
- **BrowserView positioning is manual (pixel math)** → Mitigation: Listen to window resize events and recalculate BrowserView bounds.
