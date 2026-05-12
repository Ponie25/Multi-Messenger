## MODIFIED Requirements

### Requirement: Sidebar avatar display
The sidebar SHALL display each profile as a 36x36px avatar with the profile name displayed below in a truncated format. The sidebar width remains 72px.

#### Scenario: Profile avatar renders
- **WHEN** a profile is displayed in the sidebar
- **THEN** the avatar is rendered at 36x36px (w-9 h-9)
- **THEN** the avatar shows initials with a subtle background
- **THEN** the profile name is displayed below the avatar in 10px font
- **THEN** names longer than 6 characters are truncated with ellipsis

#### Scenario: Active profile indicator
- **WHEN** a profile is the active profile
- **THEN** the avatar has a ring indicator (ring-2 ring-primary)
- **THEN** the profile name is visible below

#### Scenario: Many profiles fit in sidebar
- **WHEN** multiple profiles exist
- **THEN** each profile takes approximately 56px vertical space (36px avatar + 16px name + 4px gap)
- **THEN** the profile list scrolls if it overflows
