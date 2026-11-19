import { render } from '@testing-library/react';
import { AuthContext } from '../contexts/auth.js';

/** Renders a page with a fake session, so tests control what the API returns. */
export function renderWithAuth(ui, { api = {}, ...auth } = {}) {
  return render(<AuthContext.Provider value={{ api, ...auth }}>{ui}</AuthContext.Provider>);
}
