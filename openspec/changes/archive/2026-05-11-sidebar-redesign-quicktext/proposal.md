## Why

The current sidebar uses raw Tailwind classes with a hardcoded dark theme and no light mode support. The UI lacks polish and consistency. Additionally, users frequently send repetitive messages (greetings, templates) and need a way to quickly insert pre-written text into Messenger's chat input without retyping.

## What Changes

- **Redesign left sidebar** using shadcn/ui components (Avatar, Button, Tooltip) for a minimal, polished look with proper dark/light mode theming
- **Add theme system** with Tailwind `class` strategy and a theme toggle, supporting system preference detection
- **Add right sidebar** (collapsible, ~280px) as a utility panel framework
- **Add Quick Text utility** in the right sidebar: users can create, edit, delete text snippets; clicking a snippet auto-fills it into the active Messenger chat input field
- **Add IPC channel** for injecting text into the active WebContentsView's Messenger input

## Capabilities

### New Capabilities
- `theme-system`: Dark/light mode theming with shadcn/ui design tokens, system preference detection, and manual toggle
- `quick-text`: Right sidebar utility panel with text snippet management (CRUD) and auto-injection into Messenger chat input via IPC

### Modified Capabilities
- `webview-shell`: Layout changes — the content area now sits between left sidebar (72px) and a collapsible right sidebar (~280px). WebContentsView bounds must account for both sidebars.

## Impact

- **Dependencies**: Add shadcn/ui ecosystem (`tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/*`)
- **Code**: `src/renderer/` — new components, theme provider, redesigned Sidebar. `src/main/` — new IPC handlers for quick-text CRUD and text injection. `src/main/store.ts` — new quick-text storage section.
- **Config**: `tailwind.config.js` updated for shadcn/ui + darkMode class strategy. New `components.json` for shadcn.
- **Layout**: Window resize handler in main process must recalculate bounds considering right sidebar state (open/closed).
