## MODIFIED Requirements

### Requirement: Native notifications from all accounts
The system SHALL automatically grant notification permission for every account's session partition so the Web Notifications API can deliver native OS notifications from all accounts. Additionally, the system SHALL intercept notification content and forward it to the in-app notification center.

#### Scenario: Notification permission granted automatically
- **WHEN** a webview requests notification permission in any account's session partition
- **THEN** the permission is granted automatically without prompting the user
- **THEN** the webview can send native OS notifications for that account

#### Scenario: Notification received from background account
- **WHEN** a new message arrives in an account that is not currently active (WebContentsView is hidden)
- **THEN** a native OS notification appears with the message details (as provided by the site)
- **THEN** the notification content is also captured and sent to the in-app notification center
- **THEN** clicking the native OS notification brings the app to focus and switches to that account

#### Scenario: Notification content intercepted for notification center
- **WHEN** any webview fires a Web Notification (via constructor or service worker)
- **THEN** the notification title, body, and icon are captured
- **THEN** the data is forwarded to the renderer's notification store
- **THEN** the dynamic island shows the notification preview
- **THEN** the bell icon badge count increments
