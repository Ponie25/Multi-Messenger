## [2026-05-12] Round 1 (from spx-apply auto-verify)

### spx-verifier
- Fixed: [CRITICAL] C1 — Added hideAllViews/showProfileViews to ElectronAPI and preload, added useEffect in App.tsx to hide WebContentsViews when notification page is shown
- Fixed: [CRITICAL] C2 — pane:swap IPC handler now calls viewManager.updateBoundsFromTree after store update
- Fixed: [CRITICAL] C3 — splitLeaf now validates targetPaneId exists via findLeaf before proceeding
- Fixed: [CRITICAL] C4 — Migration handles panes.length === 0 by creating a default pane
- Fixed: [CRITICAL] C5 — ResizeHandle now imports MIN_PANE_WIDTH/MIN_PANE_HEIGHT and enforces pixel-based minimums
- Fixed: [CRITICAL] C6 — Toolbar fallback text changed from empty string to 'MultiMessenger'
- Fixed: [WARNING] W1 — Added onDoubleClick handler to toolbar for maximize toggle
- Fixed: [WARNING] W3 — Added Ctrl+Shift+N keyboard shortcut for new split
- Fixed: [WARNING] W4 — profile:switch now passes splitTree from store to ViewManager
- Fixed: [SUGGESTION] S1 — Removed unused startPos variable in ResizeHandle
