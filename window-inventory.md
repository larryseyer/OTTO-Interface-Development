# OTTO Interface Window/Panel/Dropdown Inventory

## Phase 1: Complete Inventory of UI Windows

### 1. SLIDE-UP PANELS (Full Height)

#### 1.1 Preset Management Panel
- **Element ID:** `preset-panel`
- **CSS Class:** `slide-up-panel full-height-panel`
- **Trigger Button:** `preset-edit-btn`
- **Close Button:** `preset-panel-close`
- **Open Method:** `openPresetModal()`
- **Close Method:** `closePresetModal()`
- **Active State:** `.active` class on panel, `.panel-active` class on button
- **Special Behavior:** 
  - Loads preset list when opened
  - Focuses input field when opened
  - Has additional controls (New, Undo, Reset Default buttons)

#### 1.2 Settings Panel
- **Element ID:** `settings-panel`
- **CSS Class:** `slide-up-panel full-height-panel`
- **Trigger Button:** `settings-btn`
- **Close Button:** `settings-panel-close`
- **Open Method:** Handled via `setupModalWindow()`
- **Active State:** `.active` class on panel, `.panel-active` class on button
- **Special Behavior:** Contains factory reset functionality

#### 1.3 Cloud Storage Panel
- **Element ID:** `cloud-panel`
- **CSS Class:** `slide-up-panel full-height-panel`
- **Trigger Button:** `upload-btn`
- **Close Button:** `cloud-panel-close`
- **Open Method:** `openCloudModal()`
- **Active State:** `.active` class on panel, `.panel-active` class on button

#### 1.4 Link Settings Panel
- **Element ID:** `link-panel`
- **CSS Class:** `slide-up-panel full-height-panel`
- **Trigger Button:** `link-btn`
- **Close Button:** `link-panel-close`
- **Open Method:** `openLinkModal()`
- **Active State:** `.active` class on panel, `.panel-active` class on button

#### 1.5 Store Panel
- **Element ID:** `store-panel`
- **CSS Class:** `slide-up-panel full-height-panel`
- **Trigger Button:** None (opened via logo click)
- **Close Button:** `store-panel-close`
- **Open Method:** Via `setupLogoClick()`
- **Active State:** `.active` class on panel
- **Special Behavior:** Loads iframe with store content

### 2. SLIDE-UP PANELS (Partial Height - rows 4-6)

#### 2.1 Mixer Panel
- **Element ID:** `mixer-panel`
- **CSS Class:** `slide-up-panel partial-height-panel`
- **Trigger Button:** `kit-mixer-btn`
- **Close Button:** `mixer-panel-close`
- **Open Method:** `openMixerModal()`
- **Active State:** `.active` class on panel, `.panel-active` class on button
- **Special Behavior:** Updates kit name in header

#### 2.2 Kit Edit Panel
- **Element ID:** `kit-edit-panel`
- **CSS Class:** `slide-up-panel partial-height-panel`
- **Trigger Button:** `.kit-edit-btn` (multiple buttons)
- **Close Button:** `kit-edit-panel-close`
- **Open Method:** `openKitEditModal()`
- **Active State:** `.active` class on panel, `.panel-active` class on all edit buttons

### 3. SLIDE-OUT PANEL

#### 3.1 Pattern Edit Panel
- **Element ID:** `pattern-edit-panel`
- **CSS Class:** `pattern-edit-panel`
- **Trigger Button:** `.edit-pattern-btn`
- **Close Button:** `pattern-panel-close`
- **Toggle Method:** `togglePatternEditMode()`
- **Active State:** `.active` class on panel and button
- **Special Behavior:**
  - Has edit mode state (`this.isEditMode`)
  - Shows/hides delete button
  - Enables/disables drag-and-drop
  - Loads available patterns
  - Has search functionality

### 4. DROPDOWNS

#### 4.1 Preset Dropdown
- **Element ID:** `preset-dropdown`
- **CSS Class:** `custom-dropdown`
- **Selected Element:** `preset-selected`
- **Options Container:** `preset-options`
- **Toggle Trigger:** Click on selected element
- **Active State:** `.open` class on dropdown
- **Close Behavior:** Click outside to close
- **Special Behavior:** 
  - Dynamically loads presets
  - Updates on preset changes
  - Has lock indicator

#### 4.2 Kit Dropdown
- **Element ID:** `kit-dropdown`
- **CSS Class:** `custom-dropdown kit-dropdown`
- **Selected Element:** `kit-selected`
- **Options Container:** `kit-options`
- **Toggle Trigger:** Click on selected element
- **Active State:** `.open` class on dropdown
- **Close Behavior:** Click outside to close
- **Navigation:** Chevron buttons (`.kit-prev`, `.kit-next`)

#### 4.3 Pattern Group Dropdown
- **Element ID:** `group-dropdown`
- **CSS Class:** `custom-dropdown group-dropdown`
- **Selected Element:** `group-selected`
- **Options Container:** `group-options`
- **Toggle Trigger:** Click on selected element
- **Active State:** `.open` class on dropdown
- **Close Behavior:** Click outside to close
- **Navigation:** Chevron buttons (`.group-prev`, `.group-next`)
- **Special Behavior:** Updates available patterns when changed

### 5. SPECIAL UI ELEMENTS

#### 5.1 Splash Screen
- **Element ID:** `splash-screen`
- **CSS Class:** `splash-screen`
- **Active State:** `.fade-out` class triggers removal
- **Special Behavior:** Auto-fades after 2 seconds

#### 5.2 Mute Overlay
- **CSS Class:** `mute-overlay`
- **Active State:** `.muted` class
- **Special Behavior:** Covers rows 2-5 when player is muted

### STATE TRACKING ISSUES IDENTIFIED

1. **Manual Class Toggling**: All windows use direct DOM manipulation with `classList.add()`, `classList.remove()`, and `classList.toggle()`

2. **Inconsistent Patterns**:
   - Some use `openXModal()` and `closeXModal()` methods
   - Some use `setupModalWindow()` generic handler
   - Pattern edit panel uses `togglePatternEditMode()`
   - Dropdowns have their own separate handling

3. **Button State Sync Issues**:
   - Button active states (`panel-active` class) manually synced
   - Kit edit panel has multiple trigger buttons to manage
   - Risk of orphaned active states when panels close unexpectedly

4. **Event Listener Management**:
   - Multiple separate listener arrays (modalListeners, dropdownListeners, etc.)
   - Click-outside handlers added individually for each dropdown
   - Complex cleanup required in destroy method

5. **No Central State**:
   - Window states scattered across DOM classes
   - No single source of truth for what's open
   - No mutex handling (can open multiple panels simultaneously)

### MUTEX GROUPS

Based on UX best practices, these should be mutually exclusive:

1. **Full-Height Panels**: Only one should be open at a time
   - Preset Management
   - Settings
   - Cloud Storage
   - Link Settings
   - Store

2. **Partial-Height Panels**: Only one should be open at a time
   - Mixer
   - Kit Edit

3. **Dropdowns**: Only one should be open at a time
   - Preset Dropdown
   - Kit Dropdown
   - Pattern Group Dropdown

4. **Pattern Edit Panel**: Can stay open independently (slide-out design)

### KEYBOARD INTERACTIONS

- ESC key handling: Not currently implemented
- TAB navigation: Not currently implemented
- Enter key on dropdowns: Not currently implemented

### ANIMATION/TRANSITION HANDLING

- CSS transitions on `.active` class
- No JavaScript transition end handling
- No prevention of rapid open/close
- No animation queue management

## SUMMARY

**Total Windows/Panels/Dropdowns: 13**
- 5 Full-height panels
- 2 Partial-height panels  
- 1 Slide-out panel
- 3 Dropdowns
- 2 Special overlays

All currently use DOM-based state management with manual class toggling, creating synchronization risks and maintenance challenges. A centralized WindowManager will provide a single source of truth and eliminate these issues.