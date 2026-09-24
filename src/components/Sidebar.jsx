import { useCallback, useMemo, useState } from 'react';
import RouteListItem from './RouteListItem';
import './Sidebar.css';

const DRAG_MIME = 'application/x-map-runner-route';

const Sidebar = ({
  routes,
  status,
  selectedRouteId,
  onSelectRoute,
  onAddRoute,
  onEditRoute,
  onDeleteRoute,
  onMoveRoute,
  onAddWorkout,
  onEditWorkout,
  onDeleteWorkout,
}) => {
  const [draggedId, setDraggedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpanded = useCallback((routeId) => setExpandedId((current) => (current === routeId ? null : routeId)), []);

  const dragHandlers = useMemo(
    () => ({
      onDragStart: (e, routeId) => {
        setDraggedId(routeId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData(DRAG_MIME, routeId);
      },
      onDragEnd: () => setDraggedId(null),
      onDragOver: (e) => {
        if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      },
      onDrop: (e, targetId) => {
        e.preventDefault();
        const routeId = e.dataTransfer.getData(DRAG_MIME);
        setDraggedId(null);
        if (routeId && routeId !== targetId) onMoveRoute(routeId, targetId);
      },
    }),
    [onMoveRoute],
  );

  return (
    <aside className="sidebar" aria-label="Routes">
      <div className="sidebar-header">
        <h2>ROUTES</h2>
        {status === 'loading' && <span className="spinner" aria-label="Loading routes" />}
      </div>
      <div className="sidebar-content">
        <button type="button" className="add-route-btn" onClick={onAddRoute} disabled={status !== 'ready'}>
          Add Route
        </button>

        {status === 'ready' && routes.length === 0 && (
          <p className="sidebar-empty">No routes yet. Add one to start your journey.</p>
        )}

        {routes.length > 0 && (
          <ul className="routes-list">
            {routes.map((route) => (
              <RouteListItem
                key={route.id}
                route={route}
                isSelected={route.id === selectedRouteId}
                isExpanded={route.id === expandedId}
                isDragging={route.id === draggedId}
                onSelect={onSelectRoute}
                onToggleExpanded={toggleExpanded}
                onEdit={onEditRoute}
                onDelete={onDeleteRoute}
                onAddWorkout={onAddWorkout}
                onEditWorkout={onEditWorkout}
                onDeleteWorkout={onDeleteWorkout}
                dragHandlers={dragHandlers}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
