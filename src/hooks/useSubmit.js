import { useState } from 'react';

/** Tracks the pending state and error message of an async user action. */
export function useSubmit(action) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function run(...args) {
    setPending(true);
    setError('');
    try {
      await action(...args);
      return true;
    } catch (caught) {
      setError(caught.message);
      return false;
    } finally {
      setPending(false);
    }
  }

  return { run, pending, error, setError };
}
