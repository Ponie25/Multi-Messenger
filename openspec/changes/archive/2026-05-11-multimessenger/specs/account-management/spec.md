## ADDED Requirements

### Requirement: Add account
The system SHALL allow users to add a new Facebook account by clicking an "Add account" button in the sidebar. A new WebContentsView SHALL be created with an isolated session partition and navigate to `https://www.facebook.com/messages`. Facebook SHALL redirect the user to login if not authenticated.

#### Scenario: User adds first account
- **WHEN** user launches the app for the first time and clicks "Add account"
- **THEN** a new WebContentsView opens showing `facebook.com/messages` (or Facebook login page if not logged in)
- **THEN** the account appears in the sidebar with a placeholder avatar and "Account N" label until name/avatar are detected

#### Scenario: User adds additional account
- **WHEN** user clicks "Add account" while one or more accounts already exist
- **THEN** a new isolated WebContentsView is created with a unique `persist:account-<uuid>` partition
- **THEN** the existing active account remains visible and unchanged
- **THEN** the new account is added to the bottom of the sidebar list

#### Scenario: Session persists after restart
- **WHEN** user has logged into an account and restarts the app
- **THEN** the account's session (cookies, localStorage) is restored automatically
- **THEN** the user does NOT need to log in again

### Requirement: Remove account
The system SHALL allow users to remove an account. Removing an account SHALL delete its session data and remove it from the sidebar permanently.

#### Scenario: User removes an account
- **WHEN** user right-clicks an account in the sidebar and selects "Remove account"
- **THEN** a confirmation dialog is shown: "Remove this account? This will clear its session."
- **THEN** upon confirmation, the WebContentsView is destroyed, session partition data is cleared, and the account is removed from the sidebar
- **THEN** if the removed account was active, the app switches to the first remaining account

#### Scenario: User removes last account
- **WHEN** user removes the only remaining account
- **THEN** the app shows an empty state with an "Add account" prompt

### Requirement: Persist account list
The system SHALL persist the account list (id, name, avatarUrl, notificationsEnabled, order) to disk using Electron Store so the list survives app restarts.

#### Scenario: Account list restored on startup
- **WHEN** the app starts and account data exists in Electron Store
- **THEN** all accounts are loaded and their WebContentsViews are created in the stored order
- **THEN** the first account in the list is shown as active

### Requirement: Reorder accounts
The system SHALL allow users to reorder accounts in the sidebar via drag-and-drop.

#### Scenario: User reorders accounts
- **WHEN** user drags an account item in the sidebar to a new position
- **THEN** the sidebar updates immediately to reflect the new order
- **THEN** the new order is persisted to Electron Store
