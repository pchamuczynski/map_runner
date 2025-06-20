# Workout Tracking Feature

## Overview
The workout tracking feature allows users to log individual workouts for each route and automatically track their total progress. This feature integrates with the existing route progress system to provide comprehensive fitness tracking.

## Features

### 1. Workout Summary
- **Route Sidebar**: Shows workout count summary (e.g., "3 workouts" or "No workouts yet")
- **Detailed View**: Click on a route to see expandable workout details
- **Statistics**: Total number of workouts and combined distance covered

### 2. Individual Workout Management
- **Add Workout**: Manual entry with date, activity type, and distance
- **Delete Workout**: Remove individual workouts with confirmation
- **Activity Types**: Running, Walking, Cycling, Hiking, Other
- **Date Tracking**: Each workout records the date it was performed

### 3. Progress Integration
- **Automatic Updates**: Adding/removing workouts automatically updates route progress
- **Visual Markers**: Progress markers on map reflect total workout distance
- **Dual Management**: Workouts can be managed individually or via total progress editing

## Usage Instructions

### Creating a Workout
1. Select a route from the sidebar
2. In the route details, click the workout summary to expand
3. Click "Add Workout" button
4. Fill in:
   - **Date**: When the workout was performed
   - **Activity**: Select from dropdown (Running, Walking, etc.)
   - **Distance**: Distance covered in kilometers
5. Click "Save" to add the workout

### Managing Workouts
- **View All**: Workouts are sorted by date (newest first)
- **Delete**: Click the trash icon (🗑️) next to any workout
- **Expand/Collapse**: Click the workout summary to show/hide details

### Progress Tracking
- **Automatic Calculation**: Total covered distance = sum of all workout distances
- **Map Visualization**: Yellow progress marker shows position based on total distance
- **Progress Bar**: Visual representation of completion percentage

## Data Structure

### Route Object
```javascript
{
  id: 'unique-id',
  name: 'Route Name',
  // ... other route properties
  workouts: [
    {
      id: 'workout-id',
      date: '2025-06-20',
      activity: 'Running',
      distance: 5000, // meters
      timestamp: '2025-06-20T10:30:00.000Z'
    }
  ],
  coveredDistance: 5000 // automatically calculated from workouts
}
```

### Workout Object
- **id**: Unique identifier (timestamp-based)
- **date**: Date of workout (YYYY-MM-DD format)
- **activity**: Activity type string
- **distance**: Distance in meters
- **timestamp**: ISO timestamp of when workout was recorded

## Technical Implementation

### Components
- **WorkoutManager.jsx**: Main workout management component
- **WorkoutManager.css**: Styling for workout interface
- **RouteProgress.jsx**: Integrated with workout system for progress updates

### State Management
- Workouts stored in route objects in localStorage
- Real-time updates propagated through React state
- Progress markers automatically recalculated on workout changes

### Integration Points
- **Sidebar**: Shows workout summaries and detailed views
- **SimpleHome**: Manages workout state updates
- **Map Components**: Display progress markers based on workout totals

## Styling
- Expandable interface with smooth transitions
- Form validation and user feedback
- Consistent design with existing application theme
- Responsive layout for different screen sizes

## Future Enhancements
- Import workouts from fitness apps (Garmin, Strava)
- Workout analytics and charts
- Export workout data
- Workout templates and scheduling
- GPS track integration
