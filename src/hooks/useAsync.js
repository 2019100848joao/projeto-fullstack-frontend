import { useCallback, useEffect, useState } from 'react';

/**
 * Runs `load` (memoize it with useCallback) and reruns it when it changes or on `reload()`.
 * Previous data stays available while a new request is in flight.
 */
export function useAsync(load) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    load().then(
      (data) => { if (active) setResult({ load, attempt, data, error: null }); },
      (error) => { if (active) setResult({ load, attempt, data: null, error }); },
    );
    return () => { active = false; };
  }, [load, attempt]);

  const loading = result?.load !== load || result?.attempt !== attempt;
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return {
    data: result?.data ?? null,
    error: loading ? null : result.error,
    loading,
    reload,
  };
}
