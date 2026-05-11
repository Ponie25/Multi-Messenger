## [2026-05-11] Round 1 (from spx-apply auto-verify)

### spx-verifier
- Fixed: Edit-on-blur added to QuickTextPanel edit form (label input gets onBlur={handleSaveEdit})
- Fixed: IPC side effect moved outside React state updater in App.tsx handleToggleRightSidebar
- Fixed: Injection script now includes `data` field in InputEvent and uses fallback selectors
- Fixed: ThemeProvider now exposes `resolvedTheme` and Sidebar uses it for icon state (fixes stale icon on OS theme change)

### spx-uiux-verifier
- Fixed: Snippet div now has focus-visible:ring-2 for keyboard navigation
- Fixed: Space key now handled on snippet div (role="button" contract)
- Fixed: All icon-only buttons in QuickTextPanel now have aria-label
- Fixed: Toast notification now has aria-live="assertive" and aria-atomic="true"
- Fixed: Tooltip component now triggers on focus/blur (keyboard accessible)
- Fixed: ContextMenu migrated from hardcoded gray colors to design token classes (bg-popover, text-popover-foreground, etc.)
- Fixed: RightSidebar toggle buttons now have aria-expanded and aria-controls
- Fixed: RightSidebar aside has motion-reduce:transition-none
- Fixed: Button sizes increased from h-6 w-6 to h-7 w-7 for better touch targets
- Fixed: Empty state added to QuickTextPanel when no snippets exist
- Fixed: Action buttons now visible on focus-within (keyboard accessible)
