import { Scroll, Star, Users, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn.ts';
import type { Scheme } from '@/types/cards.ts';
import type { SchemeStats } from '@/types/stats.ts';
import { computeStrength } from '@/utils/computeStrength.ts';

interface SchemeCardProps {
  scheme: Scheme;
  stats?: SchemeStats;
  className?: string;
  /** Liczba graczy – potrzebna do warunkowego heroCountMod */
  playerCount?: number;
  /** Jeśli podane – wyświetli ile dodatkowych hero zostało faktycznie wylosowanych */
  schemeHeroMod?: number;
}

export function SchemeCard({ scheme, stats, className, playerCount, schemeHeroMod }: SchemeCardProps) {
  const { t } = useTranslation();
  // Dynamiczna trudność: ile razy schemat pokonał graczy; jeśli brak danych – 3 (neutralna)
  const effectiveDifficulty = computeStrength(stats?.playCount ?? 0, stats?.wins ?? 0);
  const isStaticDefault = (stats?.playCount ?? 0) === 0;

  const heroMod = scheme.overrides.heroCountMod ?? 0;
  const modMinPlayers = scheme.overrides.heroCountModMinPlayers ?? 1;
  const isModConditional = modMinPlayers > 1;
  // Jeśli znamy playerCount – sprawdzamy czy mod jest aktywny; inaczej zakładamy aktywny
  const isModActive = schemeHeroMod !== undefined
    ? schemeHeroMod > 0
    : heroMod > 0 && (playerCount === undefined || playerCount >= modMinPlayers);

  const specialSetup = scheme.overrides.specialSetup;

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
          <p className="text-xs text-amber-400 font-medium uppercase tracking-wide mb-0.5">{t('cards.scheme.label')}</p>
          <h3 className="font-bold text-white text-sm leading-snug">{scheme.name}</h3>
          {stats && (
            <div className="mt-1 flex gap-3 text-xs text-zinc-500 font-mono">
              <span>▶ {stats.playCount}x</span>
              <span className="text-red-600">{t('cards.scheme.stats.won')} {stats.wins}</span>
              <span className="text-green-600">{t('cards.scheme.stats.defeated')} {stats.losses}</span>
            </div>
          )}
        </div>
        <div
          className="flex gap-0.5 flex-shrink-0"
          title={isStaticDefault ? t('cards.scheme.tooltip.noData') : t('cards.scheme.tooltip.withData', { value: effectiveDifficulty })}
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

      {/* Extra Hero badge */}
      {heroMod > 0 && (
        <div
          className={cn(
            'mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border',
            isModActive
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
          )}
        >
          <Users size={12} className="flex-shrink-0" />
          <span>
            {isModConditional && !isModActive
              ? t('cards.scheme.extraHeroConditional', { count: heroMod, min: modMinPlayers })
              : heroMod > 1
                ? t('cards.scheme.extraHeroPlural', { count: heroMod })
                : t('cards.scheme.extraHero', { count: heroMod })}
          </span>
        </div>
      )}

      {/* Special setup note */}
      {specialSetup && isModActive && (
        <div className="mt-2 flex items-start gap-2 px-3 py-1.5 rounded-xl text-xs border bg-zinc-800/40 border-zinc-700 text-zinc-400">
          <Info size={12} className="flex-shrink-0 mt-0.5 text-zinc-500" />
          <span>{specialSetup}</span>
        </div>
      )}
    </div>
  );
}
