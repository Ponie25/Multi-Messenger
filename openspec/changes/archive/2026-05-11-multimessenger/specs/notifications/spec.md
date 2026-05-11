## ADDED Requirements

### Requirement: Native notifications from all accounts
The system SHALL automatically grant notification permission for every account's session partition so Facebook's Web Notifications API can deliver native OS notifications from all accounts, including accounts whose BrowserView is not currently active.

#### Scenario: Notification permission granted automatically
- **WHEN** Facebook requests notification permission in any account's BrowserView
- **THEN** the permission is granted automatically without prompting the user
- **THEN** Facebook can send native OS notifications for that account

#### Scenario: Notification received from background account
- **WHEN** a new message arrives in an account that is not currently active (BrowserView is hidden)
- **THEN** a native OS notification appears with the message details (as provided by Facebook)
- **THEN** clicking the notification brings the app to focus and switches to that account

### Requirement: Per-account notification toggle
The system SHALL allow users to disable notifications for individual accounts. When disabled, the system SHALL revoke notification permission for that account's session partition.

#### Scenario: User disables notifications for an account
- **WHEN** user right-clicks an account in the sidebar and toggles "Disable notifications"
- **THEN** the account's `notificationsEnabled` is set to `false` in Electron Store
- **THEN** subsequent notification permission requests from that account's BrowserView are denied
- **THEN** a mute icon is shown on the account's sidebar avatar

#### Scenario: User re-enables notifications for an account
- **WHEN** user right-clicks a muted account and toggles "Enable notifications"
- **THEN** the account's `notificationsEnabled` is set to `true` in Electron Store
- **THEN** subsequent notification permission requests from that account's BrowserView are granted
- **THEN** the mute icon is removed from the sidebar avatar
