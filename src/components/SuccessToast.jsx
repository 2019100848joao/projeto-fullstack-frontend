import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

export default function SuccessToast({ message, variant = 'document' }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className={`success-toast success-toast--${variant}`} role="status" aria-live="polite">
      <Check size={18} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
