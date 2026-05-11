## 1. Project Setup

- [x] 1.1 Initialize Electron + TypeScript project with `npm init` and install core dependencies: `electron`, `typescript`, `electron-builder`
- [x] 1.2 Install UI dependencies: `react`, `react-dom`, `@types/react`, `tailwindcss`, `postcss`, `autoprefixer`
- [x] 1.3 Install `electron-store` for account persistence
- [x] 1.4 Configure TypeScript (`tsconfig.json`) with separate configs for main process and renderer
- [x] 1.5 Configure Tailwind CSS (`tailwind.config.js`, `postcss.config.js`)
- [x] 1.6 Set up Webpack or Vite bundler for renderer process (React + Tailwind)
- [x] 1.7 Configure `electron-builder` in `package.json` for macOS and Windows targets
- [x] 1.8 Add npm scripts: `dev`, `build`, `package`

## 2. Main Process — App Shell

- [x] 2.1 Create `src/main/index.ts` — entry point, creates BrowserWindow (800×600 min size, no frame optional)
- [x] 2.2 Set BrowserWindow to load the React renderer (`index.html`)
- [x] 2.3 Implement window resize listener that recalculates and updates active BrowserView bounds (sidebar=72px, rest=content area)
- [x] 2.4 Register IPC handlers for renderer ↔ main communication (account CRUD, switch account, badge update) ← (verify: all IPC channels defined in design are registered and respond correctly)

## 3. Account Store

- [x] 3.1 Create `src/main/store.ts` — define `Account` type: `{ id, name, avatarUrl, notificationsEnabled, order }`
- [x] 3.2 Implement `AccountStore` class using `electron-store`: `getAll()`, `add()`, `update()`, `remove()`, `reorder()`
- [x] 3.3 Write unit tests for `AccountStore` CRUD operations ← (verify: all scenarios in account-management spec are covered)

## 4. BrowserView Manager

- [x] 4.1 Create `src/main/view-manager.ts` — manages lifecycle of all BrowserViews
- [x] 4.2 Implement `createView(account)` — creates BrowserView with `session.fromPartition('persist:account-<id>')`, sets Chrome user agent, navigates to `https://www.facebook.com/messages`
- [x] 4.3 Implement `showView(accountId)` — hides current view, sets bounds and shows selected view
- [x] 4.4 Implement `destroyView(accountId)` — removes BrowserView and clears session partition data
- [x] 4.5 On app start, create BrowserViews for all persisted accounts and show the first one ← (verify: session isolation confirmed — logging into account 1 does not affect account 2's session)

## 5. Notification Permission

- [x] 5.1 Create `src/main/permissions.ts` — `setNotificationPermission(partition, enabled)` sets `setPermissionRequestHandler` on the session
- [x] 5.2 On BrowserView creation, call `setNotificationPermission` based on account's `notificationsEnabled` value
- [x] 5.3 When user toggles notification setting, call `setNotificationPermission` to update the handler live ← (verify: notifications fire from a background (hidden) BrowserView)

## 6. DOM Injection Scripts

- [x] 6.1 Create `src/preload/badge-monitor.ts` — monitors `document.title` for `"(N) Messenger"` pattern, sends `ipc:badge-update` with `{ accountId, count }` on change
- [x] 6.2 Create `src/preload/account-info.ts` — on `did-finish-load`, reads display name and avatar URL from Facebook DOM, sends `ipc:account-info` with `{ accountId, name, avatarUrl }`
- [x] 6.3 Register preload scripts on each BrowserView's webContents ← (verify: badge count updates in sidebar when unread messages exist; account name/avatar appear after login)

## 7. React Renderer — Sidebar UI

- [x] 7.1 Create `src/renderer/App.tsx` — root component, listens for IPC events (badge updates, account info updates), manages active account state
- [x] 7.2 Create `src/renderer/components/Sidebar.tsx` — 72px wide sidebar with account list and "Add account" button at bottom
- [x] 7.3 Create `src/renderer/components/AccountAvatar.tsx` — circular avatar (or initials fallback), red badge overlay for unread count, mute icon overlay when notifications disabled
- [x] 7.4 Implement drag-and-drop reordering in Sidebar using `@dnd-kit/core` or `react-beautiful-dnd`
- [x] 7.5 Implement right-click context menu on account avatar: "Remove account", "Enable/Disable notifications"
- [x] 7.6 Style with Tailwind: dark sidebar background, active account highlight, smooth transitions ← (verify: sidebar renders all account states — placeholder, loaded avatar, badge, mute icon, active highlight)

## 8. IPC Wiring — Renderer to Main

- [x] 8.1 Wire "Add account" button → IPC → `view-manager.createView()` → new account added to store and sidebar
- [x] 8.2 Wire account click → IPC → `view-manager.showView(accountId)`
- [x] 8.3 Wire "Remove account" context menu → IPC → confirmation dialog → `view-manager.destroyView()` + store removal
- [x] 8.4 Wire notification toggle → IPC → `permissions.setNotificationPermission()` + store update
- [x] 8.5 Wire drag-and-drop reorder → IPC → `store.reorder()` ← (verify: all user flows from specs work end-to-end — add, switch, remove, toggle notifications, reorder)

## 9. Build & Package

- [x] 9.1 Verify `npm run dev` launches the app correctly on macOS
- [x] 9.2 Configure `electron-builder` for macOS `.dmg` and Windows `.exe` (NSIS) output
- [ ] 9.3 Run `npm run package` and verify installable artifacts are produced for both platforms ← (verify: packaged app launches, multi-account flow works, notifications fire on both platforms)
