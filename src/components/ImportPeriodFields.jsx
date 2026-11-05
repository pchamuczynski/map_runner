import { todayLocalIsoDate } from '../lib/format';
import './ImportPeriodFields.css';

/** From / To dates for a history import. Today sets the end date to the local calendar day. */
const ImportPeriodFields = ({ from, to, onFrom, onTo }) => {
  const today = todayLocalIsoDate();

  return (
    <div className="import-period-dates">
      <label>
        From
        <input type="date" value={from} max={to || today} onChange={(event) => onFrom(event.target.value)} />
      </label>
      <div className="import-date-to">
        <label>
          To
          <input type="date" value={to} min={from} max={today} onChange={(event) => onTo(event.target.value)} />
        </label>
        <button type="button" className="today-btn" onClick={() => onTo(today)} disabled={to === today}>
          Today
        </button>
      </div>
    </div>
  );
};

export default ImportPeriodFields;
