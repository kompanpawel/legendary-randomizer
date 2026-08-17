import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RandomizationMode } from '../types/stats';
import type { Hero, Mastermind, Scheme, VillainGroup, Henchman } from '../types/cards';
import type { CounterCoverage } from '../engine/SmartRandomizerEngine';

export type { CounterCoverage };

export interface GameSetup {
  mastermind: Mastermind;
  scheme: Scheme;
  heroes: Hero[];
  villains: VillainGroup[];
  henchmen: Henchman[];
  bystanders: number;
  isEpicMastermind: boolean;
  threatScore: number;
  balanceGap: number;
  counterCoverage: CounterCoverage;
}
interface AppState {
  selectedExpansionIds: number[];
  randomizationMode: RandomizationMode;
  heroCount: number;
  playerCount: number;
  alpha: number;
  currentSetup: GameSetup | null;
  isEpicMastermind: boolean;
  /** null = losuj, string = id wybranego masterminda */
  pinnedMastermindId: string | null;
  /** null = losuj, string = id wybranego schematu */
  pinnedSchemeId: string | null;
  setExpansions: (ids: number[]) => void;
  toggleExpansion: (id: number) => void;
  setMode: (mode: RandomizationMode) => void;
  setHeroCount: (count: number) => void;
  setPlayerCount: (count: number) => void;
  setAlpha: (alpha: number) => void;
  setSetup: (setup: GameSetup) => void;
  clearSetup: () => void;
  setIsEpicMastermind: (value: boolean) => void;
  setPinnedMastermindId: (id: string | null) => void;
  setPinnedSchemeId: (id: string | null) => void;
}
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedExpansionIds: [],
      randomizationMode: "smart",
      heroCount: 5,
      playerCount: 2,
      alpha: 1.0,
      currentSetup: null,
      isEpicMastermind: false,
      pinnedMastermindId: null,
      pinnedSchemeId: null,
      setExpansions: (ids) => set({ selectedExpansionIds: ids }),
      toggleExpansion: (id) =>
        set((state) => ({
          selectedExpansionIds: state.selectedExpansionIds.includes(id)
            ? state.selectedExpansionIds.filter((i) => i !== id)
            : [...state.selectedExpansionIds, id],
        })),
      setMode: (mode) => set({ randomizationMode: mode }),
      setHeroCount: (count) => set({ heroCount: count }),
      setPlayerCount: (count) => set({ playerCount: count }),
      setAlpha: (alpha) => set({ alpha }),
      setSetup: (setup) => set({ currentSetup: setup }),
      clearSetup: () => set({ currentSetup: null }),
      setIsEpicMastermind: (value) => set({ isEpicMastermind: value }),
      setPinnedMastermindId: (id) => set({ pinnedMastermindId: id }),
      setPinnedSchemeId: (id) => set({ pinnedSchemeId: id }),
    }),
    {
      name: "legendary-app-settings",
      partialize: (state) => ({
        selectedExpansionIds: state.selectedExpansionIds,
        randomizationMode: state.randomizationMode,
        heroCount: state.heroCount,
        playerCount: state.playerCount,
        alpha: state.alpha,
        isEpicMastermind: state.isEpicMastermind,
        pinnedMastermindId: state.pinnedMastermindId,
        pinnedSchemeId: state.pinnedSchemeId,
        // currentSetup NIE jest persistowany
      }),
    }
  )
);
