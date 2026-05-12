## ADDED Requirements

### Requirement: Notification interception from webviews
The system SHALL intercept all Web Notification API calls from webview panes and store them in an in-memory notification list. Both `new Notification()` and `ServiceWorkerRegistration.showNotification()` SHALL be intercepted.

#### Scenario: Webview creates a notification
- **WHEN** a webview calls `new Notification(title, options)`
- **THEN** the notification data (title, body, icon, tag) is sent to the main process via IPC
- **THEN** the main process forwards the notification to the renderer
- **THEN** the notification is added to the in-memory notification list
- **THEN** the native OS notification still fires normally

#### Scenario: Service worker shows notification
- **WHEN** a webview's service worker calls `registration.showNotification(title, options)`
- **THEN** the notification data is intercepted and sent to the main process
- **THEN** the notification is added to the in-memory notification list

### Requirement: Notification data model
Each notification SHALL contain: id (UUID), profileId, paneId, title, body, icon (optional), timestamp, and read status.

#### Scenario: Notification stored with full metadata
- **WHEN** a notification is intercepted
- **THEN** it is stored with a unique ID, the source profileId and paneId, title, body, icon URL (if provided), current timestamp, and read=false

### Requirement: Notification bell icon in sidebar
The sidebar SHALL display a bell icon button between the profile list and the dark mode toggle. The bell SHALL show an unread count badge when unread notifications exist.

#### Scenario: No unread notifications
- **WHEN** all notifications are read or no notifications exist
- **THEN** the bell icon is shown without a badge

#### Scenario: Unread notifications exist
- **WHEN** there are N unread notifications (N > 0)
- **THEN** the bell icon shows a red badge with the count N
- **THEN** if N > 99, the badge shows "99+"

#### Scenario: User clicks bell icon
- **WHEN** user clicks the bell icon
- **THEN** the view switches to the notification page
- **THEN** all webview panes are hidden (bounds set to 0,0,0,0)
- **THEN** the notification page fills the content area

### Requirement: Notification page
The system SHALL display a full notification page when the bell icon is clicked. The page replaces the content area entirely (no webviews visible).

#### Scenario: Notification page displays all notifications
- **WHEN** the notification page is shown
- **THEN** all notifications are listed in reverse chronological order (newest first)
- **THEN** each notification shows: icon, title, body, relative timestamp, and read/unread indicator
- **THEN** unread notifications have a distinct visual style (bolder, with blue dot)

#### Scenario: Empty notification page
- **WHEN** the notification page is shown and no notifications exist
- **THEN** an empty state is displayed with a bell icon and "No notifications yet" message

#### Scenario: User clicks a notification item
- **WHEN** user clicks on a notification in the list
- **THEN** the notification is marked as read
- **THEN** the view switches back to workspace mode
- **THEN** the app switches to the notification's source profile
- **THEN** the app activates the notification's source pane

#### Scenario: Source pane no longer exists
- **WHEN** user clicks a notification whose source pane has been closed
- **THEN** a toast message shows "This tab has been closed"
- **THEN** the notification page remains open
- **THEN** the notification is still marked as read

#### Scenario: User returns to workspace
- **WHEN** user clicks the back button or any profile avatar while on notification page
- **THEN** the notification page closes
- **THEN** the workspace view is restored with all panes visible

### Requirement: Notifications clear on app quit
All notifications SHALL be stored in memory only and SHALL be cleared when the application quits.

#### Scenario: App quits and restarts
- **WHEN** the app is closed and reopened
- **THEN** the notification list is empty
- **THEN** no previous notifications are shown

### Requirement: Mark all as read
The notification page SHALL provide a "Mark all as read" button.

#### Scenario: User marks all as read
- **WHEN** user clicks "Mark all as read" on the notification page
- **THEN** all notifications have their read status set to true
- **THEN** the unread badge on the bell icon disappears
- **THEN** all notification items update their visual style to read state
