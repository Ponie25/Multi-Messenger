## Context

Multi-Messenger is an Electron app that manages multiple browser profiles with split-screen panes. Currently:
- Panes are stored as a flat array (`panes: Pane[]`) per profile, max 3
- Layout divides available width equally among panes (horizontal only)
- ViewManager calculates bounds as `totalWidth / paneCount` per pane
- Native title bar on Windows, `hiddenInset` on macOS
- Notifications only go through native OS notification system
- Sidebar is 72px with 48x48 avatars showing initials

The app uses Electron 30, React 18, Tailwind CSS 3.4, @dnd-kit for drag-and-drop, and electron-store for persistence.

## Goals / Non-Goals

**Goals:**
- Flexible binary tree split layout (horizontal + vertical, max 4 panes, resizable)
- Drag-and-drop pane swapping via address bar drag handle
- Frameless window with 36px custom toolbar + dynamic island
- In-app notification center with Web Notification API interception
- Minimal sidebar with smaller avatars and visible profile names
- Smooth migration from flat pane array to tree structure

**Non-Goals:**
- Floating/detachable panes (picture-in-picture)
- Notification persistence across app restarts
- Tab grouping by service
- Keyboard shortcut customization
- macOS-specific traffic light positioning (use default frameless behavior)

## Decisions

### 1. Split Tree Data Structure

**Choice**: Binary tree with `SplitNode` discriminated union

```typescript
type SplitNode =
  | { type: 'leaf'; paneId: string }
  | { type: 'branch'; direction: 'horizontal' | 'vertical'; ratio: number; children: [SplitNode, SplitNode] }
```

**Why over flat array**: A flat array can only represent equal-width horizontal splits. A binary tree naturally represents nested splits in any direction with arbitrary ratios. Each split operation converts a leaf into a branch with two leaf children.

**Why over N-ary tree**: Binary tree is simpler — each split always produces exactly 2 children. This maps directly to "split this pane into two". Max 4 panes = max 3 branch nodes = tree depth ≤ 3.

**Alternatives considered**:
- Grid layout (CSS Grid with named areas): Simpler for fixed layouts but can't represent arbitrary nested splits. Also, WebContentsView bounds are set via Electron API, not CSS.
- Flat array with layout descriptors: More complex to reason about than a tree.

### 2. Bounds Calculation from Tree

**Choice**: Recursive traversal of the split tree, passing available rect down.

```
calculateBounds(node, rect):
  if leaf → assign rect to pane
  if branch → split rect by direction+ratio, recurse on children
```

ViewManager receives the full tree and a root rect (`{x: SIDEBAR_WIDTH, y: TOOLBAR_HEIGHT + ADDRESS_BAR_HEIGHT, width: ..., height: ...}`). Each branch splits the rect into two sub-rects based on direction and ratio.

**Why**: Clean recursive algorithm, easy to test in isolation, naturally handles any tree shape.

### 3. Resize Implementation

**Choice**: Custom resize handles rendered by React, communicating ratio changes via IPC to main process.

The renderer draws thin (4px) draggable dividers between panes. Dragging updates the `ratio` of the parent branch node. On drag end, the new ratio is sent to main process which updates ViewManager bounds.

**Why not allotment/react-resizable-panels**: Those libraries manage DOM elements, but our panes are WebContentsView (native Electron views positioned by bounds). We need to control the bounds calculation ourselves. The resize UI is just a thin overlay that reports ratio changes.

**Alternatives considered**:
- `allotment` library: Designed for DOM-based panels, doesn't work with Electron's WebContentsView positioning.
- Electron's built-in resize: No such API exists for child views.

### 4. Drag-and-Drop Pane Swap

**Choice**: Use existing `@dnd-kit` library. Drag handle (⋮⋮) on each address bar. Drop target is the pane area. On drop, swap `paneId` values between two leaf nodes in the tree.

**Why swap leaf paneIds instead of moving subtrees**: Simpler mental model — user sees "these two panes exchanged positions". Tree structure (split directions, ratios) stays the same.

### 5. Frameless Window + Custom Toolbar

**Choice**: `frame: false` on BrowserWindow, custom 36px toolbar rendered by React with `-webkit-app-region: drag` for window dragging.

Toolbar contains:
- Left: Profile name (text, non-draggable)
- Center: Dynamic island (notification preview area)
- Right: Window controls (minimize, maximize, close) — custom buttons

**Why frameless**: Required to have a custom toolbar. VS Code, Discord, Slack all use this pattern on Windows.

**Platform handling**:
- Windows: `frame: false`, custom window controls
- macOS: `titleBarStyle: 'hiddenInset'` (keeps native traffic lights), toolbar fills remaining space

### 6. Dynamic Island

**Choice**: A centered container in the toolbar that shows notification previews.

Behavior:
- Notification arrives → island expands to show title + body (animated)
- Auto-hides after 5 seconds
- Hover pauses the timer
- Click navigates to source profile+pane
- Queue: if multiple notifications arrive, show sequentially (next after current dismisses)

**Implementation**: React component with state machine (idle → showing → hovering → dismissing → idle). Notifications queued in array, processed one at a time.

### 7. Notification Interception

**Choice**: Use Electron's `webContents.session.setPermissionRequestHandler` (already used for granting notification permission) combined with overriding the `Notification` constructor in preload script.

The preload script for panes (`preload/pane.ts`) will:
1. Override `window.Notification` with a proxy that:
   - Calls the original `Notification` constructor (so native notification still fires)
   - Sends notification data (title, body, icon, tag) to main process via IPC
2. Main process forwards to renderer → stored in notification state

**Why intercept in preload vs main process**: The `did-create-notification` event doesn't exist in Electron. The `Notification` API is a web API called in the renderer of the webview. Preload injection is the standard way to intercept it.

**Alternatives considered**:
- `display-capture` permission handler: Doesn't intercept notification content
- `session.setPermissionRequestHandler`: Only handles permission grants, not notification content

### 8. Notification Storage

**Choice**: In-memory React state in the renderer process. Array of `NotificationItem` objects.

```typescript
interface NotificationItem {
  id: string
  profileId: string
  paneId: string
  title: string
  body: string
  icon?: string
  timestamp: number
  read: boolean
}
```

**Why in-memory**: User specified notifications clear on app quit. No persistence needed. Simple useState/useReducer in App component, passed down to NotificationPage.

### 9. Notification Page

**Choice**: When bell icon is clicked, renderer sets a `view: 'notifications' | 'workspace'` state. When view is 'notifications', ContentArea is replaced by NotificationPage component. Main process hides all WebContentsViews (setBounds to 0,0,0,0).

**Why replace content area**: User explicitly requested "trang giao diện riêng, thay thế hoàn toàn content area". This is simpler than overlay and gives full space for notification list.

### 10. Sidebar Redesign

**Choice**: Avatar reduced to 36x36 (`w-9 h-9`), profile name displayed below in 10px font, truncated at ~6 characters with ellipsis. Sidebar width stays at 72px.

Bell icon placed between profile list and dark mode toggle, same style as other icon buttons.

### 11. Store Migration (panes array → split tree)

**Choice**: On-load migration in `ProfileStore.migrate()`. Detect old format (has `panes` array without `splitTree`), convert to tree:

- 1 pane → single leaf node
- 2 panes → branch(horizontal, 0.5, [leaf, leaf])
- 3 panes → branch(horizontal, 0.33, [leaf, branch(vertical, 0.5, [leaf, leaf])])

This preserves existing user data.

## Risks / Trade-offs

- **[Frameless window on Windows]** → Custom window controls must handle snap layouts (Windows 11 hover on maximize). Mitigation: Use `electron-window-controls` pattern or handle `WM_NCHITTEST`.
- **[WebContentsView resize performance]** → Frequent setBounds during resize drag may cause flickering. Mitigation: Throttle bounds updates to 60fps, use `will-change` hints.
- **[Notification interception reliability]** → Some sites may use Service Worker notifications instead of `new Notification()`. Mitigation: Also intercept `ServiceWorkerRegistration.showNotification` in preload.
- **[Max 4 panes memory]** → Each WebContentsView is a full Chromium renderer process. 4 panes × multiple profiles = significant RAM. Mitigation: Only active profile's views are loaded; others are hidden (bounds 0,0,0,0) but still in memory. Document this limitation.
- **[Split tree complexity]** → More complex state management than flat array. Mitigation: Pure utility functions for tree operations (split, remove, swap, findLeaf), well-tested.

## Open Questions

- None — all decisions resolved during exploration phase.
