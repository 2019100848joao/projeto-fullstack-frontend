import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import Register from './Register.jsx';

async function fill({ name = 'Ana Paciente', email = 'ana@example.com', password = 'senhaSegura1', confirmation = password } = {}) {
  await userEvent.type(screen.getByLabelText('Nome completo'), name);
  await userEvent.type(screen.getByLabelText('E-mail'), email);
  await userEvent.type(screen.getByLabelText('Senha'), password);
  await userEvent.type(screen.getByLabelText('Confirmar senha'), confirmation);
  await userEvent.click(screen.getByRole('button', { name: /Criar conta/ }));
}

describe('Register', () => {
  it('rejects passwords that do not match', async () => {
    const signUp = vi.fn();
    renderWithAuth(<Register onLogin={vi.fn()} />, { signUp });

    await fill({ confirmation: 'outraSenha123' });

    expect(screen.getByRole('alert')).toHaveTextContent('As senhas não conferem.');
    expect(signUp).not.toHaveBeenCalled();
  });

  it('signs up a patient with trimmed data', async () => {
    const signUp = vi.fn().mockResolvedValue();
    renderWithAuth(<Register onLogin={vi.fn()} />, { signUp });

    await fill({ name: '  Ana Paciente  ', email: 'ana@example.com' });

    expect(signUp).toHaveBeenCalledWith({ fullName: 'Ana Paciente', email: 'ana@example.com', password: 'senhaSegura1' });
  });

  it('shows the API error and lets the user try again', async () => {
    const signUp = vi.fn().mockRejectedValue(new Error('Este e-mail já está cadastrado. Entre com sua conta.'));
    renderWithAuth(<Register onLogin={vi.fn()} />, { signUp });

    await fill();

    expect(await screen.findByRole('alert')).toHaveTextContent('Este e-mail já está cadastrado');
    expect(screen.getByRole('button', { name: /Criar conta/ })).toBeEnabled();
  });
});
