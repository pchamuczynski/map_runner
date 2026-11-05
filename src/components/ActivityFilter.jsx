import ActivityIcon from './ActivityIcon';
import './ActivityFilter.css';

/** Checkboxes that narrow an imported workout list to the chosen activity types. */
const ActivityFilter = ({ types, selected, onToggle }) => {
  if (types.length === 0) return null;

  return (
    <div className="activity-filter" role="group" aria-label="Filter by activity type">
      <span className="activity-filter-label">Activity</span>
      {types.map((activity) => (
        <label key={activity}>
          <input type="checkbox" checked={selected.has(activity)} onChange={() => onToggle(activity)} />
          <ActivityIcon activity={activity} size={14} />
          {activity}
        </label>
      ))}
    </div>
  );
};

export default ActivityFilter;
