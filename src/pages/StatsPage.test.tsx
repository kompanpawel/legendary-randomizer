import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import StatsPage from './StatsPage';
import type { HeroStats, MastermindStats, MatchLog, SchemeStats } from '../types/stats';

const useMatchLogMock = vi.fn<() => MatchLog[] | undefined>();
const useAllHeroStatsMock = vi.fn<() => HeroStats[] | undefined>();
const useAllMastermindStatsMock = vi.fn<() => MastermindStats[] | undefined>();
const useAllSchemeStatsMock = vi.fn<() => SchemeStats[] | undefined>();

vi.mock('../db/hooks/useMatchLog', () => ({
  useMatchLog: () => useMatchLogMock(),
}));

vi.mock('../db/hooks/useHeroStats', () => ({
  useAllHeroStats: () => useAllHeroStatsMock(),
}));

vi.mock('../db/hooks/useMastermindStats', () => ({
  useAllMastermindStats: () => useAllMastermindStatsMock(),
}));

vi.mock('../db/hooks/useSchemeStats', () => ({
  useAllSchemeStats: () => useAllSchemeStatsMock(),
}));

vi.mock('../components/stats/RecentMatchesCarousel', () => ({
  RecentMatchesCarousel: () => <div data-testid="recent-matches-carousel" />,
}));

describe('StatsPage toughest matchups section', () => {
  beforeEach(() => {
    useMatchLogMock.mockReturnValue([]);
    useAllHeroStatsMock.mockReturnValue([]);
    useAllMastermindStatsMock.mockReturnValue([]);
    useAllSchemeStatsMock.mockReturnValue([]);
  });

  it('shows top 3 masterminds and schemes with the most player losses', () => {
    useAllMastermindStatsMock.mockReturnValue([
      {
        mastermindId: 'sinister-six-2099-40-100',
        playCount: 10,
        wins: 8,
        losses: 2,
        lastPlayedAt: '2026-09-01T00:00:00.000Z',
        epicPlayCount: 0,
        epicWins: 0,
        epicLosses: 0,
      },
      {
        mastermindId: 'alchemax-executives-40-101',
        playCount: 9,
        wins: 7,
        losses: 2,
        lastPlayedAt: '2026-09-01T00:00:00.000Z',
        epicPlayCount: 0,
        epicWins: 0,
        epicLosses: 0,
      },
      {
        mastermindId: 'annihilus-30-76',
        playCount: 12,
        wins: 6,
        losses: 6,
        lastPlayedAt: '2026-09-01T00:00:00.000Z',
        epicPlayCount: 0,
        epicWins: 0,
        epicLosses: 0,
      },
      {
        mastermindId: 'morgan-le-fay-21-57',
        playCount: 15,
        wins: 5,
        losses: 10,
        lastPlayedAt: '2026-09-01T00:00:00.000Z',
        epicPlayCount: 0,
        epicWins: 0,
        epicLosses: 0,
      },
    ]);

    useAllSchemeStatsMock.mockReturnValue([
      {
        schemeId: 'pull-reality-into-cyberspace-40-182',
        playCount: 11,
        wins: 9,
        losses: 2,
        lastPlayedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        schemeId: 'become-president-of-the-united-states-40-183',
        playCount: 8,
        wins: 6,
        losses: 2,
        lastPlayedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        schemeId: 'subjugate-earth-with-mega-corporations-40-184',
        playCount: 8,
        wins: 5,
        losses: 3,
        lastPlayedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        schemeId: 'befoul-earth-into-a-polluted-wasteland-40-185',
        playCount: 20,
        wins: 4,
        losses: 16,
        lastPlayedAt: '2026-09-01T00:00:00.000Z',
      },
    ]);

    render(<StatsPage />);

    expect(screen.getByText('☠️ Toughest Matchups')).toBeInTheDocument();
    expect(screen.getByText('Masterminds')).toBeInTheDocument();
    expect(screen.getByText('Schemes')).toBeInTheDocument();

    expect(screen.getByText('Sinister Six 2099')).toBeInTheDocument();
    expect(screen.getByText('Alchemax Executives')).toBeInTheDocument();
    expect(screen.getByText('Annihilus')).toBeInTheDocument();
    expect(screen.queryByText('Morgan Le Fay')).not.toBeInTheDocument();

    expect(screen.getByText('Pull Reality Into Cyberspace')).toBeInTheDocument();
    expect(screen.getByText('Become President of the United States')).toBeInTheDocument();
    expect(screen.getByText('Subjugate Earth with Mega-Corporations')).toBeInTheDocument();
    expect(screen.queryByText('Befoul Earth Into a Polluted Wasteland')).not.toBeInTheDocument();
  });

  it('shows saved match heroes in a collapsible section sorted alphabetically', () => {
    useMatchLogMock.mockReturnValue([
      {
        id: 1,
        date: '2026-09-01T00:00:00.000Z',
        result: 'win',
        playerCount: 2,
        mastermindId: 'mastermind-1',
        schemeId: 'scheme-1',
        heroIds: ['spider-man-2099-40-281', 'wasp-21-175', 'ant-man-21-172'],
        villainIds: [],
        henchmanIds: [],
        randomizationMode: 'manual',
      },
    ]);

    render(<StatsPage />);

    const toggle = screen.getByRole('button', { name: /match heroes/i });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('3 heroes tracked from saved matches')).toBeInTheDocument();
    expect(document.getElementById('saved-match-heroes-panel')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const panel = document.getElementById('saved-match-heroes-panel');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveTextContent('Ant-Man');
    expect(panel).toHaveTextContent('Spider-Man 2099');
    expect(panel).toHaveTextContent('Wasp');

    const antMan = within(panel as HTMLElement).getByText('Ant-Man');
    const spiderMan = within(panel as HTMLElement).getByText('Spider-Man 2099');
    const wasp = within(panel as HTMLElement).getByText('Wasp');

    expect(antMan.compareDocumentPosition(spiderMan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(spiderMan.compareDocumentPosition(wasp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('saved-match-heroes-panel')).not.toBeInTheDocument();
  });

  it('counts heroes from saved matches in most played stats', () => {
    useMatchLogMock.mockReturnValue([
      {
        id: 1,
        date: '2026-09-01T00:00:00.000Z',
        result: 'win',
        playerCount: 2,
        mastermindId: 'mastermind-1',
        schemeId: 'scheme-1',
        heroIds: ['ant-man-21-172', 'wasp-21-175'],
        villainIds: [],
        henchmanIds: [],
        randomizationMode: 'manual',
      },
      {
        id: 2,
        date: '2026-09-02T00:00:00.000Z',
        result: 'loss',
        playerCount: 2,
        mastermindId: 'mastermind-1',
        schemeId: 'scheme-1',
        heroIds: ['ant-man-21-172', 'captain-america-20-39'],
        villainIds: [],
        henchmanIds: [],
        randomizationMode: 'manual',
      },
    ]);

    useAllHeroStatsMock.mockReturnValue([
      {
        heroId: 'ant-man-21-172',
        playCount: 1,
        wins: 1,
        losses: 0,
        lastPlayedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        heroId: 'wasp-21-175',
        playCount: 1,
        wins: 1,
        losses: 0,
        lastPlayedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        heroId: 'captain-america-20-39',
        playCount: 1,
        wins: 0,
        losses: 1,
        lastPlayedAt: '2026-09-02T00:00:00.000Z',
      },
    ]);

    render(<StatsPage />);

    expect(Array.from(document.querySelectorAll('div')).some((node) => (
      node.textContent?.includes('Ant-Man') && node.textContent?.includes('2x')
    ))).toBe(true);
  });
});
