import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './Button';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) console.log('SW registered');
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-zinc-800 border border-zinc-600 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3">
      <p className="text-sm text-white">🔄 New version available</p>
      <Button size="sm" onClick={() => updateServiceWorker(true)}>
        Update
      </Button>
    </div>
  );
}
