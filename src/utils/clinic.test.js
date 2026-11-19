import { afterEach, describe, expect, it, vi } from 'vitest';
import { daySlots, displayStatus, groupByDay, isOverdue, occupiedSlots, toDateInput } from './clinic.js';

const at = (date, time) => new Date(`${date}T${time}`).toISOString();

afterEach(() => vi.useRealTimers());

describe('daySlots', () => {
  it('covers business hours in 30-minute slots, the last one ending at 18:00', () => {
    expect(daySlots[0]).toBe('07:00');
    expect(daySlots.at(-1)).toBe('17:30');
    expect(daySlots).toHaveLength(22);
    expect(daySlots).not.toContain('18:00');
  });
});

describe('isOverdue / displayStatus', () => {
  it('flags a scheduled appointment whose time has passed', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-19T15:00:00'));

    const past = { status: 'scheduled', scheduled_at: at('2026-11-19', '09:00') };
    const future = { status: 'scheduled', scheduled_at: at('2026-11-20', '09:00') };
    const completed = { status: 'completed', scheduled_at: at('2026-11-19', '09:00') };

    expect(isOverdue(past)).toBe(true);
    expect(displayStatus(past)).toBe('overdue');
    expect(displayStatus(future)).toBe('scheduled');
    expect(displayStatus(completed)).toBe('completed');
  });
});

describe('occupiedSlots', () => {
  const appointments = [
    { id: 'a', status: 'scheduled', scheduled_at: at('2026-11-24', '09:00') },
    { id: 'b', status: 'completed', scheduled_at: at('2026-11-24', '10:30') },
    { id: 'c', status: 'cancelled', scheduled_at: at('2026-11-24', '11:00') },
    { id: 'd', status: 'scheduled', scheduled_at: at('2026-11-25', '09:00') },
  ];

  it('returns taken slots of the date, ignoring cancelled appointments', () => {
    expect([...occupiedSlots(appointments, '2026-11-24')].sort()).toEqual(['09:00', '10:30']);
  });

  it('ignores the appointment being rescheduled', () => {
    expect([...occupiedSlots(appointments, '2026-11-24', 'a')]).toEqual(['10:30']);
  });
});

describe('groupByDay', () => {
  it('groups items by local day, keeping their order', () => {
    const items = [
      { id: 1, when: at('2026-11-24', '09:00') },
      { id: 2, when: at('2026-11-24', '17:30') },
      { id: 3, when: at('2026-11-25', '07:00') },
    ];

    expect(groupByDay(items, (item) => item.when)).toEqual([
      ['2026-11-24', [items[0], items[1]]],
      ['2026-11-25', [items[2]]],
    ]);
  });

  it('formats the local date', () => {
    expect(toDateInput(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
