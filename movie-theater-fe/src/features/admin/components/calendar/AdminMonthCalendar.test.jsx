// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminMonthCalendar from './AdminMonthCalendar';

afterEach(() => {
  cleanup();
});

describe('AdminMonthCalendar month selector', () => {
  it('emits one selected year and month through the existing callback', () => {
    const onMonthChange = vi.fn();
    render(
      <AdminMonthCalendar
        year={2026}
        monthIndex={6}
        onMonthChange={onMonthChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Chọn tháng và năm' }));
    fireEvent.click(screen.getByRole('button', { name: '2020' }));
    fireEvent.click(screen.getByRole('button', { name: 'T3' }));

    expect(onMonthChange).toHaveBeenCalledTimes(1);
    expect(onMonthChange).toHaveBeenCalledWith({ year: 2020, monthIndex: 2 });
  });

  it('preserves prior and next month navigation', () => {
    const onMonthChange = vi.fn();
    render(
      <AdminMonthCalendar
        year={2026}
        monthIndex={0}
        onMonthChange={onMonthChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tháng trước' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tháng sau' }));

    expect(onMonthChange).toHaveBeenNthCalledWith(1, { year: 2025, monthIndex: 11 });
    expect(onMonthChange).toHaveBeenNthCalledWith(2, { year: 2026, monthIndex: 1 });
  });

  it('closes the selector with Escape', () => {
    render(<AdminMonthCalendar year={2026} monthIndex={6} />);

    const trigger = screen.getByRole('button', { name: 'Chọn tháng và năm' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Chọn tháng và năm' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Chọn tháng và năm' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
