## Why

The current split-screen implementation is rigid — it only supports side-by-side horizontal splits (max 3 panes) with equal widths. Users need a flexible workspace that can split in both directions, resize freely, and support up to 4 panes. Additionally, the app lacks a notification center, a global toolbar with dynamic island, and the sidebar avatars are oversized relative to the sidebar width.

## What Changes

- **Binary tree split layout**: Replace flat pane array with a binary tree structure. Each split can be horizontal or vertical, with draggable resize borders. Max 4 panes per profile. Users can drag-and-drop panes to swap positions via a drag handle on the address bar.
- **Frameless window with custom toolbar**: Replace native title bar with a 36px custom toolbar containing dynamic island (notification preview, 5s display, hover to keep, click to navigate), active profile name, and window controls (minimize/maximize/close).
- **Minimal sidebar**: Reduce avatar size, display truncated profile name below each avatar. Add notification bell icon near the dark mode toggle.
- **Notification center**: Intercept Web Notification API calls from all webviews, store in-memory. Bell icon in sidebar opens a full notification page (replaces content area, hides webviews). Click a notification → switch to source profile+pane, mark as read. All notifications clear on app quit.

## Capabilities

### New Capabilities
- `split-tree-layout`: Binary tree-based pane layout with horizontal/vertical splits, resize, drag-swap, max 4 panes
- `dynamic-island-toolbar`: Frameless window custom toolbar (36px) with dynamic island notification preview, profile name, window controls
- `notification-center`: In-memory notification store, notification page UI, intercept Web Notification API, click-to-navigate

### Modified Capabilities
- `webview-shell`: Layout changes from flat pane array to binary tree bounds calculation. Frameless window replaces default title bar. Address bar now includes split direction chooser and drag handle.
- `notifications`: Extends existing notification permission system with in-app notification interception and storage (previously only native OS notifications).
- `account-management`: Sidebar avatar size reduced, profile name displayed below avatar with truncation.

## Impact

- **Main process** (`src/main/index.ts`): Frameless window config, new IPC handlers for split tree operations and notification management
- **View manager** (`src/main/view-manager.ts`): Complete refactor — bounds calculation from binary tree instead of flat division
- **Store** (`src/main/store.ts`): New `SplitNode` tree structure replaces `panes: Pane[]` in Profile. Notification store (in-memory, not persisted)
- **Renderer**: New components (Toolbar, DynamicIsland, NotificationPage, SplitControls), refactored ContentArea, Sidebar, AddressBar
- **Types** (`src/renderer/types.ts`, `src/shared/constants.ts`): New SplitNode type, updated Profile interface
- **Dependencies**: May need `allotment` or custom resize logic. `@dnd-kit` already available for drag-swap.
- **Breaking**: Profile data structure changes (panes array → split tree). Needs migration in store.
