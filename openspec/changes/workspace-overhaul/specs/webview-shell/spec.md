## MODIFIED Requirements

### Requirement: App window layout
The system SHALL render a main BrowserWindow as a frameless window with a custom 36px toolbar at the top, a fixed-width left sidebar (72px), and a WebContentsView area filling the remaining space. The WebContentsView bounds SHALL be calculated from the binary split tree structure. The right sidebar is removed (Quick Text panel relocated or removed in this change).

#### Scenario: Window renders correctly on launch
- **WHEN** the app launches
- **THEN** the custom toolbar is visible at the top at 36px height
- **THEN** the left sidebar is visible on the left at 72px width
- **THEN** the active profile's pane WebContentsViews fill the space below the toolbar and to the right of the sidebar
- **THEN** pane bounds are calculated from the profile's split tree
- **THEN** no scrollbars appear on the main window

#### Scenario: Window is resized
- **WHEN** user resizes the main window
- **THEN** all active pane WebContentsView bounds are recalculated from the split tree
- **THEN** the toolbar height remains fixed at 36px
- **THEN** the left sidebar width remains fixed at 72px

#### Scenario: Multiple panes visible
- **WHEN** a profile has multiple panes (split tree has branches)
- **THEN** each pane's WebContentsView is positioned according to its leaf node's calculated rect
- **THEN** address bars are rendered above each pane within its allocated rect

### Requirement: Account switching
The system SHALL allow users to switch between accounts by clicking an account avatar in the sidebar. Switching SHALL be instant (no reload) by hiding the current WebContentsViews and showing the selected profile's views according to its split tree.

#### Scenario: User switches accounts
- **WHEN** user clicks a different account in the sidebar
- **THEN** all current profile's WebContentsViews are hidden (bounds 0,0,0,0)
- **THEN** the selected profile's WebContentsViews are shown with bounds from its split tree
- **THEN** the selected account is highlighted as active in the sidebar
- **THEN** the switch completes in under 100ms (no network request needed)

#### Scenario: User switches from notification page
- **WHEN** user clicks a profile avatar while on the notification page
- **THEN** the notification page closes
- **THEN** the selected profile's workspace is shown
