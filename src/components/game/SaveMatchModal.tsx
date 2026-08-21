import { useState } from 'react';
import { Trophy, X, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { addMatch } from '@/db/hooks/useMatchLog.ts';
import { upsertHeroStats } from '@/db/hooks/useHeroStats.ts';
import { upsertMastermindStats } from '@/db/hooks/useMastermindStats.ts';
import { upsertSchemeStats } from '@/db/hooks/useSchemeStats.ts';
import type { GameSetup } from '@/store/useAppStore.ts';
import type { RandomizationMode } from '@/types/stats.ts';
interface SaveMatchModalProps {
  open: boolean;
  onClose: () => void;
  setup: GameSetup;
  playerCount: number;
  mode: RandomizationMode;
}
type Step = 1 | 2;
export function SaveMatchModal({ open, onClose, setup, playerCount, mode }: SaveMatchModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);
  const [result, setResult] = useState<'win' | 'loss' | null>(null);
  const [saving, setSaving] = useState(false);
  const reset = () => { setStep(1); setResult(null); setSaving(false); };
  const handleClose = () => { reset(); onClose(); };
  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await addMatch({
        date: new Date().toISOString(),
        result,
        playerCount,
        mastermindId: setup.mastermind.id,
        schemeId: setup.scheme.id,
        heroIds: setup.heroes.map((h) => h.id),
        villainIds: setup.villains.map((v) => v.id),
        henchmanIds: setup.henchmen.map((h) => h.id),
        randomizationMode: mode,
        isEpicMastermind: setup.isEpicMastermind,
        balanceGap: setup.balanceGap,
      });
      await Promise.all(setup.heroes.map((h) => upsertHeroStats(h.id, result === 'win')));
      await upsertMastermindStats(setup.mastermind.id, result === 'win', setup.isEpicMastermind);
      await upsertSchemeStats(setup.scheme.id, result === 'win');
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  const balanceLabel = () => {
    const gap = setup.balanceGap;
    if (gap > 2)   return { text: t('saveMatch.step3.balance.hard'),        color: 'text-red-400' };
    if (gap > 0.5) return { text: t('saveMatch.step3.balance.challenging'), color: 'text-orange-400' };
    if (gap < -2)  return { text: t('saveMatch.step3.balance.easy'),        color: 'text-green-400' };
    if (gap < -0.5)return { text: t('saveMatch.step3.balance.easier'),      color: 'text-blue-400' };
    return           { text: t('saveMatch.step3.balance.balanced'),          color: 'text-zinc-300' };
  };
  const balance = balanceLabel();
  return (
    <Modal open={open} onClose={handleClose} title={t('saveMatch.title', { step })}>
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">{t('saveMatch.step1.question')}</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setResult('win'); setStep(2); }}
              className="flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-green-700/50 bg-green-900/20 hover:bg-green-900/40 transition-colors text-green-400">
              <Trophy size={32} /><span className="font-bold text-lg">{t('saveMatch.step1.victory')}</span>
            </button>
            <button onClick={() => { setResult('loss'); setStep(2); }}
              className="flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-red-700/50 bg-red-900/20 hover:bg-red-900/40 transition-colors text-red-400">
              <X size={32} /><span className="font-bold text-lg">{t('saveMatch.step1.defeat')}</span>
            </button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">{t('saveMatch.step3.summary')}</p>
          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">{t('saveMatch.step3.result')}</span>
              <span className={result === 'win' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                {result === 'win' ? t('saveMatch.step3.win') : t('saveMatch.step3.loss')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">{t('saveMatch.step3.mastermind')}</span>
              <span className="text-white flex items-center gap-1">
                {setup.isEpicMastermind && <Zap size={12} className="text-orange-400 fill-current" />}
                {setup.mastermind.name}
                {setup.isEpicMastermind && <span className="text-orange-400 text-xs font-bold">{t('cards.mastermind.epic')}</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">{t('saveMatch.step3.scheme')}</span>
              <span className="text-white text-right max-w-[60%]">{setup.scheme.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">{t('saveMatch.step3.heroes')}</span>
              <span className="text-white text-right max-w-[60%]">{setup.heroes.map((h) => h.name).join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">{t('saveMatch.step3.difficulty')}</span>
              <span className={balance.color}>{balance.text}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">{t('saveMatch.step3.threatScore')}</span>
              <span className="text-zinc-300 font-mono">{setup.threatScore.toFixed(1)}/10</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">{t('saveMatch.step3.back')}</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{t('saveMatch.step3.save')}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
