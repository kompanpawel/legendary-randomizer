import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn.ts';
import { RecentMatchCard } from './RecentMatchCard';
import type { RecentMatchViewModel } from './types';

type MatchFilter = 'all' | 'wins' | 'losses' | 'epic';

interface RecentMatchesCarouselProps {
  matches: RecentMatchViewModel[];
}

const FILTERS: MatchFilter[] = ['all', 'wins', 'losses', 'epic'];

export function RecentMatchesCarousel({ matches }: RecentMatchesCarouselProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const previousIndexRef = useRef(0);

  const filteredMatches = useMemo(() => {
    if (filter === 'all') return matches;
    if (filter === 'wins') return matches.filter((match) => match.result === 'win');
    if (filter === 'losses') return matches.filter((match) => match.result === 'loss');
    return matches.filter((match) => match.isEpicMastermind);
  }, [matches, filter]);

  useEffect(() => {
    if (filteredMatches.length === 0) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex > filteredMatches.length - 1) {
      setActiveIndex(filteredMatches.length - 1);
    }
  }, [filteredMatches.length, activeIndex]);

  useEffect(() => {
    const cardContainer = cardContainerRef.current;
    if (!cardContainer || filteredMatches.length === 0) return;

    const previousIndex = previousIndexRef.current;
    const direction = activeIndex === previousIndex ? 0 : activeIndex > previousIndex ? 1 : -1;
    previousIndexRef.current = activeIndex;

    const animation = cardContainer.animate(
      direction === 0
        ? [{ opacity: 0.75 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: `translateX(${direction * 18}px)` },
            { opacity: 1, transform: 'translateX(0)' },
          ],
      {
        duration: 380,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    );

    return () => animation.cancel();
  }, [activeIndex, filteredMatches.length]);

  const selectCard = (index: number) => setActiveIndex(index);

  const handleFilterChange = (nextFilter: MatchFilter) => {
    setFilter(nextFilter);
    setActiveIndex(0);
  };

  const atStart = activeIndex <= 0;
  const atEnd = activeIndex >= filteredMatches.length - 1;

  if (matches.length === 0) {
    return <p className="text-zinc-600 text-sm text-center py-8">{t('stats.noHistory')}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handleFilterChange(item)}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs transition-colors',
              filter === item
                ? 'bg-zinc-200 text-zinc-900 border-zinc-200'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
            )}
          >
            {t(`stats.recentCarousel.filters.${item}`)}
          </button>
        ))}
      </div>

      {filteredMatches.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-8">{t('stats.recentCarousel.noFilteredHistory')}</p>
      ) : (
        <>
          <div ref={cardContainerRef} className="w-full">
            <RecentMatchCard key={filteredMatches[activeIndex].id} match={filteredMatches[activeIndex]} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {filteredMatches.map((match, index) => (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => selectCard(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    index === activeIndex ? 'bg-zinc-200' : 'bg-zinc-600 hover:bg-zinc-500'
                  )}
                  aria-label={t('stats.recentCarousel.jumpTo', { index: index + 1 })}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectCard(Math.max(0, activeIndex - 1))}
                disabled={atStart}
                className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label={t('stats.recentCarousel.previous')}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => selectCard(Math.min(filteredMatches.length - 1, activeIndex + 1))}
                disabled={atEnd}
                className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label={t('stats.recentCarousel.next')}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
