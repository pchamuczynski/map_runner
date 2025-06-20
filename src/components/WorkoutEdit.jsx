/**
 * Workout edit dialog component
 */
import { useState } from 'react';
import './WorkoutForm.css'; // Reuse the same styling

const WorkoutEdit = ({ workout, route, onAccept, onCancel }) => {
  const [formData, setFormData] = useState({
    date: workout.date,
    activity: workout.activity,
    distance: (workout.distance / 1000).toString() // Convert to km for editing
  });

  const activityOptions = ['Running', 'Walking', 'Cycling', 'Hiking', 'Other'];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.activity || !formData.distance) {
      alert('Please fill in all fields');
      return;
    }

    const updatedWorkout = {
      ...workout, // Keep original id and timestamp
      date: formData.date,
      activity: formData.activity,
      distance: parseFloat(formData.distance) * 1000 // Convert km to meters
    };

    onAccept(updatedWorkout);
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="workout-form-overlay">
      <div className="workout-form-container">
        <div className="workout-form-header">
          <h3>Edit Workout</h3>
          <span className="route-name">for "{route.name}"</span>
        </div>

        <form onSubmit={handleSubmit} className="workout-form">
          <div className="form-group">
            <label htmlFor="workout-date">Date:</label>
            <input
              id="workout-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="workout-activity">Activity:</label>
            <select
              id="workout-activity"
              value={formData.activity}
              onChange={(e) => setFormData({...formData, activity: e.target.value})}
              required
            >
              <option value="">Select activity</option>
              {activityOptions.map(activity => (
                <option key={activity} value={activity}>{activity}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="workout-distance">Distance (km):</label>
            <input
              id="workout-distance"
              type="number"
              step="0.1"
              min="0"
              value={formData.distance}
              onChange={(e) => setFormData({...formData, distance: e.target.value})}
              placeholder="0.0"
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="accept-btn">Save Changes</button>
            <button type="button" onClick={handleCancel} className="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkoutEdit;
