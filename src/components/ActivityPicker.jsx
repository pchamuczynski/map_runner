import ActivityIcon from './ActivityIcon';
import './ActivityPicker.css';

/** Grid of checkable activities, each with its pictogram. */
const ActivityPicker = ({ label, options, selected, onToggle, invalid = false }) => (
  <div className="activity-picker" role="group" aria-label={label} aria-invalid={invalid || undefined}>
    {options.map((activity) => (
      <label key={activity} className="activity-option">
        <input type="checkbox" checked={selected.includes(activity)} onChange={(e) => onToggle(activity, e.target.checked)} />
        <ActivityIcon activity={activity} size={18} />
        {activity}
      </label>
    ))}
  </div>
);

export default ActivityPicker;
