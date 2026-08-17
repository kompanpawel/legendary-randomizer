import { useState } from 'react';
import { Trophy, X, Zap } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { addMatch } from '../../db/hooks/useMatchLog';
import { upsertHeroStats } from '../../db/hooks/useHeroStats';
import { upsertMastermindStats } from '../../db/hooks/useMastermindStats';
import { upsertSchemeStats } from '../../db/hooks/useSchemeStats';
import type { GameSetup } from '../../store/useAppStore';
import type { RandomizationMode } from '../../types/stats';
interface SaveMatchModalProps {
  open: boolean;
  onClose: () => void;
  setup: GameSetup;
  playerCount: number;
  mode: RandomizationMode;
}
type Step = 1 | 2 | 3;
export function SaveMatchModal({ open, onClose, setup, playerCount, mode }: SaveMatchModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [result, setResult] = useState<'win' | 'loss' | null>(null);
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);
  const reset = () => { setStep(1); setResult(null); setScore(''); setSaving(false); };
  const handleClose = () => { reset(); onClose(); };
  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await addMatch({
        date: new Date().toISOString(),
        result,
        score: score ? parseInt(score, 10) : undefined,
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
    if (gap > 2)   return { text: '\ud83d\udc80 Trudna',      color: 'text-red-400' };
    if (gap > 0.5) return { text: '\u2694\ufe0f Wymagaj\u0105ca', color: 'text-orange-400' };
    if (gap < -2)  return { text: '\ud83d\ude0e \u0141atwa',      color: 'text-green-400' };
    if (gap < -0.5)return { text: '\u2705 Wyrównana+',  color: 'text-blue-400' };
    return           { text: '\u2696\ufe0f Wyrównana',  color: 'text-zinc-300' };
  };
  const balance = balanceLabel();
  return (
    <Modal open={open} onClose={handleClose} title={`Save match \u2013 step ${step}/3`}>
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">How did it go?</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setResult('win'); setStep(2); }}
              className="flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-green-700/50 bg-green-900/20 hover:bg-green-900/40 transition-colors text-green-400">
              <Trophy size={32} /><span className="font-bold text-lg">VICTORY!</span>
            </button>
            <button onClick={() => { setResult('loss'); setStep(2); }}
              className="flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-red-700/50 bg-red-900/20 hover:bg-red-900/40 transition-colors text-red-400">
              <X size={32} /><span className="font-bold text-lg">DEFEAT</span>
            </button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">VP Points (optional)</p>
          <input type="number" min="0" max="999" value={score} onChange={(e) => setScore(e.target.value)}
            placeholder="e.g. 42"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-marvel-red" />
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">Back</Button>
            <Button onClick={() => setStep(3)} className="flex-1">Next</Button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">Summary</p>
          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Result</span>
              <span className={result === 'win' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                {result === 'win' ? '\ud83c\udfc6 Victory' : '\ud83d\udc80 Defeat'}
              </span>
            </div>
            {score && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Score</span>
                <span className="text-white font-mono">{score} VP</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Mastermind</span>
              <span className="text-white flex items-center gap-1">
                {setup.isEpicMastermind && <Zap size={12} className="text-orange-400 fill-current" />}
                {setup.mastermind.name}
                {setup.isEpicMastermind && <span className="text-orange-400 text-xs font-bold">EPIC</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Scheme</span>
              <span className="text-white text-right max-w-[60%]">{setup.scheme.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Heroes</span>
              <span className="text-white text-right max-w-[60%]">{setup.heroes.map((h) => h.name).join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Difficulty</span>
              <span className={balance.color}>{balance.text}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Threat Score</span>
              <span className="text-zinc-300 font-mono">{setup.threatScore.toFixed(1)}/10</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">Back</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">Save</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
