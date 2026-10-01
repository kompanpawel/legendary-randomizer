import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/layout/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { RecentMatchesCarousel } from '../components/stats/RecentMatchesCarousel';
import type { RecentMatchViewModel } from '../components/stats/types';
import { useMatchLog } from '../db/hooks/useMatchLog';
import { useAllHeroStats } from '../db/hooks/useHeroStats';
import { useAllMastermindStats } from '../db/hooks/useMastermindStats';
import { useAllSchemeStats } from '../db/hooks/useSchemeStats';
import cardsData from '../assets/cards.json';
import type { CardsDatabase } from '../types/cards';

const db = cardsData as unknown as CardsDatabase;
const heroMap = new Map(db.heroes.map((h) => [h.id, h]));
const mastermindMap = new Map(db.masterminds.map((m) => [m.id, m]));
const schemeMap = new Map(db.schemes.map((s) => [s.id, s]));
const villainMap = new Map(db.villains.map((v) => [v.id, v]));
const henchmanMap = new Map(db.henchmen.map((h) => [h.id, h]));
const expansionMap = new Map(db.expansions.map((expansion) => [expansion.id, expansion]));

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

function WinLossBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return <div className="h-2 bg-zinc-800 rounded-full" />;
  const winPct = (wins / total) * 100;
  return (
    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-green-500 rounded-full transition-all duration-500"
        style={{ width: `${winPct}%` }}
      />
    </div>
  );
}

export default function StatsPage() {
  const { t } = useTranslation();
  const [savedMatchHeroesOpen, setSavedMatchHeroesOpen] = useState(false);
  const allMatches = useMatchLog();
  const allStats = useAllHeroStats();
  const allMastermindStats = useAllMastermindStats();
  const allSchemeStats = useAllSchemeStats();

  const totalWins = (allMatches ?? []).filter((match) => match.result === 'win').length;
  const totalLosses = (allMatches ?? []).filter((match) => match.result === 'loss').length;

  const heroAggregateStats = (() => {
    const storedStatsMap = new Map((allStats ?? []).map((stat) => [stat.heroId, stat]));
    const matchStatsMap = new Map<string, { playCount: number; wins: number; losses: number }>();

    for (const match of allMatches ?? []) {
      for (const heroId of new Set(match.heroIds)) {
        const current = matchStatsMap.get(heroId) ?? { playCount: 0, wins: 0, losses: 0 };
        current.playCount += 1;
        if (match.result === 'win') {
          current.wins += 1;
        } else {
          current.losses += 1;
        }
        matchStatsMap.set(heroId, current);
      }
    }

    return [...new Set([...storedStatsMap.keys(), ...matchStatsMap.keys()])]
      .map((heroId) => {
        const storedStats = storedStatsMap.get(heroId);
        const matchStats = matchStatsMap.get(heroId);

        return {
          heroId,
          playCount: Math.max(storedStats?.playCount ?? 0, matchStats?.playCount ?? 0),
          wins: Math.max(storedStats?.wins ?? 0, matchStats?.wins ?? 0),
          losses: Math.max(storedStats?.losses ?? 0, matchStats?.losses ?? 0),
        };
      })
      .filter((hero) => hero.playCount > 0 || hero.wins > 0 || hero.losses > 0 || matchStatsMap.has(hero.heroId));
  })();

  const topPlayed = [...heroAggregateStats]
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 5);

  const leastPlayed = [...heroAggregateStats]
    .filter((s) => s.playCount > 0)
    .sort((a, b) => a.playCount - b.playCount)
    .slice(0, 3);

  const toughestMasterminds = [...(allMastermindStats ?? [])]
    .filter((s) => s.wins > 0)
    .sort((a, b) => b.wins - a.wins || b.playCount - a.playCount || a.mastermindId.localeCompare(b.mastermindId))
    .slice(0, 3);

  const toughestSchemes = [...(allSchemeStats ?? [])]
    .filter((s) => s.wins > 0)
    .sort((a, b) => b.wins - a.wins || b.playCount - a.playCount || a.schemeId.localeCompare(b.schemeId))
    .slice(0, 3);

  const topPlayedCompact = topPlayed.slice(0, 3);
  const savedMatchHeroes = [...heroAggregateStats]
    .map((hero) => {
      const heroInfo = heroMap.get(hero.heroId);
      return {
        ...hero,
        name: heroInfo?.name ?? hero.heroId,
        faction: heroInfo?.faction ?? '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const recentMatchesView: RecentMatchViewModel[] = (() => {
    if (allMatches === undefined || allStats === undefined || allMastermindStats === undefined || allSchemeStats === undefined) {
      return [];
    }

    const heroStatsMap = new Map(allStats.map((stat) => [stat.heroId, stat]));
    const mastermindStatsMap = new Map(allMastermindStats.map((stat) => [stat.mastermindId, stat]));
    const schemeStatsMap = new Map(allSchemeStats.map((stat) => [stat.schemeId, stat]));

    return allMatches.slice(0, 20).map((match, index) => {
      const mastermind = mastermindMap.get(match.mastermindId);
      const scheme = schemeMap.get(match.schemeId);
      const heroes = match.heroIds.map((heroId) => {
        const hero = heroMap.get(heroId);
        const heroStats = heroStatsMap.get(heroId);
        return {
          id: heroId,
          name: hero?.name ?? heroId,
          faction: hero?.faction ?? '',
          expansionName: hero ? expansionMap.get(hero.expansionId)?.label : undefined,
          stats: heroStats
            ? {
                wins: heroStats.wins,
                losses: heroStats.losses,
                playCount: heroStats.playCount,
              }
            : undefined,
        };
      });

      const heroRates = heroes
        .map((hero) => hero.stats)
        .filter((stats): stats is NonNullable<typeof stats> => stats !== undefined)
        .map((stats) => {
          const total = stats.wins + stats.losses;
          return total === 0 ? 0 : (stats.wins / total) * 100;
        });
      const heroAverageWinRate = heroRates.length > 0
        ? Math.round(heroRates.reduce((sum, rate) => sum + rate, 0) / heroRates.length)
        : undefined;

      const mastermindStats = mastermindStatsMap.get(match.mastermindId);
      const schemeStats = schemeStatsMap.get(match.schemeId);

      return {
        id: String(match.id ?? `${match.date}-${index}`),
        date: match.date,
        result: match.result,
        playerCount: match.playerCount,
        randomizationMode: match.randomizationMode,
        isEpicMastermind: match.isEpicMastermind ?? false,
        score: match.score,
        threatScore: match.threatScore,
        balanceGap: match.balanceGap,
        mastermind: {
          id: match.mastermindId,
          name: mastermind?.name ?? match.mastermindId,
          expansionName: mastermind ? expansionMap.get(mastermind.expansionId)?.label : undefined,
          stats: mastermindStats
            ? {
                wins: mastermindStats.wins,
                losses: mastermindStats.losses,
                playCount: mastermindStats.playCount,
              }
            : undefined,
        },
        scheme: {
          id: match.schemeId,
          name: scheme?.name ?? match.schemeId,
          expansionName: scheme ? expansionMap.get(scheme.expansionId)?.label : undefined,
          stats: schemeStats
            ? {
                wins: schemeStats.wins,
                losses: schemeStats.losses,
                playCount: schemeStats.playCount,
              }
            : undefined,
        },
        villains: match.villainIds.map((villainId) => {
          const villain = villainMap.get(villainId);
          return {
            id: villainId,
            name: villain?.name ?? villainId,
            expansionName: villain ? expansionMap.get(villain.expansionId)?.label : undefined,
          };
        }),
        henchmen: match.henchmanIds.map((henchmanId) => {
          const henchman = henchmanMap.get(henchmanId);
          return {
            id: henchmanId,
            name: henchman?.name ?? henchmanId,
            expansionName: henchman ? expansionMap.get(henchman.expansionId)?.label : undefined,
          };
        }),
        heroes,
        heroAverageWinRate,
      };
    });
  })();

  if (
    allMatches === undefined
    || allStats === undefined
    || allMastermindStats === undefined
    || allSchemeStats === undefined
  ) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="pb-nav">
      <PageHeader title={t('stats.title')} subtitle={t('stats.totalMatches', { count: totalWins + totalLosses })} />

      <div className="px-4 space-y-5">
        {/* Overall win/loss */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-400 mb-3">{t('stats.overallResults.heading')}</h2>
          <div className="flex gap-4 mb-3">
            <div className="flex-1 text-center p-3 rounded-xl bg-green-900/20 border border-green-800/40">
              <p className="text-2xl font-bold text-green-400">{totalWins}</p>
              <p className="text-xs text-zinc-500 mt-1">{t('stats.overallResults.wins')}</p>
            </div>
            <div className="flex-1 text-center p-3 rounded-xl bg-red-900/20 border border-red-800/40">
              <p className="text-2xl font-bold text-red-400">{totalLosses}</p>
              <p className="text-xs text-zinc-500 mt-1">{t('stats.overallResults.losses')}</p>
            </div>
          </div>
          <WinLossBar wins={totalWins} losses={totalLosses} />
          {totalWins + totalLosses > 0 && (
            <p
              className="text-xs mt-1 text-right"
              style={valueColorStyle(Math.round((totalWins / (totalWins + totalLosses)) * 100), 0, 100, 0, 120)}
            >
              {t('stats.overallResults.winRate', { percentage: Math.round((totalWins / (totalWins + totalLosses)) * 100) })}
            </p>
          )}
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-400 mb-3">{t('stats.recentMatches')}</h2>
          <RecentMatchesCarousel matches={recentMatchesView} />
        </div>

        {/* Most played (compact) */}
        {topPlayedCompact.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">{t('stats.mostPlayed')}</h2>
            <div className="space-y-2.5">
              {topPlayedCompact.map((stat) => {
                const hero = heroMap.get(stat.heroId);
                if (!hero) return null;
                return (
                  <div key={stat.heroId} className="flex items-center gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate leading-snug">{hero.name}</p>
                      <p className="text-[11px] text-zinc-500 leading-snug">{hero.faction}</p>
                    </div>
                    <div className="min-w-[76px] text-right font-mono text-[11px] leading-snug">
                      <p className="text-white">{stat.playCount}x</p>
                      <p className="text-zinc-500">
                        <span className="text-green-500">{stat.wins}W</span>
                        {' / '}
                        <span className="text-red-500">{stat.losses}L</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shelf of shame (compact) */}
        {leastPlayed.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">{t('stats.shelfOfShame')}</h2>
            <div className="space-y-2.5">
              {leastPlayed.map((stat) => {
                const hero = heroMap.get(stat.heroId);
                if (!hero) return null;
                return (
                  <div key={stat.heroId} className="flex items-center gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate leading-snug">{hero.name}</p>
                      <p className="text-[11px] text-zinc-500 leading-snug">{hero.faction}</p>
                    </div>
                    <div className="min-w-[76px] text-right font-mono text-[11px] leading-snug">
                      <p className="text-white">{stat.playCount}x</p>
                      <p className="text-zinc-500">
                        <span className="text-green-500">{stat.wins}W</span>
                        {' / '}
                        <span className="text-red-500">{stat.losses}L</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {savedMatchHeroes.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setSavedMatchHeroesOpen((current) => !current)}
              className="w-full flex items-center justify-between p-4 text-left"
              aria-expanded={savedMatchHeroesOpen}
              aria-controls="saved-match-heroes-panel"
            >
              <div>
                <p className="text-sm font-medium text-white">{t('stats.savedMatchHeroes.heading')}</p>
                <p className="text-xs text-zinc-500">{t('stats.savedMatchHeroes.subtitle', { count: savedMatchHeroes.length })}</p>
              </div>
              {savedMatchHeroesOpen
                ? <ChevronUp size={18} className="text-zinc-400" />
                : <ChevronDown size={18} className="text-zinc-400" />}
            </button>

            {savedMatchHeroesOpen && (
              <div id="saved-match-heroes-panel" className="px-4 pb-4">
                <div className="overflow-hidden rounded-xl border border-zinc-800">
                  <div className="grid grid-cols-[minmax(0,1fr)_72px_84px] border-b border-zinc-800 bg-zinc-950/70 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <div className="px-3 py-2">{t('stats.savedMatchHeroes.columns.hero')}</div>
                    <div className="px-3 py-2 text-center">{t('stats.savedMatchHeroes.columns.matches')}</div>
                    <div className="px-3 py-2 text-center">{t('stats.savedMatchHeroes.columns.record')}</div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {savedMatchHeroes.map((hero) => (
                      <div
                        key={hero.heroId}
                        className="grid grid-cols-[minmax(0,1fr)_72px_84px] border-b border-zinc-800 last:border-b-0"
                      >
                        <div className="min-w-0 px-3 py-2.5">
                          <p className="text-sm text-white truncate leading-snug">{hero.name}</p>
                          {hero.faction && (
                            <p className="text-[11px] text-zinc-500 leading-snug truncate">{hero.faction}</p>
                          )}
                        </div>
                        <div className="px-3 py-2.5 text-center font-mono text-[11px] text-white">
                          {hero.playCount}x
                        </div>
                        <div className="px-3 py-2.5 text-center font-mono text-[11px] leading-snug text-zinc-500">
                          <span className="text-green-500">{hero.wins}W</span>
                          {' / '}
                          <span className="text-red-500">{hero.losses}L</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {(toughestMasterminds.length > 0 || toughestSchemes.length > 0) && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-400">{t('stats.toughestMatchups.heading')}</h2>

            {toughestMasterminds.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.12em] mb-2.5">
                  {t('stats.toughestMatchups.masterminds')}
                </h3>
                <div className="space-y-2.5">
                  {toughestMasterminds.map((stat) => {
                    const mastermind = mastermindMap.get(stat.mastermindId);
                    const expansionName = mastermind ? expansionMap.get(mastermind.expansionId)?.label : undefined;
                    if (!mastermind) return null;
                    return (
                      <div key={stat.mastermindId} className="flex items-center gap-3 py-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate leading-snug">{mastermind.name}</p>
                          {expansionName && (
                            <p className="text-[9px] uppercase tracking-wide text-zinc-500 truncate opacity-80">{expansionName}</p>
                          )}
                        </div>
                        <div className="min-w-[76px] text-right font-mono text-[11px] leading-snug">
                          <p className="text-zinc-500">
                            <span className="text-green-500">{stat.wins}W</span>
                            {' / '}
                            <span className="text-red-500">{stat.losses}L</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {toughestSchemes.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.12em] mb-2.5">
                  {t('stats.toughestMatchups.schemes')}
                </h3>
                <div className="space-y-2.5">
                  {toughestSchemes.map((stat) => {
                    const scheme = schemeMap.get(stat.schemeId);
                    const expansionName = scheme ? expansionMap.get(scheme.expansionId)?.label : undefined;
                    if (!scheme) return null;
                    return (
                      <div key={stat.schemeId} className="flex items-center gap-3 py-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate leading-snug">{scheme.name}</p>
                          {expansionName && (
                            <p className="text-[9px] uppercase tracking-wide text-zinc-500 truncate opacity-80">{expansionName}</p>
                          )}
                        </div>
                        <div className="min-w-[76px] text-right font-mono text-[11px] leading-snug">
                          <p className="text-zinc-500">
                            <span className="text-green-500">{stat.wins}W</span>
                            {' / '}
                            <span className="text-red-500">{stat.losses}L</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
