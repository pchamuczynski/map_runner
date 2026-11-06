import { useCallback, useMemo, useRef, useState } from 'react';
import { isRouteCompleted } from '../domain/autoImport';
import RouteListItem from './RouteListItem';
import './Sidebar.css';

const DRAG_MIME = 'application/x-map-runner-route';

const RouteSection = ({ title, count, open, onToggle, children }) => (
  <section className="route-section">
    <h3>
      <button type="button" className="route-section-toggle" aria-expanded={open} onClick={onToggle}>
        <span aria-hidden="true">{open ? '▼' : '▶'}</span>
        {title}
        <span className="route-section-count">{count}</span>
      </button>
    </h3>
    {open && children}
  </section>
);

const Sidebar = ({
  routes,
  status,
  selectedRouteId,
  width,
  onWidthChange,
  onClose,
  onSelectRoute,
  onAddRoute,
  onEditRoute,
  onDeleteRoute,
  onMoveRoute,
  onAddWorkout,
  onEditWorkout,
  onDeleteWorkout,
  onDeleteWorkouts,
}) => {
  const [draggedId, setDraggedId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const draggedIdRef = useRef(null);
  const [expandedId, setExpandedId] = useState(null);
  const [activeOpen, setActiveOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  const resizeBy = useCallback((delta) => onWidthChange(widthRef.current + delta), [onWidthChange]);

  const startResize = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = widthRef.current;
    const move = (moveEvent) => onWidthChange(startWidth + moveEvent.clientX - startX);
    const stop = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  };

  const toggleExpanded = useCallback((routeId) => setExpandedId((current) => (current === routeId ? null : routeId)), []);

  const sameSection = useCallback(
    (sourceId, targetId) => {
      const source = routes.find((route) => route.id === sourceId);
      const target = routes.find((route) => route.id === targetId);
      return Boolean(source && target && isRouteCompleted(source) === isRouteCompleted(target));
    },
    [routes],
  );

  const dragHandlers = useMemo(
    () => ({
      onDragStart: (e, routeId) => {
        draggedIdRef.current = routeId;
        setDraggedId(routeId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData(DRAG_MIME, routeId);
      },
      onDragEnd: () => {
        draggedIdRef.current = null;
        setDraggedId(null);
        setDropTargetId(null);
      },
      onDragOver: (e, targetId) => {
        if (!e.dataTransfer.types.includes(DRAG_MIME) || !sameSection(draggedIdRef.current, targetId)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTargetId((current) => (current === targetId ? current : targetId));
      },
      onDrop: (e, targetId) => {
        e.preventDefault();
        const routeId = e.dataTransfer.getData(DRAG_MIME);
        draggedIdRef.current = null;
        setDraggedId(null);
        setDropTargetId(null);
        if (routeId && routeId !== targetId && sameSection(routeId, targetId)) onMoveRoute(routeId, targetId);
      },
    }),
    [onMoveRoute, sameSection],
  );

  const active = routes.filter((route) => !isRouteCompleted(route));
  const completed = routes.filter((route) => isRouteCompleted(route));

  const dropPlacement = (routeId) => {
    if (!draggedId || dropTargetId !== routeId || draggedId === routeId) return null;
    const from = routes.findIndex((route) => route.id === draggedId);
    const to = routes.findIndex((route) => route.id === routeId);
    if (from === -1 || to === -1) return null;
    return from < to ? 'after' : 'before';
  };

  const renderRoutes = (items) => (
    <ul className="routes-list">
      {items.map((route) => (
        <RouteListItem
          key={route.id}
          route={route}
          isSelected={route.id === selectedRouteId}
          isExpanded={route.id === expandedId}
          isDragging={route.id === draggedId}
          dropPlacement={dropPlacement(route.id)}
          onSelect={onSelectRoute}
          onToggleExpanded={toggleExpanded}
          onEdit={onEditRoute}
          onDelete={onDeleteRoute}
          onAddWorkout={onAddWorkout}
          onEditWorkout={onEditWorkout}
          onDeleteWorkout={onDeleteWorkout}
          onDeleteWorkouts={onDeleteWorkouts}
          dragHandlers={dragHandlers}
        />
      ))}
    </ul>
  );

  return (
    <aside className="sidebar" aria-label="Routes">
      <div className="sidebar-header">
        <h2>ROUTES</h2>
        {status === 'loading' && <span className="spinner" aria-label="Loading routes" />}
        <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close routes">
          ×
        </button>
      </div>
      <div className="sidebar-content">
        <button type="button" className="add-route-btn" onClick={onAddRoute} disabled={status !== 'ready'}>
          Add Route
        </button>

        {status === 'ready' && routes.length === 0 && (
          <p className="sidebar-empty">No routes yet. Add one to start your journey.</p>
        )}

        {active.length > 0 && (
          <RouteSection title="Active routes" count={active.length} open={activeOpen} onToggle={() => setActiveOpen((open) => !open)}>
            {renderRoutes(active)}
          </RouteSection>
        )}

        {completed.length > 0 && (
          <RouteSection
            title="Completed routes"
            count={completed.length}
            open={completedOpen}
            onToggle={() => setCompletedOpen((open) => !open)}
          >
            {renderRoutes(completed)}
          </RouteSection>
        )}
      </div>
      <div
        className="sidebar-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize routes panel"
        aria-valuemin={240}
        aria-valuemax={640}
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          resizeBy(event.key === 'ArrowLeft' ? -16 : 16);
        }}
      />
    </aside>
  );
};

export default Sidebar;
