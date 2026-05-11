## 1. shadcn/ui Setup & Theme System

- [x] 1.1 Install shadcn/ui dependencies: `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`
- [x] 1.2 Run `npx shadcn@latest init` — configure New York style, neutral color, CSS variables enabled
- [x] 1.3 Update `tailwind.config.js` with shadcn/ui preset (darkMode: "class", CSS variable colors, animate plugin)
- [x] 1.4 Update `src/renderer/index.css` with shadcn/ui CSS variables (light and dark themes)
- [x] 1.5 Create `src/renderer/components/ThemeProvider.tsx` — context provider with system detection, localStorage persistence, `useTheme()` hook
- [x] 1.6 Wrap `App.tsx` root with `ThemeProvider` ← (verify: toggling theme applies dark class to html, all components respond to theme change)

## 2. Left Sidebar Redesign

- [x] 2.1 Add shadcn components needed: Button, Avatar, Tooltip (`npx shadcn@latest add button avatar tooltip`)
- [x] 2.2 Rewrite `AccountAvatar.tsx` using shadcn `Avatar` + `AvatarImage` + `AvatarFallback`, keep badge and mute overlays
- [x] 2.3 Rewrite `Sidebar.tsx` using shadcn components — minimal design, proper dark/light mode colors via CSS variables
- [x] 2.4 Add theme toggle button to sidebar (sun/moon icon from lucide-react, positioned between account list and add-account button)
- [x] 2.5 Ensure drag-and-drop reordering still works with new component structure
- [x] 2.6 Ensure context menu still works (right-click on avatar) ← (verify: all existing sidebar functionality preserved — add, switch, remove, reorder, notifications toggle, theme toggle)

## 3. Right Sidebar Infrastructure

- [x] 3.1 Create `src/renderer/components/RightSidebar.tsx` — collapsible panel (280px), toggle button, smooth open/close animation
- [x] 3.2 Add right sidebar toggle button to the app layout (top-right area, visible when sidebar is closed)
- [x] 3.3 Update `App.tsx` layout to include RightSidebar: `[LeftSidebar] [content flex-1] [RightSidebar]`
- [x] 3.4 Add IPC channel `sidebar:resize` — renderer sends `{ rightSidebarWidth: number }` to main process when right sidebar opens/closes
- [x] 3.5 Update `ViewManager.updateActiveBounds()` to subtract both left and right sidebar widths from content area
- [x] 3.6 Add IPC handler in `src/main/index.ts` for `sidebar:resize` that calls `viewManager.setRightSidebarWidth(width)` ← (verify: WebContentsView bounds adjust correctly when right sidebar opens/closes and on window resize)

## 4. Quick Text Storage

- [x] 4.1 Define `QuickText` type in `src/main/store.ts`: `{ id: string, label: string, text: string, order: number }`
- [x] 4.2 Add `quickTexts` section to electron-store with methods: `getAll()`, `add(label, text)`, `update(id, data)`, `remove(id)`, `reorder(ids)`
- [x] 4.3 Add IPC handlers in main process: `quicktext:getAll`, `quicktext:add`, `quicktext:update`, `quicktext:remove`
- [x] 4.4 Expose Quick Text IPC methods in preload bridge (`src/preload/preload.ts`) and update `ElectronAPI` type

## 5. Quick Text UI

- [x] 5.1 Create `src/renderer/components/QuickTextPanel.tsx` — list of snippets with add/edit/delete controls
- [x] 5.2 Implement inline editing: click edit icon → text becomes editable, save on blur/Enter
- [x] 5.3 Implement add snippet: input field at top/bottom, creates new snippet on submit
- [x] 5.4 Implement delete snippet: click trash icon → immediate removal (no confirmation)
- [x] 5.5 Style with shadcn components (Button, Input, Card) and proper dark/light mode support ← (verify: CRUD operations work, snippets persist after restart)

## 6. Quick Text Injection

- [x] 6.1 Add IPC handler `quicktext:inject` in main process — receives `{ text: string }`, calls `executeJavaScript` on active WebContentsView
- [x] 6.2 Write injection script: find `[contenteditable="true"][role="textbox"]`, set textContent, dispatch InputEvent, focus element
- [x] 6.3 Wire snippet click in `QuickTextPanel` → IPC `quicktext:inject`
- [x] 6.4 Handle injection failure: if selector not found, send IPC response with error, show toast in renderer ← (verify: clicking snippet inserts text into Messenger chat input, text is recognized by Messenger as user input, failure shows toast)

## 7. Auto-collapse & Polish

- [x] 7.1 Add window width listener: auto-collapse right sidebar when window width < 800px
- [x] 7.2 Ensure minimum content area of 400px — prevent right sidebar from squeezing content
- [x] 7.3 Add keyboard shortcut for right sidebar toggle (Cmd/Ctrl+B)
- [x] 7.4 Final visual polish: transitions, hover states, focus rings consistent across both sidebars ← (verify: dark/light mode looks correct in both sidebars, auto-collapse works, keyboard shortcut works)
