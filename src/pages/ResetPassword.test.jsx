import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { getSupabase } from '../services/supabase';
import ResetPassword from './ResetPassword';

vi.mock('../services/supabase', () => ({ getSupabase: vi.fn() }));

const updateUser = vi.fn();

beforeEach(() => {
  updateUser.mockReset();
  getSupabase.mockResolvedValue({ auth: { updateUser } });
});

test('updates the password and clears the input after success', async () => {
  updateUser.mockResolvedValue({ error: null });
  render(<MemoryRouter><ResetPassword /></MemoryRouter>);

  await act(async () => {
    userEvent.type(screen.getByLabelText('New password'), 'new-password-123');
    userEvent.click(screen.getByRole('button', { name: 'Update password' }));
  });

  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Password updated.'));
  expect(updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
  expect(screen.getByLabelText('New password')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Update password' })).toBeEnabled();
});

test('shows an update error and allows the user to retry', async () => {
  updateUser.mockResolvedValue({ error: new Error('Reset link has expired.') });
  render(<MemoryRouter><ResetPassword /></MemoryRouter>);

  await act(async () => {
    userEvent.type(screen.getByLabelText('New password'), 'new-password-123');
    userEvent.click(screen.getByRole('button', { name: 'Update password' }));
  });

  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Reset link has expired.'));
  expect(screen.getByLabelText('New password')).toHaveValue('new-password-123');
  expect(screen.getByRole('button', { name: 'Update password' })).toBeEnabled();
});
