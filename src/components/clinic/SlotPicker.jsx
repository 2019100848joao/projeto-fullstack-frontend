import { useId } from 'react';
import { daySlots, isPast, toDateInput } from '../../utils/clinic.js';

const periods = [
  { label: 'Manhã', from: '00:00', to: '12:00' },
  { label: 'Tarde', from: '12:00', to: '24:00' },
];

const noSlots = new Set();

/**
 * Date plus a 30-minute slot within business hours. Only slots still ahead and not in
 * `occupied` are offered. `blockedReason` replaces the slots while they cannot be known yet.
 */
function SlotPicker({ value, onChange, occupied = noSlots, blockedReason }) {
  const id = useId();
  const today = toDateInput(new Date());
  const available = value.date && !blockedReason
    ? daySlots.filter((slot) => !isPast(value.date, slot) && !occupied.has(slot))
    : [];
  const groups = periods
    .map((period) => ({ ...period, slots: available.filter((slot) => slot >= period.from && slot < period.to) }))
    .filter((period) => period.slots.length > 0);

  function changeDate(date) {
    // Drop a selected time that no longer exists on the new date (e.g. it already passed today).
    const time = date && value.time && !isPast(date, value.time) ? value.time : '';
    onChange({ date, time });
  }

  return (
    <div className="slot-picker">
      <div className="clinic-field">
        <label htmlFor={`${id}-date`}>Data</label>
        <input id={`${id}-date`} type="date" required min={today} value={value.date} onChange={(event) => changeDate(event.target.value)} />
      </div>

      <fieldset className="slot-fieldset">
        <legend>Horário</legend>
        {blockedReason ? (
          <p className="clinic-field-hint">{blockedReason}</p>
        ) : !value.date ? (
          <p className="clinic-field-hint">Selecione uma data para ver os horários disponíveis.</p>
        ) : groups.length === 0 ? (
          <p className="clinic-field-hint">Não há horários livres nesta data. Escolha outro dia.</p>
        ) : (
          groups.map((period) => (
            <div key={period.label} className="slot-period" role="group" aria-labelledby={`${id}-${period.label}`}>
              <span id={`${id}-${period.label}`} className="slot-period-label">{period.label}</span>
              <div className="slot-grid">
                {period.slots.map((slot) => (
                  <label key={slot} className="slot-option">
                    <input
                      type="radio"
                      name={`${id}-time`}
                      value={slot}
                      required
                      checked={value.time === slot}
                      onChange={() => onChange({ ...value, time: slot })}
                    />
                    <span>{slot}</span>
                  </label>
                ))}
              </div>
            </div>
          ))
        )}
      </fieldset>
    </div>
  );
}

export default SlotPicker;
