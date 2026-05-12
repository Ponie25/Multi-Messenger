## ADDED Requirements

### Requirement: Binary tree split structure
The system SHALL store pane layout as a binary tree where each node is either a leaf (containing a paneId) or a branch (containing a split direction, ratio, and two children). The maximum number of leaf nodes per profile SHALL be 4.

#### Scenario: Single pane (no splits)
- **WHEN** a profile has one pane
- **THEN** the split tree is a single leaf node with that pane's ID
- **THEN** the pane fills the entire content area

#### Scenario: First split creates a branch
- **WHEN** user splits a pane choosing horizontal direction
- **THEN** the leaf node becomes a branch with direction "horizontal", ratio 0.5
- **THEN** the branch has two leaf children: original pane (left) and new pane (right)
- **THEN** both panes are visible side by side with equal width

#### Scenario: Nested split creates deeper tree
- **WHEN** user splits a pane that is already one side of an existing split
- **THEN** that leaf becomes a branch with the chosen direction and ratio 0.5
- **THEN** the tree depth increases by 1
- **THEN** all panes render correctly according to the tree structure

#### Scenario: Max panes reached
- **WHEN** a profile already has 4 panes (4 leaf nodes)
- **THEN** the split button is disabled on all address bars
- **THEN** a tooltip shows "Maximum panes reached"

### Requirement: Split direction selection
The system SHALL allow users to choose between horizontal (left-right) and vertical (top-bottom) split direction when splitting a pane. The split button on the address bar SHALL show a dropdown with both options.

#### Scenario: User splits horizontally
- **WHEN** user clicks split button and selects "Split Right"
- **THEN** the pane splits into left and right halves
- **THEN** the new pane appears on the right

#### Scenario: User splits vertically
- **WHEN** user clicks split button and selects "Split Down"
- **THEN** the pane splits into top and bottom halves
- **THEN** the new pane appears on the bottom

### Requirement: Pane resize via drag
The system SHALL render a 4px draggable divider between adjacent panes. Dragging the divider SHALL update the split ratio of the parent branch node in real-time.

#### Scenario: User resizes horizontal split
- **WHEN** user drags the vertical divider between two horizontally-split panes
- **THEN** the ratio updates continuously as the user drags
- **THEN** both panes resize in real-time
- **THEN** minimum pane width is 200px

#### Scenario: User resizes vertical split
- **WHEN** user drags the horizontal divider between two vertically-split panes
- **THEN** the ratio updates continuously as the user drags
- **THEN** both panes resize in real-time
- **THEN** minimum pane height is 150px

#### Scenario: Resize respects minimum size
- **WHEN** user drags a divider past the minimum size threshold
- **THEN** the divider stops at the minimum size boundary
- **THEN** the pane does not shrink below minimum

### Requirement: Drag-and-drop pane swap
The system SHALL allow users to swap the positions of two panes by dragging from a drag handle on the address bar and dropping onto another pane.

#### Scenario: User swaps two panes
- **WHEN** user drags the drag handle (⋮⋮) from pane A's address bar
- **THEN** a drag preview is shown
- **WHEN** user drops onto pane B's content area
- **THEN** pane A appears where pane B was and vice versa
- **THEN** the tree structure (directions, ratios) remains unchanged
- **THEN** only the paneId values in the leaf nodes are swapped

#### Scenario: User drops on same pane
- **WHEN** user drags and drops back onto the same pane
- **THEN** nothing changes (no-op)

#### Scenario: Drop target highlight
- **WHEN** user is dragging a pane and hovers over another pane
- **THEN** the target pane shows a blue highlight overlay
- **WHEN** user moves away from the target
- **THEN** the highlight disappears

### Requirement: Close individual pane
The system SHALL allow users to close any pane when more than one pane exists. Closing a pane SHALL remove its leaf node and collapse the parent branch.

#### Scenario: Close one of two panes
- **WHEN** user closes pane B in a branch with children [A, B]
- **THEN** pane B's WebContentsView is destroyed
- **THEN** the branch node is replaced by leaf A (tree collapses)
- **THEN** pane A expands to fill the space

#### Scenario: Close pane in nested tree
- **WHEN** user closes a pane that is a leaf in a nested branch
- **THEN** the sibling leaf replaces the parent branch
- **THEN** the tree restructures correctly
- **THEN** all remaining panes resize to fill available space

#### Scenario: Last pane cannot be closed
- **WHEN** only one pane exists (tree is a single leaf)
- **THEN** the close button is not shown on the address bar

### Requirement: Bounds calculation from tree
The system SHALL calculate WebContentsView bounds by recursively traversing the split tree, dividing the available rectangle according to each branch's direction and ratio.

#### Scenario: Bounds update on window resize
- **WHEN** the window is resized
- **THEN** all pane bounds are recalculated from the tree
- **THEN** each pane's WebContentsView.setBounds is called with the new rect

#### Scenario: Bounds respect toolbar and sidebar
- **WHEN** bounds are calculated
- **THEN** the root rect starts at x=SIDEBAR_WIDTH, y=TOOLBAR_HEIGHT
- **THEN** the root rect width = windowWidth - SIDEBAR_WIDTH
- **THEN** the root rect height = windowHeight - TOOLBAR_HEIGHT
