## ADDED Requirements

### Requirement: Quick Text snippet management
The system SHALL allow users to create, edit, and delete text snippets (Quick Texts) from the right sidebar utility panel. Snippets SHALL be persisted to disk and survive app restarts.

#### Scenario: User creates a new snippet
- **WHEN** user clicks the "Add" button in the Quick Text panel and enters text and an optional label
- **THEN** the snippet SHALL be saved to electron-store
- **THEN** the snippet SHALL appear in the Quick Text list immediately

#### Scenario: User edits an existing snippet
- **WHEN** user clicks the edit icon on a snippet
- **THEN** the snippet text and label SHALL become editable inline
- **THEN** changes SHALL be persisted on blur or Enter key

#### Scenario: User deletes a snippet
- **WHEN** user clicks the delete icon on a snippet
- **THEN** the snippet SHALL be removed from the list and from electron-store immediately
- **THEN** no confirmation dialog is required

#### Scenario: Snippets persist across restarts
- **WHEN** the app restarts after snippets have been created
- **THEN** all previously saved snippets SHALL appear in the Quick Text panel in their original order

### Requirement: Quick Text injection into Messenger
The system SHALL inject the selected snippet's text into the active Messenger chat input field when the user clicks on a snippet.

#### Scenario: User clicks a snippet while a chat is open
- **WHEN** user clicks a snippet in the Quick Text panel
- **THEN** the snippet text SHALL be inserted into the active Messenger chat input field (contenteditable textbox)
- **THEN** the chat input SHALL receive focus
- **THEN** Messenger SHALL recognize the injected text as user input (React state updated)

#### Scenario: Injection fails (no active chat input found)
- **WHEN** user clicks a snippet but no chat input is found in the active WebContentsView (e.g., user is on login page)
- **THEN** the system SHALL show a brief toast notification: "Could not find chat input"
- **THEN** no error is thrown and the app remains functional

### Requirement: Right sidebar utility panel
The system SHALL display a collapsible right sidebar (280px expanded, 36px collapsed strip) that hosts utility panels. The right sidebar SHALL always show a narrow strip with a toggle button, even when collapsed, to remain accessible above the WebContentsView layer.

#### Scenario: User opens the right sidebar
- **WHEN** user clicks the right sidebar toggle button in the collapsed strip
- **THEN** the right sidebar SHALL expand to 280px width with a smooth animation
- **THEN** the WebContentsView bounds SHALL shrink to accommodate the right sidebar

#### Scenario: User closes the right sidebar
- **WHEN** user clicks the right sidebar close button while the sidebar is open
- **THEN** the right sidebar SHALL collapse to a 36px strip containing only the toggle button
- **THEN** the WebContentsView bounds SHALL expand to fill the freed space

#### Scenario: Right sidebar auto-collapses on narrow window
- **WHEN** the window width is less than 800px
- **THEN** the right sidebar SHALL auto-collapse if it is open
- **THEN** the 36px toggle strip SHALL remain visible for manual re-opening
