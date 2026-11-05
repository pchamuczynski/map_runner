import { OVERLAP_POLICIES } from '../domain/overlap';
import './OverlapPolicyPicker.css';

/** Radios for the global overlap choice. No selection means the user has not decided yet. */
const OverlapPolicyPicker = ({ policy, onChange, name = 'overlap-policy' }) => (
  <fieldset className="overlap-policy">
    <legend>Overlapping workouts</legend>
    <p className="field-hint">When an imported workout happens at the same time as one already on a route. This applies to every route.</p>
    {OVERLAP_POLICIES.map((option) => (
      <label key={option.id}>
        <input type="radio" name={name} checked={policy === option.id} onChange={() => onChange(option.id)} />
        {option.label}
      </label>
    ))}
  </fieldset>
);

export default OverlapPolicyPicker;
