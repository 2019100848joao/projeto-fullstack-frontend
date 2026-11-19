import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SlotPicker from './SlotPicker.jsx';

function Harness({ initial = { date: '', time: '' }, onChange = () => {}, ...props }) {
  const [value, setValue] = useState(initial);
  return (
    <SlotPicker
      value={value}
      onChange={(next) => { setValue(next); onChange(next); }}
      {...props}
    />
  );
}

const slotNames = () => screen.queryAllByRole('radio').map((radio) => radio.value);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T12:10:00'));
});

afterEach(() => vi.useRealTimers());

describe('SlotPicker', () => {
  it('asks for a date before showing slots', () => {
    render(<Harness />);

    expect(screen.getByText('Selecione uma data para ver os horários disponíveis.')).toBeInTheDocument();
    expect(slotNames()).toEqual([]);
  });

  it('only offers the remaining business-hour slots of today', () => {
    render(<Harness initial={{ date: '2026-11-19', time: '' }} />);

    expect(slotNames()[0]).toBe('12:30');
    expect(slotNames().at(-1)).toBe('17:30');
    expect(slotNames()).not.toContain('12:00');
  });

  it('hides slots the doctor already has', () => {
    render(<Harness initial={{ date: '2026-11-24', time: '' }} occupied={new Set(['09:00', '14:30'])} />);

    expect(slotNames()).toContain('09:30');
    expect(slotNames()).not.toContain('09:00');
    expect(slotNames()).not.toContain('14:30');
  });

  it('says when the day is full', () => {
    render(<Harness initial={{ date: '2026-11-19', time: '' }} occupied={new Set(['12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'])} />);

    expect(screen.getByText('Não há horários livres nesta data. Escolha outro dia.')).toBeInTheDocument();
  });

  it('shows the blocked reason instead of slots', () => {
    render(<Harness initial={{ date: '2026-11-24', time: '' }} blockedReason="Selecione o médico para ver os horários disponíveis." />);

    expect(screen.getByText('Selecione o médico para ver os horários disponíveis.')).toBeInTheDocument();
    expect(slotNames()).toEqual([]);
  });

  it('selects a slot', async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ date: '2026-11-24', time: '' }} onChange={onChange} />);

    await userEvent.click(screen.getByRole('radio', { name: '10:00' }));

    expect(onChange).toHaveBeenLastCalledWith({ date: '2026-11-24', time: '10:00' });
    expect(screen.getByRole('radio', { name: '10:00' })).toBeChecked();
  });
});
