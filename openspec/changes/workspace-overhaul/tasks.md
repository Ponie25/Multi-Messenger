## 1. Data Model & Types

- [x] 1.1 Define `SplitNode` type (leaf | branch with direction, ratio, children) in `src/shared/types.ts`
- [x] 1.2 Define `NotificationItem` interface (id, profileId, paneId, title, body, icon, timestamp, read)
- [x] 1.3 Update `Profile` interface: replace `panes: Pane[]` with `splitTree: SplitNode` and keep `panes: Pane[]` as flat lookup
- [x] 1.4 Update `src/shared/constants.ts`: MAX_PANES=4, TOOLBAR_HEIGHT=36, remove right sidebar constants
- [x] 1.5 Create split tree utility functions: `splitLeaf`, `removeLeaf`, `swapLeaves`, `findLeaf`, `countLeaves`, `getAllLeafPaneIds`, `calculateBounds` ← (verify: all tree operations handle edge cases — single leaf, max depth, invalid paneId)

## 2. Store Migration

- [x] 2.1 Update `ProfileStore` schema: add `splitTree` field to Profile
- [x] 2.2 Implement migration in `ProfileStore.migrate()`: convert flat `panes[]` to split tree (1 pane→leaf, 2→horizontal branch, 3→nested)
- [x] 2.3 Update `addPane` to accept split direction and target paneId, use `splitLeaf` utility
- [x] 2.4 Update `removePane` to use `removeLeaf` utility and collapse parent branch
- [x] 2.5 Add `updateSplitRatio` method to store
- [x] 2.6 Add `swapPanes` method to store ← (verify: store correctly persists tree structure, migration handles all existing data shapes)

## 3. Frameless Window & Toolbar

- [x] 3.1 Update `BrowserWindow` config: `frame: false` on Windows, `titleBarStyle: 'hiddenInset'` on macOS
- [x] 3.2 Add IPC handlers for window controls: minimize, maximize, close, isMaximized
- [x] 3.3 Create `Toolbar` component (36px, `-webkit-app-region: drag`, profile name, window controls)
- [x] 3.4 Create `WindowControls` component (minimize, maximize/restore, close buttons) — Windows only
- [x] 3.5 Create `DynamicIsland` component (pill shape, expand/collapse animation, notification preview)
- [x] 3.6 Implement dynamic island state machine: idle → showing → hovering → dismissing → idle
- [x] 3.7 Implement notification queue in dynamic island (show sequentially, 5s timer, hover pause) ← (verify: toolbar renders correctly on both platforms, dynamic island animations work, window drag works)

## 4. ViewManager Refactor

- [x] 4.1 Refactor `ViewManager.updateActiveBounds()` to accept `SplitNode` and calculate bounds recursively
- [x] 4.2 Update root rect calculation: x=SIDEBAR_WIDTH, y=TOOLBAR_HEIGHT, width=windowWidth-SIDEBAR_WIDTH, height=windowHeight-TOOLBAR_HEIGHT
- [x] 4.3 Update `addPane` to position new view according to tree bounds
- [x] 4.4 Update `removePane` to recalculate bounds after tree collapse
- [x] 4.5 Add `updateRatio` method that recalculates bounds for a subtree
- [x] 4.6 Add `hideAllViews` method (for notification page) and `showProfileViews` method ← (verify: bounds calculation matches spec for all tree shapes — 1/2/3/4 panes, mixed directions)

## 5. Split UI & Resize

- [x] 5.1 Create `SplitContainer` component that renders the split tree recursively (address bars + resize handles)
- [x] 5.2 Implement split direction dropdown on address bar split button (Split Right / Split Down)
- [x] 5.3 Create `ResizeHandle` component (4px draggable divider between panes)
- [x] 5.4 Implement resize drag logic: calculate new ratio from mouse position, enforce min sizes (200px width, 150px height)
- [x] 5.5 Wire resize to IPC: on drag end, send new ratio to main process → store update → ViewManager recalculate
- [x] 5.6 Update `ContentArea` to render `SplitContainer` instead of flat pane list ← (verify: split in both directions works, resize respects minimums, 4-pane layout renders correctly)

## 6. Drag-and-Drop Pane Swap

- [x] 6.1 Add drag handle (⋮⋮) to `AddressBar` component
- [x] 6.2 Implement drag source with `@dnd-kit` on the drag handle
- [x] 6.3 Implement drop targets on pane content areas
- [x] 6.4 Add drop highlight overlay (blue tint) on valid drop targets
- [x] 6.5 Wire drop event: call `swapPanes` IPC → store update → ViewManager rebind views ← (verify: drag-drop swaps panes correctly, no-op on self-drop, highlight appears/disappears)

## 7. Sidebar Redesign

- [x] 7.1 Update `ProfileAvatar` component: reduce to w-9 h-9, subtle background instead of gradient
- [x] 7.2 Add profile name label below avatar (10px font, max 6 chars + ellipsis)
- [x] 7.3 Add bell icon button between profile list and dark mode toggle
- [x] 7.4 Add unread badge to bell icon (red dot with count, "99+" cap)
- [x] 7.5 Remove right sidebar (`RightSidebar` component and related code) ← (verify: sidebar displays names correctly, bell icon shows badge, avatar sizing is consistent)

## 8. Notification System

- [x] 8.1 Update pane preload script (`preload/pane.ts`): override `Notification` constructor to intercept and forward via IPC
- [x] 8.2 Add service worker notification interception in preload (override `ServiceWorkerRegistration.prototype.showNotification`)
- [x] 8.3 Add IPC handler in main process: receive notification from webview, forward to renderer
- [x] 8.4 Create notification state management in renderer (useReducer: add, markRead, markAllRead, clear)
- [x] 8.5 Wire notification arrival to dynamic island (push to queue) ← (verify: notifications from webviews are captured, forwarded to renderer, and appear in dynamic island)

## 9. Notification Page

- [x] 9.1 Create `NotificationPage` component (full list, reverse chronological, read/unread styling)
- [x] 9.2 Implement empty state (bell icon + "No notifications yet")
- [x] 9.3 Implement notification item click: mark read → switch profile+pane → close notification page
- [x] 9.4 Handle click on notification with closed source pane: show toast "This tab has been closed"
- [x] 9.5 Add "Mark all as read" button
- [x] 9.6 Add view state to App (`workspace` | `notifications`), wire bell icon click to toggle
- [x] 9.7 Wire view state to ViewManager: hide all views when on notification page, restore on return ← (verify: notification page shows all notifications, click navigates correctly, edge case of closed pane handled)

## 10. Integration & Cleanup

- [x] 10.1 Update `App.tsx`: integrate Toolbar, remove RightSidebar, add notification state, add view state
- [x] 10.2 Update IPC types in `types.ts` and preload bridge (`preload/shell.ts`) for all new handlers
- [x] 10.3 Remove `QuickTextPanel` and `RightSidebar` components (functionality moved out of scope)
- [x] 10.4 Update keyboard shortcuts: remove Ctrl+B (right sidebar), add Ctrl+Shift+N (new split)
- [x] 10.5 Run `npm run build` and fix any TypeScript errors
- [x] 10.6 Run `npm test` and fix any failing tests ← (verify: app builds cleanly, all tests pass, no TypeScript errors, full flow works end-to-end)
