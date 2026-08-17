import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAppStore } from '../store/useAppStore';
import { resetAllHeroStats } from '../db/hooks/useHeroStats';
import { clearMatchLog } from '../db/hooks/useMatchLog';

export default function SettingsPage() {
  const { alpha, setAlpha, playerCount, setPlayerCount } = useAppStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState('');

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetAllHeroStats();
      await clearMatchLog();
      setToast('✅ Statistics have been reset');
      setConfirmOpen(false);
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setToast(`❌ Error: ${String(err)}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="pb-nav">
      <PageHeader title="Settings" />

      {toast && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-300">
          {toast}
        </div>
      )}

      <div className="px-4 space-y-4">
        {/* Alpha */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-white mb-1">
            α Coefficient (Alpha)
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            Higher value = stronger penalty for frequently played heroes.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              className="flex-1 accent-marvel-red"
            />
            <span className="font-mono text-marvel-gold text-lg w-10 text-right">
              {alpha.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>0.5 (lenient)</span>
            <span>2.0 (strict)</span>
          </div>
        </div>

        {/* Player Count */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Default Player Count</h2>
          <select
            value={playerCount}
            onChange={(e) => setPlayerCount(parseInt(e.target.value, 10))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-marvel-red"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'player (solo)' : 'players'}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 mt-2">
            Number of heroes, villains and henchmen groups are set automatically based on player count.
          </p>
        </div>

        {/* Danger Zone */}
        <div className="bg-zinc-900 rounded-2xl border border-red-900/40 p-4">
          <h2 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h2>
          <p className="text-xs text-zinc-500 mb-3">
            Deleting statistics is irreversible.
          </p>
          <Button
            variant="danger"
            className="w-full"
            onClick={() => setConfirmOpen(true)}
          >
            Reset All Statistics
          </Button>
        </div>
      </div>

      {/* Confirm modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Reset">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-900/20 rounded-xl border border-red-800/40">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">
              All hero statistics and match history will be deleted. This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleReset} loading={resetting}>
              Delete Everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
