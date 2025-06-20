/**
 * Simplified Home page for route creation
 */
import { useState } from 'react';
import { isGoogleMapsEnabled } from '../utils/mapConfig';
import Sidebar from '../components/Sidebar';
import SimpleRouteForm from '../components/SimpleRouteForm';
import RouteEdit from '../components/RouteEdit';
import WorkoutForm from '../components/WorkoutForm';
import WorkoutEdit from '../components/WorkoutEdit';
import SimpleGoogleMap from '../components/SimpleGoogleMap';
import SimpleLeafletMap from '../components/SimpleLeafletMap';
import './SimpleHome.css';

const SimpleHome = () => {
  const [routes, setRoutes] = useState(() => {
    const saved = localStorage.getItem('mapRunnerRoutes');
    const parsedRoutes = saved ? JSON.parse(saved) : [];
    
    // Ensure all routes have workouts array (migration for existing data)
    return parsedRoutes.map(route => ({
      ...route,
      workouts: route.workouts || [],
      coveredDistance: route.coveredDistance || 0
    }));
  });
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState(null);
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);
  const [isEditingWorkout, setIsEditingWorkout] = useState(false);
  const [workoutRouteTarget, setWorkoutRouteTarget] = useState(null);
  const [workoutToEdit, setWorkoutToEdit] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [currentRoute, setCurrentRoute] = useState(null);

  // Save routes to localStorage
  const saveRoutes = (newRoutes) => {
    setRoutes(newRoutes);
    localStorage.setItem('mapRunnerRoutes', JSON.stringify(newRoutes));
  };

  const handleAddRoute = () => {
    setIsCreatingRoute(true);
    setCurrentRoute(null);
  };

  const handleCancelRoute = () => {
    setIsCreatingRoute(false);
    setCurrentRoute(null);
  };

  const handleAcceptRoute = (routeData) => {
    const newRoute = {
      id: Date.now(),
      ...routeData,
      created: new Date()
    };

    const newRoutes = [...routes, newRoute];
    saveRoutes(newRoutes);
    setIsCreatingRoute(false);
    setCurrentRoute(null);
    setSelectedRoute(newRoute);
  };

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    setCurrentRoute(route);
  };

  const handleDeleteRoute = (routeId) => {
    if (confirm('Delete this route?')) {
      const newRoutes = routes.filter(route => route.id !== routeId);
      saveRoutes(newRoutes);
      
      if (selectedRoute && selectedRoute.id === routeId) {
        setSelectedRoute(null);
        setCurrentRoute(null);
      }
    }
  };

  const handleUpdateRouteProgress = (routeId, coveredDistance) => {
    const newRoutes = routes.map(route => 
      route.id === routeId 
        ? { ...route, coveredDistance }
        : route
    );
    saveRoutes(newRoutes);
    
    // Update selected route if it's the one being modified
    if (selectedRoute && selectedRoute.id === routeId) {
      const updatedRoute = { ...selectedRoute, coveredDistance };
      setSelectedRoute(updatedRoute);
      setCurrentRoute(updatedRoute);
    }
  };

  const handleUpdateWorkouts = (routeId, workouts) => {
    const newRoutes = routes.map(route => 
      route.id === routeId 
        ? { ...route, workouts }
        : route
    );
    saveRoutes(newRoutes);
    
    // Update selected route if it's the one being modified
    if (selectedRoute && selectedRoute.id === routeId) {
      const updatedRoute = { ...selectedRoute, workouts };
      setSelectedRoute(updatedRoute);
      setCurrentRoute(updatedRoute);
    }
  };

  const handleAddWorkout = (route) => {
    setWorkoutRouteTarget(route);
    setIsAddingWorkout(true);
  };

  const handleAcceptWorkout = (workout) => {
    if (workoutRouteTarget) {
      const updatedWorkouts = [...(workoutRouteTarget.workouts || []), workout]
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date (oldest first)
      
      // Calculate new total covered distance
      const newTotalCovered = updatedWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
      
      // Update route with both workouts and covered distance
      const newRoutes = routes.map(route => 
        route.id === workoutRouteTarget.id 
          ? { ...route, workouts: updatedWorkouts, coveredDistance: newTotalCovered }
          : route
      );
      saveRoutes(newRoutes);
      
      // Update selected route if it's the one being modified
      if (selectedRoute && selectedRoute.id === workoutRouteTarget.id) {
        const updatedRoute = { ...selectedRoute, workouts: updatedWorkouts, coveredDistance: newTotalCovered };
        setSelectedRoute(updatedRoute);
        setCurrentRoute(updatedRoute);
      }
    }
    setIsAddingWorkout(false);
    setWorkoutRouteTarget(null);
  };

  const handleCancelWorkout = () => {
    setIsAddingWorkout(false);
    setWorkoutRouteTarget(null);
  };

  const handleEditWorkout = (workout, route) => {
    setWorkoutToEdit(workout);
    setWorkoutRouteTarget(route);
    setIsEditingWorkout(true);
  };

  const handleAcceptWorkoutEdit = (updatedWorkout) => {
    if (workoutRouteTarget && workoutToEdit) {
      const updatedWorkouts = workoutRouteTarget.workouts
        .map(w => w.id === workoutToEdit.id ? updatedWorkout : w)
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date (oldest first)
      
      // Calculate new total covered distance
      const newTotalCovered = updatedWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
      
      // Update route with both workouts and covered distance
      const newRoutes = routes.map(route => 
        route.id === workoutRouteTarget.id 
          ? { ...route, workouts: updatedWorkouts, coveredDistance: newTotalCovered }
          : route
      );
      saveRoutes(newRoutes);
      
      // Update selected route if it's the one being modified
      if (selectedRoute && selectedRoute.id === workoutRouteTarget.id) {
        const updatedRoute = { ...selectedRoute, workouts: updatedWorkouts, coveredDistance: newTotalCovered };
        setSelectedRoute(updatedRoute);
        setCurrentRoute(updatedRoute);
      }
    }
    setIsEditingWorkout(false);
    setWorkoutToEdit(null);
    setWorkoutRouteTarget(null);
  };

  const handleCancelWorkoutEdit = () => {
    setIsEditingWorkout(false);
    setWorkoutToEdit(null);
    setWorkoutRouteTarget(null);
  };

  const handleRouteCalculated = (route) => {
    setCurrentRoute(route);
  };

  const handleEditRoute = (route) => {
    setRouteToEdit(route);
    setIsEditingRoute(true);
  };

  const handleAcceptRouteEdit = (updatedRoute) => {
    const newRoutes = routes.map(route => 
      route.id === updatedRoute.id ? updatedRoute : route
    );
    saveRoutes(newRoutes);
    
    // Update selected route if it's the one being edited
    if (selectedRoute && selectedRoute.id === updatedRoute.id) {
      setSelectedRoute(updatedRoute);
      setCurrentRoute(updatedRoute);
    }
    
    setIsEditingRoute(false);
    setRouteToEdit(null);
  };

  const handleCancelRouteEdit = () => {
    setIsEditingRoute(false);
    setRouteToEdit(null);
  };

  // Determine which map component to use
  const MapComponent = isGoogleMapsEnabled() ? SimpleGoogleMap : SimpleLeafletMap;
  const mapProvider = isGoogleMapsEnabled() ? 'Google Maps' : 'OpenStreetMap';

  return (
    <div className="simple-home">
      <Sidebar
        onAddRoute={handleAddRoute}
        routes={routes}
        onRouteSelect={handleRouteSelect}
        selectedRoute={selectedRoute}
        onDeleteRoute={handleDeleteRoute}
        onReorderRoutes={saveRoutes}
        onUpdateRouteProgress={handleUpdateRouteProgress}
        onUpdateWorkouts={handleUpdateWorkouts}
        onAddWorkout={handleAddWorkout}
        onEditWorkout={handleEditWorkout}
        onEditRoute={handleEditRoute}
      />

      <div className="map-area">
        <div className="map-header">
          <h2>Map Runner v2</h2>
          <span className="map-provider">Using {mapProvider}</span>
        </div>
        
        <MapComponent route={currentRoute} />
      </div>

      {isCreatingRoute && (
        <SimpleRouteForm
          onAccept={handleAcceptRoute}
          onCancel={handleCancelRoute}
          onRouteCalculated={handleRouteCalculated}
        />
      )}

      {isAddingWorkout && workoutRouteTarget && (
        <WorkoutForm
          route={workoutRouteTarget}
          onAccept={handleAcceptWorkout}
          onCancel={handleCancelWorkout}
        />
      )}

      {isEditingWorkout && workoutToEdit && workoutRouteTarget && (
        <WorkoutEdit
          workout={workoutToEdit}
          route={workoutRouteTarget}
          onAccept={handleAcceptWorkoutEdit}
          onCancel={handleCancelWorkoutEdit}
        />
      )}

      {isEditingRoute && routeToEdit && (
        <RouteEdit
          route={routeToEdit}
          onAccept={handleAcceptRouteEdit}
          onCancel={handleCancelRouteEdit}
        />
      )}
    </div>
  );
};

export default SimpleHome;
