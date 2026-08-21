import { Skull, Star, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn.ts';
import type { Mastermind } from '@/types/cards.ts';
import type { MastermindStats } from '@/types/stats.ts';
import { blendedStrength } from '@/utils/blendedStrength.ts';

interface MastermindCardProps {
  mastermind: Mastermind;
  stats?: MastermindStats;
  isEpic?: boolean;
  className?: string;
  expansionLabel?: string;
}

export function MastermindCard({ mastermind, stats, isEpic = false, className, expansionLabel }: MastermindCardProps) {
  const { t } = useTranslation();
  // W trybie Epic używamy epickich statystyk i dodajemy +1 do bazy
  const playCount = isEpic ? (stats?.epicPlayCount ?? 0) : (stats?.playCount ?? 0);
  const wins      = isEpic ? (stats?.epicWins ?? 0)      : (stats?.wins ?? 0);
  const epicBonus = isEpic ? 1 : 0;

  const effectiveDifficulty = blendedStrength(mastermind.difficulty, playCount, wins, epicBonus);
  const isStaticDefault = playCount === 0;

  const hasEpicCards = mastermind.cards.some(c => c.isEpic);

  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        isEpic
          ? 'border-orange-700/60 bg-gradient-to-br from-orange-950/60 to-zinc-900/60'
          : 'border-red-900/50 bg-gradient-to-br from-red-950/60 to-zinc-900/60',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-xl border',
          isEpic
            ? 'bg-orange-500/20 border-orange-500/30'
            : 'bg-marvel-red/20 border-marvel-red/30'
        )}>
          <Skull size={18} className={isEpic ? 'text-orange-400' : 'text-marvel-red'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={cn(
              'text-xs font-medium uppercase tracking-wide',
              isEpic ? 'text-orange-400' : 'text-red-400'
            )}>
                {t('cards.mastermind.label')}
            </p>
            {isEpic && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold">
                <Zap size={10} className="fill-current" />
                {t('cards.mastermind.epic')}
              </span>
            )}
            {!isEpic && hasEpicCards && (
              <span className="text-xs text-zinc-600 font-mono">{t('cards.mastermind.epicAvailable')}</span>
            )}
          </div>
          <h3 className="font-bold text-white text-sm">
            {mastermind.name}
            {expansionLabel && (
              <span className="text-zinc-400 font-normal opacity-75"> ({expansionLabel})</span>
            )}
          </h3>
          {mastermind.alwaysLeads && (
            <p className="text-zinc-500 text-xs mt-1 truncate">
              {t('cards.mastermind.alwaysLeads', { name: mastermind.alwaysLeads })}
            </p>
          )}
          {stats && (
            <div className="mt-1 flex gap-3 text-xs text-zinc-500 font-mono flex-wrap">
              <span>▶ {stats.playCount}x</span>
              <span className="text-red-600">{t('cards.mastermind.stats.won')} {stats.wins}</span>
              <span className="text-green-600">{t('cards.mastermind.stats.defeated')} {stats.losses}</span>
              {isEpic && stats.epicPlayCount > 0 && (
                <span className="text-orange-500">{t('cards.mastermind.stats.epic')} {stats.epicPlayCount}x ({stats.epicWins}W/{stats.epicLosses}L)</span>
              )}
            </div>
          )}
        </div>
        <div
          className="flex gap-0.5 flex-shrink-0"
          title={isStaticDefault ? t('cards.mastermind.tooltip.noData') : t('cards.mastermind.tooltip.withData', { value: effectiveDifficulty, epicSuffix: isEpic ? ' (Epic)' : '' })}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={10}
              className={cn(
                i < effectiveDifficulty ? 'fill-current' : 'text-zinc-700 fill-zinc-700',
                i < effectiveDifficulty && isStaticDefault ? 'text-zinc-500' : '',
                i < effectiveDifficulty && !isStaticDefault && isEpic ? 'text-orange-400' : '',
                i < effectiveDifficulty && !isStaticDefault && !isEpic ? 'text-marvel-gold' : ''
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

