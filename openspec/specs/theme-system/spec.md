## ADDED Requirements

### Requirement: Dark and light mode support
The system SHALL support dark mode and light mode themes. The theme SHALL be applied globally via a `dark` CSS class on the root HTML element. All UI components SHALL adapt their colors based on the active theme using CSS variables.

#### Scenario: App launches with system preference
- **WHEN** the app launches for the first time
- **THEN** the theme SHALL match the operating system's color scheme preference (dark or light)
- **THEN** all sidebar components, buttons, and text SHALL render with appropriate contrast for the detected theme

#### Scenario: User toggles theme manually
- **WHEN** user clicks the theme toggle button in the left sidebar
- **THEN** the theme SHALL switch between dark and light mode immediately
- **THEN** the user's preference SHALL be persisted to localStorage
- **THEN** on next launch, the persisted preference SHALL override system preference

#### Scenario: System preference changes while app is running
- **WHEN** the OS color scheme changes and the user has not set a manual preference
- **THEN** the app theme SHALL update automatically to match the new system preference

### Requirement: Theme toggle control
The system SHALL provide a theme toggle button in the left sidebar (below the account list, above the add-account button). The button SHALL display a sun icon in dark mode and a moon icon in light mode.

#### Scenario: Theme toggle renders correctly
- **WHEN** the app is in dark mode
- **THEN** the toggle button SHALL display a sun icon (indicating "switch to light")
- **WHEN** the app is in light mode
- **THEN** the toggle button SHALL display a moon icon (indicating "switch to dark")
