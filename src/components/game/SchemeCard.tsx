import { Scroll, Star } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Scheme } from '../../types/cards';
import type { SchemeStats } from '../../types/stats';
import { computeStrength } from '../../utils/computeStrength';

interface SchemeCardProps {
  scheme: Scheme;
  stats?: SchemeStats;
  className?: string;
}

export function SchemeCard({ scheme, stats, className }: SchemeCardProps) {
  // Dynamiczna trudność: ile razy schemat pokonał graczy; jeśli brak danych – 3 (neutralna)
  const effectiveDifficulty = computeStrength(stats?.playCount ?? 0, stats?.wins ?? 0);
  const isStaticDefault = (stats?.playCount ?? 0) === 0;

  return (
    <div
      className={cn(
        'rounded-2xl border border-amber-900/50 bg-gradient-to-br from-amber-950/40 to-zinc-900/60 p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
          <Scroll size={18} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-400 font-medium uppercase tracking-wide mb-0.5">Schemat</p>
          <h3 className="font-bold text-white text-sm leading-snug">{scheme.name}</h3>
          {stats && (
            <div className="mt-1 flex gap-3 text-xs text-zinc-500 font-mono">
              <span>▶ {stats.playCount}x</span>
              <span className="text-red-600">Wygrał: {stats.wins}</span>
              <span className="text-green-600">Pokonany: {stats.losses}</span>
            </div>
          )}
        </div>
        <div
          className="flex gap-0.5 flex-shrink-0"
          title={isStaticDefault ? 'Brak danych – wartość neutralna' : `Trudność: ${effectiveDifficulty}/5`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={10}
              className={cn(
                i < effectiveDifficulty ? 'fill-current' : 'text-zinc-700 fill-zinc-700',
                i < effectiveDifficulty && isStaticDefault ? 'text-zinc-500' : '',
                i < effectiveDifficulty && !isStaticDefault ? 'text-marvel-gold' : ''
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

