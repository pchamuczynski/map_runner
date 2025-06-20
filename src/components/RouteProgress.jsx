/**
 * Route progress editor component
 */
import { useState, useEffect } from 'react';
import './RouteProgress.css';

const RouteProgress = ({ route, onUpdateProgress }) => {
  const [coveredDistance, setCoveredDistance] = useState(route.coveredDistance || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const totalDistance = route.distance || 0;
  const progressPercentage = totalDistance > 0 ? Math.min((coveredDistance / totalDistance) * 100, 100) : 0;

  useEffect(() => {
    setCoveredDistance(route.coveredDistance || 0);
  }, [route.coveredDistance]);

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setInputValue((coveredDistance / 1000).toFixed(1)); // Convert to km for editing
  };

  const handleSave = () => {
    const newCoveredDistance = Math.max(0, Math.min(parseFloat(inputValue) * 1000, totalDistance));
    setCoveredDistance(newCoveredDistance);
    onUpdateProgress(route.id, newCoveredDistance);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleQuickProgress = (percentage) => {
    const newCoveredDistance = Math.round((totalDistance * percentage) / 100);
    setCoveredDistance(newCoveredDistance);
    onUpdateProgress(route.id, newCoveredDistance);
  };

  return (
    <div className="route-progress">
      <div className="progress-header">
        <span className="progress-title">Progress</span>
        <button 
          className="edit-progress-btn"
          onClick={handleEdit}
          title="Edit progress"
        >
          ✏️
        </button>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="progress-text">
          {formatDistance(coveredDistance)} / {formatDistance(totalDistance)} ({progressPercentage.toFixed(1)}%)
        </div>
      </div>

      {isEditing && (
        <div className="progress-editor">
          <div className="editor-row">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Distance in km"
              step="0.1"
              min="0"
              max={(totalDistance / 1000).toFixed(1)}
              autoFocus
            />
            <span className="unit">km</span>
            <button onClick={handleSave} className="save-btn">✓</button>
            <button onClick={handleCancel} className="cancel-btn">✕</button>
          </div>
          
          <div className="quick-actions">
            <span className="quick-label">Quick:</span>
            <button onClick={() => handleQuickProgress(0)} className="quick-btn">0%</button>
            <button onClick={() => handleQuickProgress(25)} className="quick-btn">25%</button>
            <button onClick={() => handleQuickProgress(50)} className="quick-btn">50%</button>
            <button onClick={() => handleQuickProgress(75)} className="quick-btn">75%</button>
            <button onClick={() => handleQuickProgress(100)} className="quick-btn">100%</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteProgress;
