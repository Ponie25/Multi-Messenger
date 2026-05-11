## Context

MultiMessenger is an Electron app with a React renderer. The current left sidebar (72px) uses raw Tailwind classes with a hardcoded dark theme. The `ViewManager` class manages WebContentsView bounds based on a fixed `sidebarWidth` parameter. There is no theme system, no right sidebar, and no utility panel infrastructure.

The renderer uses Vite + React 18 + Tailwind 3.4. The main process uses electron-store for persistence.

## Goals / Non-Goals

**Goals:**
- Integrate shadcn/ui component library for consistent, accessible UI primitives
- Implement dark/light mode with system preference detection and manual toggle
- Redesign left sidebar to be minimal and polished using shadcn components
- Add a collapsible right sidebar (utility panel) with Quick Text as the first utility
- Quick Text: CRUD text snippets, click-to-inject into Messenger chat input
- Maintain all existing account management functionality

**Non-Goals:**
- Redesigning the Messenger webview content area
- Adding additional utilities beyond Quick Text in this change
- Mobile/responsive layout (this is a desktop Electron app)
- Rich text formatting in Quick Text snippets

## Decisions

### 1. shadcn/ui integration approach

**Decision**: Install shadcn/ui via CLI (`npx shadcn@latest init`) with New York style, neutral base color, and CSS variables enabled.

**Rationale**: shadcn/ui provides copy-paste components built on Radix UI primitives. Using CSS variables enables seamless dark/light mode switching. New York style is more minimal than Default.

**Alternative considered**: Building custom components with Radix directly — rejected because shadcn provides the exact minimal aesthetic requested with less effort.

### 2. Theme system

**Decision**: Use Tailwind `darkMode: "class"` strategy with a `ThemeProvider` component that:
- Reads system preference via `prefers-color-scheme` media query
- Stores user preference in localStorage
- Applies `dark` class to `<html>` element
- Exposes `useTheme()` hook for components

**Rationale**: Class-based dark mode gives full control. shadcn/ui's CSS variables automatically respond to the `dark` class.

### 3. Right sidebar architecture

**Decision**: Add a `RightSidebar` component (280px wide, collapsible to 0px) that renders utility panels. The active utility is tracked in renderer state. The right sidebar state (open/closed) is communicated to main process via IPC so `ViewManager` can adjust WebContentsView bounds.

**Layout**: `[LeftSidebar 72px] [WebContentsView flex-1] [RightSidebar 0|280px]`

**Rationale**: Keeping the right sidebar in the React renderer (not a separate BrowserView) allows tight integration with the utility panel UI. The main process only needs to know the total sidebar widths for bounds calculation.

### 4. ViewManager bounds update

**Decision**: Modify `ViewManager` to accept both `leftSidebarWidth` and `rightSidebarWidth` parameters. Add an IPC handler `sidebar:resize` that updates the right sidebar width and recalculates bounds.

**Current**: `width - sidebarWidth`
**New**: `width - leftSidebarWidth - rightSidebarWidth`

### 5. Quick Text storage

**Decision**: Store quick text snippets in the same electron-store instance under a `quickTexts` key. Schema: `{ id: string, text: string, label: string, order: number }[]`

**Rationale**: Reuses existing persistence infrastructure. Quick texts are app-level (not per-account), so they live at the top level of the store.

### 6. Text injection mechanism

**Decision**: When user clicks a quick text snippet:
1. Renderer sends IPC `quicktext:inject` with `{ text: string }` to main process
2. Main process calls `activeView.webContents.executeJavaScript()` with a script that:
   - Finds Messenger's input element (`[contenteditable="true"][role="textbox"]`)
   - Sets its text content and dispatches `input` event to trigger React state update
   - Focuses the input

**Rationale**: `executeJavaScript` on the active WebContentsView is the most reliable way to interact with the Messenger DOM. The contenteditable selector is stable across Messenger versions.

**Risk**: Facebook may change the DOM structure. Mitigation: use multiple fallback selectors and fail silently with a toast notification if injection fails.

## Risks / Trade-offs

- **[DOM selector fragility]** → Messenger's input selector may change. Mitigation: use broad selectors (`[contenteditable][role="textbox"]`), log failures, show user-friendly error.
- **[Bundle size increase]** → shadcn/ui + Radix adds ~30-50KB gzipped. Acceptable for a desktop app.
- **[Right sidebar width on small windows]** → If window is too narrow, right sidebar could squeeze content. Mitigation: auto-collapse right sidebar below 800px window width, minimum content area of 400px.
