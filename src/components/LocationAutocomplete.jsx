import { useId, useState } from 'react';
import { usePlaceSuggestions } from '../hooks/usePlaceSuggestions';
import './LocationAutocomplete.css';

const LocationAutocomplete = ({ label, value, onChange, placeholder, maxLength, required = false, error }) => {
  const id = useId();
  const listId = `${id}-suggestions`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // The value last picked from the list; don't search again for text we just filled in.
  const [pickedValue, setPickedValue] = useState(value);

  const { suggestions, isLoading } = usePlaceSuggestions(value, { enabled: value !== pickedValue });
  const showList = isOpen && suggestions.length > 0 && value !== pickedValue;

  const pick = (suggestion) => {
    setPickedValue(suggestion.description);
    onChange(suggestion.description);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showList) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        break;
      case 'Enter':
        if (activeIndex >= 0) {
          e.preventDefault();
          pick(suggestions[activeIndex]);
        }
        break;
      case 'Escape':
        e.stopPropagation();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="location-autocomplete">
      <label htmlFor={id}>{label}</label>
      <div className="input-container">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          required={required}
          className={showList ? 'has-suggestions' : ''}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
        />

        {isLoading && (
          <div className="input-spinner" aria-hidden="true">
            <div className="spinner" />
          </div>
        )}

        {showList && (
          <ul className="suggestions-dropdown" id={listId} role="listbox">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`suggestion-item ${index === activeIndex ? 'selected' : ''}`}
                // mousedown fires before the input's blur, so the click is not lost
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(suggestion);
                }}
              >
                <div className="suggestion-main">{suggestion.mainText}</div>
                {suggestion.secondaryText && <div className="suggestion-secondary">{suggestion.secondaryText}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
};

export default LocationAutocomplete;
