# Route Editing Feature

## Overview
Added route editing functionality to allow users to modify existing routes.

## Implementation

### Components Added
- **RouteEdit.jsx**: Dialog component for editing routes (similar to SimpleRouteForm)

### Components Modified
- **Sidebar.jsx**: Added edit button (✏️) next to route names
- **SimpleHome.jsx**: Added route editing state management and handlers
- **Sidebar.css**: Added styling for route name section and edit button
- **SimpleRouteForm.css**: Added styling for route edit warning message

### Features
1. **Edit Button**: Small pencil icon (✏️) next to route name in sidebar
2. **Smart Route Recalculation**: Only recalculates route if start/end points change
3. **Warning Message**: Shows warning when route endpoints change (affects progress tracking)
4. **Data Preservation**: Maintains workouts, progress, and other route data when editing
5. **Form Validation**: Ensures required fields are filled and route calculation completes

### User Experience
- Click edit button (✏️) next to any route name
- Edit route name, locations, or activities
- Route automatically recalculates if start/end points change
- Warning shown if route changes will affect progress tracking
- Save changes or cancel to return to original route

### Technical Details
- Uses existing LocationAutocomplete components
- Reuses SimpleRouteForm.css styling
- Maintains original route ID and associated data
- Updates both routes list and selected route if currently viewing
- Preserves workout history and covered distance

## Usage
1. Create a route
2. Click the ✏️ edit button next to the route name
3. Modify route details as needed
4. Click "Save Changes" to apply or "Cancel" to discard
