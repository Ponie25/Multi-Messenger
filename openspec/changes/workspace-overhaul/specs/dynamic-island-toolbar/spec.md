## ADDED Requirements

### Requirement: Frameless window with custom toolbar
The system SHALL use a frameless window (`frame: false` on Windows, `titleBarStyle: 'hiddenInset'` on macOS) with a custom 36px toolbar rendered by the React application.

#### Scenario: App launches on Windows
- **WHEN** the app launches on Windows
- **THEN** the window has no native title bar
- **THEN** a 36px custom toolbar is rendered at the top of the window
- **THEN** the toolbar has `-webkit-app-region: drag` for window dragging
- **THEN** custom window controls (minimize, maximize, close) are rendered on the right

#### Scenario: App launches on macOS
- **WHEN** the app launches on macOS
- **THEN** the window uses `titleBarStyle: 'hiddenInset'` (native traffic lights preserved)
- **THEN** a 36px custom toolbar is rendered, leaving space for native traffic lights on the left
- **THEN** no custom window controls are rendered (native ones are used)

#### Scenario: Window drag via toolbar
- **WHEN** user clicks and drags on the toolbar background area
- **THEN** the window moves with the cursor
- **WHEN** user double-clicks the toolbar background
- **THEN** the window toggles between maximized and restored state

### Requirement: Toolbar content layout
The toolbar SHALL display the active profile name on the left, the dynamic island in the center, and window controls on the right (Windows only).

#### Scenario: Toolbar displays profile name
- **WHEN** a profile is active
- **THEN** the toolbar shows the profile name on the left side
- **THEN** the profile name is non-draggable (clickable area)

#### Scenario: Toolbar with no active profile
- **WHEN** no profile is active
- **THEN** the toolbar shows "MultiMessenger" as the title

### Requirement: Dynamic island notification preview
The toolbar SHALL contain a centered dynamic island area that displays notification previews. Notifications appear with animation, auto-dismiss after 5 seconds, and are interactive.

#### Scenario: Notification arrives
- **WHEN** a new notification is received from any webview
- **THEN** the dynamic island expands from its resting state (small pill) to show the notification title and body
- **THEN** the expansion is animated (200ms ease-out)
- **THEN** the notification auto-dismisses after 5 seconds

#### Scenario: User hovers over dynamic island
- **WHEN** a notification is showing and user hovers over the dynamic island
- **THEN** the 5-second dismiss timer pauses
- **WHEN** user moves the cursor away
- **THEN** the timer resumes from where it paused

#### Scenario: User clicks dynamic island notification
- **WHEN** user clicks the dynamic island while a notification is showing
- **THEN** the app switches to the source profile and pane of that notification
- **THEN** the notification is marked as read
- **THEN** the dynamic island returns to resting state

#### Scenario: Multiple notifications queued
- **WHEN** a new notification arrives while another is being displayed
- **THEN** the new notification is queued
- **WHEN** the current notification dismisses
- **THEN** the next queued notification is shown

#### Scenario: Dynamic island resting state
- **WHEN** no notification is being displayed
- **THEN** the dynamic island shows as a small pill shape (subtle, minimal)
- **THEN** the pill does not interfere with window dragging

### Requirement: Custom window controls (Windows)
On Windows, the toolbar SHALL render custom minimize, maximize, and close buttons that replicate native window behavior.

#### Scenario: Minimize button
- **WHEN** user clicks the minimize button
- **THEN** the window minimizes to the taskbar

#### Scenario: Maximize button
- **WHEN** user clicks the maximize button while window is normal
- **THEN** the window maximizes to fill the screen
- **WHEN** user clicks the maximize button while window is maximized
- **THEN** the window restores to its previous size

#### Scenario: Close button
- **WHEN** user clicks the close button
- **THEN** the window closes (app quits on Windows)

#### Scenario: Close button hover
- **WHEN** user hovers over the close button
- **THEN** the button background turns red (matching Windows convention)
