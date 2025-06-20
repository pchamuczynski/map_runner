import './MapInstructions.css';

const MapInstructions = ({ isVisible, activeField }) => {
  const getInstructionText = () => {
    if (!activeField) {
      return 'Focus on a location field, then click on the map to set its location';
    }
    
    if (activeField === 'from') {
      return 'Click on the map to set your starting location';
    } else if (activeField === 'to') {
      return 'Click on the map to set your destination';
    } else if (activeField.startsWith('stop-')) {
      const stopNumber = parseInt(activeField.split('-')[1]) + 1;
      return `Click on the map to set stop #${stopNumber} location`;
    }
    
    return `Click on the map to set "${activeField}" location`;
  };

  if (!isVisible) return null;

  return (
    <div className="map-instructions">
      <div className="instruction-content">
        <span className="instruction-icon">�️</span>
        <span className="instruction-text">
          {getInstructionText()}
        </span>
        {activeField && (
          <span className="instruction-hint">
            Or type in the location field above
          </span>
        )}
      </div>
    </div>
  );
};

export default MapInstructions;
