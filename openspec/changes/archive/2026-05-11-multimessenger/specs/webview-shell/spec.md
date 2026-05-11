## ADDED Requirements

### Requirement: App window layout
The system SHALL render a main BrowserWindow with a fixed-width sidebar on the left and a WebContentsView area filling the remaining space on the right. The sidebar width SHALL be 72px. The WebContentsView SHALL be repositioned and resized whenever the window is resized.

#### Scenario: Window renders correctly on launch
- **WHEN** the app launches
- **THEN** the sidebar is visible on the left at 72px width
- **THEN** the active account's WebContentsView fills the remaining space to the right
- **THEN** no scrollbars appear on the main window

#### Scenario: Window is resized
- **WHEN** user resizes the main window
- **THEN** the active WebContentsView bounds update immediately to fill the available space
- **THEN** the sidebar width remains fixed at 72px

### Requirement: Account switching
The system SHALL allow users to switch between accounts by clicking an account avatar in the sidebar. Switching SHALL be instant (no reload) by hiding the current WebContentsView and showing the selected one.

#### Scenario: User switches accounts
- **WHEN** user clicks a different account in the sidebar
- **THEN** the current WebContentsView is hidden
- **THEN** the selected account's WebContentsView is shown and fills the content area
- **THEN** the selected account is highlighted as active in the sidebar
- **THEN** the switch completes in under 100ms (no network request needed)

### Requirement: User agent spoofing
Each WebContentsView SHALL use a Chrome user agent string matching the host OS to prevent Facebook from detecting Electron and degrading the experience.

#### Scenario: WebContentsView navigates to Facebook
- **WHEN** a WebContentsView is created and navigates to `facebook.com`
- **THEN** the HTTP request includes a `User-Agent` header matching Chrome on the current OS (macOS or Windows)
- **THEN** Facebook renders the full web experience without degradation

### Requirement: Auto-detect account name and avatar
After a WebContentsView navigates to `facebook.com/messages` and the user is logged in, the system SHALL inject a script to read the account's display name and avatar URL from the DOM and send them to the main process via IPC.

#### Scenario: Account info detected after login
- **WHEN** a WebContentsView finishes loading `facebook.com/messages` and the user is logged in
- **THEN** the injected script reads the display name and avatar URL from the DOM
- **THEN** the sidebar updates to show the detected name and avatar
- **THEN** the detected info is persisted to Electron Store

#### Scenario: Account info detection fails
- **WHEN** the injected script cannot find the expected DOM elements (Facebook updated their markup)
- **THEN** the sidebar continues to show the placeholder avatar and "Account N" label
- **THEN** no error is thrown to the user
