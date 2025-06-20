<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Map Runner v2 - Copilot Instructions

This is a React web application for fitness route tracking with map visualization. 

## Project Overview
- **Frontend**: React with Vite
- **Maps**: Leaflet with react-leaflet
- **Routing**: React Router DOM
- **Purpose**: Visualize running and workout progress by showing distance traveled on virtual routes (e.g., Warsaw to Barcelona)

## Key Features
- Route creation and management
- Map visualization with progress tracking
- Workout logging and distance tracking
- User authentication (Google OAuth planned)
- Integration with fitness apps (Garmin Connect, Strava planned)

## Code Style Guidelines
- Use functional components with hooks
- Follow modern React patterns
- Keep components small and focused
- Use semantic HTML and accessible design
- Implement responsive design for desktop-first, mobile-ready approach

## Architecture
- `/src/components` - Reusable UI components
- `/src/pages` - Main application pages
- `/src/hooks` - Custom React hooks
- `/src/utils` - Utility functions
- `/src/services` - API and external service integrations
