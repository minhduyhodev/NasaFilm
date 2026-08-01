// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';

const mockUseAuthContext = vi.fn();

vi.mock('../../features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderPage = () => render(
  <MemoryRouter initialEntries={['/unknown-page']}>
    <NotFoundPage />
    <LocationDisplay />
  </MemoryRouter>,
);

afterEach(() => {
  cleanup();
  mockUseAuthContext.mockReset();
});

describe('NotFoundPage', () => {
  it('shows a Vietnamese 404 message and sends customers to the homepage', () => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    renderPage();

    expect(screen.getByText('404 - KHÔNG TÌM THẤY TRANG')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Trang Không Tồn Tại' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Về Trang Chủ' }));
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it('sends staff users to their permitted admin landing page', () => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      user: {
        roles: ['staff'],
        permissions: ['COUNTER_BOOKING_CREATE'],
      },
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Về Cổng Quản Trị' }));
    expect(screen.getByTestId('location').textContent).toBe('/admin/pos');
  });
});
