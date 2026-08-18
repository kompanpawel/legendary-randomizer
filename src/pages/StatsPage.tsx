import { Trophy, X, Clock, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/layout/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { useMatchLog, useRecentMatchLog } from '../db/hooks/useMatchLog';
import { useAllHeroStats } from '../db/hooks/useHeroStats';
import cardsData from '../assets/cards.json';
import type { CardsDatabase } from '../types/cards';

const db = cardsData as unknown as CardsDatabase;
const heroMap = new Map(db.heroes.map((h) => [h.id, h]));

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
  const recentMatches = useRecentMatchLog(10);
  const allMatches = useMatchLog();
  const allStats = useAllHeroStats();

  const totalWins = (allMatches ?? []).filter((match) => match.result === 'win').length;
  const totalLosses = (allMatches ?? []).filter((match) => match.result === 'loss').length;

  const topPlayed = [...(allStats ?? [])]
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 5);

  const leastPlayed = [...(allStats ?? [])]
    .filter((s) => s.playCount > 0)
    .sort((a, b) => a.playCount - b.playCount)
    .slice(0, 5);

  if (recentMatches === undefined || allMatches === undefined || allStats === undefined) {
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
            <p className="text-xs text-zinc-500 mt-1 text-right">
              {t('stats.overallResults.winRate', { percentage: Math.round((totalWins / (totalWins + totalLosses)) * 100) })}
            </p>
          )}
        </div>

        {/* Top 5 most played */}
        {topPlayed.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">{t('stats.mostPlayed')}</h2>
            <div className="space-y-2">
              {topPlayed.map((stat) => {
                const hero = heroMap.get(stat.heroId);
                if (!hero) return null;
                return (
                  <div key={stat.heroId} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{hero.name}</p>
                      <p className="text-xs text-zinc-500">{hero.faction}</p>
                    </div>
                    <div className="text-right font-mono text-xs">
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

        {/* Top 5 least played */}
        {leastPlayed.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">{t('stats.shelfOfShame')}</h2>
            <div className="space-y-2">
              {leastPlayed.map((stat) => {
                const hero = heroMap.get(stat.heroId);
                if (!hero) return null;
                return (
                  <div key={stat.heroId} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{hero.name}</p>
                      <p className="text-xs text-zinc-500">{hero.faction}</p>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">{stat.playCount}x</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Match history */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-400 mb-3">{t('stats.recentMatches')}</h2>
          {recentMatches.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-6">
              {t('stats.noHistory')}
            </p>
          ) : (
            <div className="space-y-2">
              {recentMatches.map((match) => {
                const mm = db.masterminds.find((m) => m.id === match.mastermindId);
                const sc = db.schemes.find((s) => s.id === match.schemeId);
                const date = new Date(match.date).toLocaleDateString('en-US', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                return (
                  <div
                    key={match.id}
                    className="flex gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        match.result === 'win'
                          ? 'bg-green-900/40 text-green-400'
                          : 'bg-red-900/40 text-red-400'
                      }`}
                    >
                      {match.result === 'win' ? <Trophy size={14} /> : <X size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{mm?.name ?? match.mastermindId}</p>
                      <p className="text-xs text-zinc-500 truncate">{sc?.name ?? match.schemeId}</p>
                      <div className="flex gap-3 mt-1 text-xs text-zinc-600">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          {match.playerCount}
                        </span>
                        {match.score !== undefined && (
                          <span className="text-marvel-gold font-mono">{match.score} VP</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
