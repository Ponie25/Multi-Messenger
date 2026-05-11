## 2026-05-11 Round 1 (from spx-apply milestone gate — Group 1)

### spx-arch-verifier
- Fixed: Upgraded electron from ^28.0.0 to ^30.0.0 to resolve BrowserView deprecation (Electron 29+) and enable WebContentsView API
- Fixed: Downgraded electron-store from ^8.1.0 to ^7.0.0 — v8 is ESM-only and incompatible with CommonJS main process
- Fixed: Updated design.md to document WebContentsView instead of BrowserView (deprecated in Electron 29)
- Fixed: Added wait-on devDependency and dev:electron script so `npm run dev` actually launches Electron

### spx-verifier
- Fixed: Added Content-Security-Policy meta tag to index.html (default-src 'self', script-src 'self' 'unsafe-inline', style-src 'self' 'unsafe-inline', img-src 'self' data: https:)
- Fixed: dev script now includes dev:electron step using wait-on to avoid race condition

## 2026-05-11 Round 3 (from spx-apply re-verify)

### spx-verifier
- Fixed: Deleted dead preload files badge-monitor.ts and account-info.ts (all logic in webview.ts)
- Fixed: Removed unnecessary contextBridge.exposeInMainWorld from webview.ts (reduces fingerprinting surface)
- Fixed: Removed unused contextBridge import from webview.ts

### spx-verifier
- Fixed: Preload paths corrected — `../preload/` → `preload/` (relative to dist/main, not dist)
- Fixed: accounts:loaded race condition — replaced push event with pull pattern (accounts:get IPC handler); renderer calls getAccounts() on mount
- Fixed: Notification click interception added to webview.ts — wraps window.Notification to send notification:click IPC on click
- Fixed: dev:main now uses --watch flag for hot-reload during development
- Fixed: uuid dependency removed, replaced with crypto.randomUUID() (Node built-in, available in Electron 30)

### spx-arch-verifier
- Fixed: setInterval and MutationObserver in webview.ts now stored in module-level variables with cleanup via beforeunload listener
- Fixed: viewManager null guards added to all IPC handlers (no more non-null assertions)
- Fixed: account:reorder validates input is string[] before calling store.reorder()
- Fixed: shell.ts removed onAccountsLoaded (replaced by pull pattern)

### spx-uiux-verifier
- Fixed: AccountAvatar broken image fallback — added imgError state, shows initials when image fails to load
- Fixed: aria-pressed replaced with aria-current on AccountAvatar (correct ARIA pattern for selection)
- Fixed: ContextMenu focus trap — auto-focuses first item on open, arrow key navigation between items, tabIndex=-1 on container
- Fixed: ContextMenu emoji wrapped in aria-hidden span for screen reader safety
- Fixed: Drag handle separated from click target in SortableAccountItem — listeners on dedicated grip element, not avatar wrapper
- Fixed: Stale badge entry cleaned up in App.tsx handleRemoveAccount

### spx-test-verifier
- Fixed: Added permissions.test.ts — 4 tests covering grant/deny/non-notification/partition-targeting
- Fixed: Reorder "persists new order" test was false positive — rewrote to verify acc2 (originally order:1) gets order:0 after reorder
- Fixed: Added "ignores unknown ids in reorder input" test
- Fixed: Added persistence simulation test (shared mock state between AccountStore instances)
- Fixed: Added "active account fallback" test — verifies remaining accounts accessible after removing first
- Fixed: electron-store mock updated to use shared state (simulates file persistence across instances)
