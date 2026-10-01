import { Clock, Swords, Trophy, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import type { RecentMatchViewModel } from './types';

interface RecentMatchCardProps {
  match: RecentMatchViewModel;
}

function toPercent(wins: number, losses: number): number {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}

export function calculatePlayerWinRate(stats?: { wins: number; losses: number }): number | undefined {
  if (!stats) return undefined;
  return toPercent(stats.losses, stats.wins);
}

function valueColorStyle(
  value: number,
  min: number,
  max: number,
  startHue: number,
  endHue: number,
  midHue?: number,
  midValue?: number,
) {
  const clamped = Math.min(max, Math.max(min, value));
  const midPoint = midValue ?? (min + max) / 2;

  const stops = midHue !== undefined
    ? [
        { value: min, hue: startHue },
        { value: midPoint, hue: midHue },
        { value: max, hue: endHue },
      ]
    : [
        { value: min, hue: startHue },
        { value: max, hue: endHue },
      ];

  let currentStop = stops[0];
  let nextStop = stops[stops.length - 1];

  for (let index = 1; index < stops.length; index += 1) {
    const stop = stops[index];
    if (clamped <= stop.value) {
      currentStop = stops[index - 1];
      nextStop = stop;
      break;
    }
  }

  const span = nextStop.value - currentStop.value || 1;
  const ratio = (clamped - currentStop.value) / span;
  const hue = currentStop.hue + (nextStop.hue - currentStop.hue) * ratio;

  return {
    color: `hsl(${hue} 80% 58%)`,
    fontWeight: 600,
  } as const;
}

function getBalanceTone(t: (key: string) => string, gap?: number) {
  if (gap === undefined) {
    return { label: '—', className: 'text-zinc-400' };
  }
  if (gap > 2) return { label: t('stats.recentCarousel.balance.hard'), className: 'text-red-400' };
  if (gap > 0.5) return { label: t('stats.recentCarousel.balance.challenging'), className: 'text-orange-400' };
  if (gap < -2) return { label: t('stats.recentCarousel.balance.easy'), className: 'text-green-400' };
  if (gap < -0.5) return { label: t('stats.recentCarousel.balance.easier'), className: 'text-blue-400' };
  return { label: t('stats.recentCarousel.balance.balanced'), className: 'text-zinc-300' };
}

function formatModeLabel(t: (key: string) => string, mode: RecentMatchViewModel['randomizationMode']): string {
  return t(`stats.recentCarousel.mode.${mode}`);
}

export function RecentMatchCard({ match }: RecentMatchCardProps) {
  const { t, i18n } = useTranslation();
  const dateLabel = new Date(match.date).toLocaleDateString(i18n.language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const balance = getBalanceTone(t, match.balanceGap);
  const mastermindStats = match.mastermind.stats;
  const schemeStats = match.scheme.stats;
  const heroWinRate = match.heroAverageWinRate !== undefined ? `${match.heroAverageWinRate}%` : '—';
  const heroWinRateStyle = match.heroAverageWinRate !== undefined
    ? valueColorStyle(match.heroAverageWinRate, 0, 100, 0, 120)
    : undefined;
  const schemeWinRate = schemeStats ? calculatePlayerWinRate(schemeStats) : undefined;
  const schemeWinRateStyle = schemeWinRate !== undefined ? valueColorStyle(schemeWinRate, 0, 100, 0, 120) : undefined;
  const threatScoreStyle = match.threatScore !== undefined ? valueColorStyle(match.threatScore, 0, 10, 220, 0, 120, 5) : undefined;

  return (
    <article className="w-full bg-zinc-800/40 rounded-2xl border border-zinc-700/50 p-4 space-y-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                match.result === 'win' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
              }`}
            >
              {match.result === 'win' ? <Trophy size={14} /> : <X size={14} />}
            </div>
            <span className={match.result === 'win' ? 'text-green-300 font-semibold' : 'text-red-300 font-semibold'}>
              {match.result === 'win' ? t('stats.recentCarousel.result.win') : t('stats.recentCarousel.result.loss')}
            </span>
            {match.isEpicMastermind && (
              <Badge label={`⚡ ${t('stats.recentCarousel.meta.epic')}`} color="gold" />
            )}
          </div>
          <Badge label={formatModeLabel(t, match.randomizationMode)} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {dateLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={11} />
            {t('stats.recentCarousel.meta.players', { count: match.playerCount })}
          </span>
          {match.score !== undefined && <span className="text-marvel-gold font-mono">{match.score} VP</span>}
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-700/50">
          <p className="text-xs text-zinc-500">{t('stats.recentCarousel.sections.mastermind')}</p>
          <p className="text-sm text-white mt-1">{match.mastermind.name}</p>
          {match.mastermind.expansionName && (
            <p className="text-xs text-zinc-500 mt-1">{match.mastermind.expansionName}</p>
          )}
          {mastermindStats && (
            <p className="text-xs text-zinc-400 mt-1">
              Record: <span className="text-green-500 font-semibold">{mastermindStats.wins}W</span>
              {' / '}
              <span className="text-red-500 font-semibold">{mastermindStats.losses}L</span>
              {' '}({mastermindStats.playCount})
            </p>
          )}
        </div>
        <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-700/50">
          <p className="text-xs text-zinc-500">{t('stats.recentCarousel.sections.scheme')}</p>
          <p className="text-sm text-white mt-1">{match.scheme.name}</p>
          {match.scheme.expansionName && (
            <p className="text-xs text-zinc-500 mt-1">{match.scheme.expansionName}</p>
          )}
          {schemeStats && (
            <p className="text-xs text-zinc-400 mt-1">
              Player WR:               <span style={schemeWinRateStyle ?? {}}>{schemeWinRate ?? 0}%</span>
              {' '}({schemeStats.playCount})
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs text-zinc-500 mb-2">{t('stats.recentCarousel.sections.villains')}</p>
          <div className="space-y-1.5">
            {match.villains.map((villain) => (
              <div key={villain.id} className="flex items-center justify-between gap-3 text-xs bg-zinc-900/40 border border-zinc-700/40 rounded-lg px-2 py-1">
                <span className="text-zinc-200 truncate">{villain.name}</span>
                <span className="text-zinc-500 text-right">{villain.expansionName ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-2">{t('stats.recentCarousel.sections.henchmen')}</p>
          <div className="space-y-1.5">
            {match.henchmen.map((henchman) => (
              <div key={henchman.id} className="flex items-center justify-between gap-3 text-xs bg-zinc-900/40 border border-zinc-700/40 rounded-lg px-2 py-1">
                <span className="text-zinc-200 truncate">{henchman.name}</span>
                <span className="text-zinc-500 text-right">{henchman.expansionName ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-2">{t('stats.recentCarousel.sections.heroes')}</p>
          <div className="space-y-1.5">
            {match.heroes.map((hero) => (
              <div key={hero.id} className="flex items-center justify-between gap-3 text-xs bg-zinc-900/40 border border-zinc-700/40 rounded-lg px-2 py-1">
                <div className="min-w-0">
                  <span className="text-zinc-200 truncate block">{hero.name}</span>
                  {hero.expansionName && <span className="text-zinc-500 block">{hero.expansionName}</span>}
                </div>
                <span className="text-zinc-400 font-mono">
                  {hero.stats ? (
                    <>
                      <span className="text-green-500">{hero.stats.wins}W</span>
                      <span className="text-zinc-500">/</span>
                      <span className="text-red-500">{hero.stats.losses}L</span>
                    </>
                  ) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="bg-zinc-900/60 rounded-xl p-2 border border-zinc-700/50">
          <p className="text-zinc-500">{t('stats.recentCarousel.metrics.threatScore')}</p>
          <p className="mt-1 font-mono" style={threatScoreStyle ?? { color: '#e4e4e7' }}>
            {match.threatScore !== undefined ? `${match.threatScore.toFixed(1)}/10` : '—'}
          </p>
        </div>
        <div className="bg-zinc-900/60 rounded-xl p-2 border border-zinc-700/50">
          <p className="text-zinc-500">{t('stats.recentCarousel.metrics.balance')}</p>
          <p className={`mt-1 ${balance.className}`}>{balance.label}</p>
        </div>
        <div className="bg-zinc-900/60 rounded-xl p-2 border border-zinc-700/50">
          <p className="text-zinc-500">{t('stats.recentCarousel.entityStats.heroAvgWinRate')}</p>
          <p className="mt-1 font-mono" style={heroWinRateStyle ?? { color: '#e4e4e7' }}>{heroWinRate}</p>
        </div>
        <div className="bg-zinc-900/60 rounded-xl p-2 border border-zinc-700/50">
          <p className="text-zinc-500">{t('stats.recentCarousel.metrics.players')}</p>
          <p className="text-zinc-200 mt-1 inline-flex items-center gap-1">
            <Swords size={11} />
            {match.playerCount}
          </p>
        </div>
      </section>
    </article>
  );
}
