## MODIFIED Requirements

### Requirement: App window layout
The system SHALL render a main BrowserWindow with a fixed-width left sidebar (72px), a WebContentsView area in the center, and a right sidebar (280px expanded, 36px collapsed strip). The WebContentsView SHALL fill the space between the left sidebar and the right sidebar strip/panel. The WebContentsView SHALL be repositioned and resized whenever the window is resized or either sidebar changes state.

#### Scenario: Window renders correctly on launch
- **WHEN** the app launches
- **THEN** the left sidebar is visible on the left at 72px width
- **THEN** the right sidebar shows a 36px collapsed strip with a toggle button
- **THEN** the active account's WebContentsView fills the space between left sidebar and right sidebar strip
- **THEN** no scrollbars appear on the main window

#### Scenario: Window is resized
- **WHEN** user resizes the main window
- **THEN** the active WebContentsView bounds update immediately to fill the available space between both sidebars
- **THEN** the left sidebar width remains fixed at 72px
- **THEN** the right sidebar width remains at its current state (36px collapsed or 280px expanded)

#### Scenario: Right sidebar state changes
- **WHEN** the right sidebar opens or closes
- **THEN** the main process receives the new right sidebar width via IPC
- **THEN** the WebContentsView bounds update to: `width - leftSidebarWidth - rightSidebarWidth`
