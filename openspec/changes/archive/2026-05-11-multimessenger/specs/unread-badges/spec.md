## ADDED Requirements

### Requirement: Unread count badge in sidebar
The system SHALL inject a script into each account's BrowserView that monitors the document title for unread count changes (format: `"(N) Messenger"`) and sends the count to the main process via IPC. The sidebar SHALL display a red badge with the count on the account's avatar when count > 0.

#### Scenario: Unread badge appears when messages arrive
- **WHEN** the document title of an account's BrowserView changes to `"(N) Messenger"` where N > 0
- **THEN** the injected script parses N from the title
- **THEN** the main process receives the count via IPC
- **THEN** the sidebar shows a red badge with the number N on that account's avatar

#### Scenario: Unread badge clears when messages are read
- **WHEN** the document title changes to `"Messenger"` (no count prefix)
- **THEN** the badge is removed from the account's avatar in the sidebar

#### Scenario: Badge injection fails gracefully
- **WHEN** the title monitoring script encounters an error
- **THEN** no badge is shown (defaults to no badge)
- **THEN** no error is surfaced to the user
- **THEN** the rest of the app continues to function normally
