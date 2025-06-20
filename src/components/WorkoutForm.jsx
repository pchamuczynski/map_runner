/**
 * Separate workout form dialog component
 */
import { useState } from 'react';
import './WorkoutForm.css';

const WorkoutForm = ({ route, onAccept, onCancel }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    activity: '',
    distance: ''
  });

  const activityOptions = ['Running', 'Walking', 'Cycling', 'Hiking', 'Other'];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.activity || !formData.distance) {
      alert('Please fill in all fields');
      return;
    }

    const workout = {
      id: Date.now().toString(),
      date: formData.date,
      activity: formData.activity,
      distance: parseFloat(formData.distance) * 1000, // Convert km to meters
      timestamp: new Date().toISOString()
    };

    onAccept(workout);
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="workout-form-overlay">
      <div className="workout-form-container">
        <div className="workout-form-header">
          <h3>Add Workout</h3>
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
            <button type="submit" className="accept-btn">Add Workout</button>
            <button type="button" onClick={handleCancel} className="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkoutForm;
