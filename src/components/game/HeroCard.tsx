import { RefreshCw, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn.ts';
import type { Hero } from '@/types/cards.ts';
import type { HeroStats } from '@/types/stats.ts';
import { Badge } from '../ui/Badge';
import { computeStrength } from '@/utils/computeStrength.ts';

const classColorMap: Record<string, string> = {
  Covert: 'from-purple-900/50 to-purple-800/20 border-purple-700/50',
  Instinct: 'from-amber-900/50 to-amber-800/20 border-amber-700/50',
  Ranged: 'from-blue-900/50 to-blue-800/20 border-blue-700/50',
  Strength: 'from-red-900/50 to-red-800/20 border-red-700/50',
  Tech: 'from-zinc-800/50 to-zinc-700/20 border-zinc-600/50',
};

const classBadgeColor: Record<string, 'covert' | 'instinct' | 'ranged' | 'strength' | 'tech'> = {
  Covert: 'covert',
  Instinct: 'instinct',
  Ranged: 'ranged',
  Strength: 'strength',
  Tech: 'tech',
};

interface HeroCardProps {
  hero: Hero;
  stats?: HeroStats;
  onReroll?: () => void;
  className?: string;
  /** Opcjonalny etykieta (np. 'Extra') wyświetlana jako badge */
  badge?: string;
  expansionLabel?: string;
}

export function HeroCard({ hero, stats, onReroll, className, badge, expansionLabel }: HeroCardProps) {
  const { t } = useTranslation();
  const primaryClass = hero.primaryClasses[0];
  const gradientClass = primaryClass ? classColorMap[primaryClass] : classColorMap['Tech'];

  // Dynamiczna siła: oparta na statystykach; jeśli brak danych – 3 (neutralna)
  const effectivePowerLevel = computeStrength(stats?.playCount ?? 0, stats?.wins ?? 0);
  const isStaticDefault = (stats?.playCount ?? 0) === 0;

  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-gradient-to-br p-4 transition-all duration-200',
        gradientClass,
        className
      )}
    >
      {/* Reroll button */}
      {onReroll && (
        <button
          onClick={onReroll}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-zinc-400 hover:text-white transition-colors"
          title={t('cards.hero.rerollTitle')}
        >
          <RefreshCw size={14} />
        </button>
      )}

        <div className="pr-8">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-sm leading-tight">{hero.name}</h3>
            {badge && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300">
                {badge}
              </span>
            )}
          </div>
          <p className="text-zinc-400 text-xs mt-0.5">
            {hero.faction}
            {expansionLabel && (
              <span className="text-zinc-500 opacity-80"> ({expansionLabel})</span>
            )}
          </p>
        </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {/* Power level – dynamiczny na podstawie historii rozgrywek */}
        <div className="flex gap-0.5" title={isStaticDefault ? t('cards.hero.tooltip.noData') : t('cards.hero.tooltip.withData', { value: effectivePowerLevel })}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={10}
              className={cn(
                i < effectivePowerLevel ? 'fill-current' : 'text-zinc-700 fill-zinc-700',
                i < effectivePowerLevel && isStaticDefault ? 'text-zinc-500' : '',
                i < effectivePowerLevel && !isStaticDefault ? 'text-marvel-gold' : ''
              )}
            />
          ))}
        </div>

        {/* Class badges */}
        {hero.primaryClasses.slice(0, 2).map((cls) => (
          <Badge key={cls} label={cls} color={classBadgeColor[cls] ?? 'zinc'} />
        ))}
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-2 flex gap-3 text-xs text-zinc-500 font-mono">
          <span>▶ {stats.playCount}x</span>
          <span className="text-green-600">W:{stats.wins}</span>
          <span className="text-red-600">L:{stats.losses}</span>
        </div>
      )}
    </div>
  );
}

