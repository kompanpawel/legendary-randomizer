import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RandomizationMode } from '../types/stats';
import type { Hero, Mastermind, Scheme, VillainGroup, Henchman } from '../types/cards';
import type { CounterCoverage, SetupNote } from '../engine/SmartRandomizerEngine';

export type { CounterCoverage };

export interface GameSetup {
  mastermind: Mastermind;
  /**
   * Drugi Mastermind losowany dla Dark Alliance — dodawany na Twist 1.
   * Obecny tylko gdy scheme.overrides.requiresSecondMastermind === true.
   */
  secondMastermind?: Mastermind;
  /**
   * Losowo wybrany Unveiled Scheme — "druga faza" aktywnego Veiled Scheme.
   * Obecny tylko gdy scheme.overrides.isVeiledScheme === true.
   */
  unveiledScheme?: Scheme;
  /**
   * „Drained" Mastermind wylosowany dla Symbiotic Absorption.
   * Odłożony poza grę; jego Tactics trafiają do głównego Masterminda na Twistach 1–4.
   * Obecny tylko gdy scheme.overrides.requiresDrainedMastermind === true.
   */
  drainedMastermind?: Mastermind;
  scheme: Scheme;
  heroes: Hero[];
  villains: VillainGroup[];
  henchmen: Henchman[];
  bystanders: number;
  isEpicMastermind: boolean;
  /** Modyfikator liczby hero wynikający ze schematu (0 jeśli brak) */
  schemeHeroMod: number;
  /**
   * Efektywny modyfikator liczby villain groups ze schematu (0 jeśli warunek player-count nie spełniony).
   * Uwzględnia extraVillainsMinPlayers / extraVillainsMaxPlayers.
   */
  schemeExtraVillainMod: number;
  threatScore: number;
  balanceGap: number;
  counterCoverage: CounterCoverage;
  /** Notatki setupowe — klucze i18n do przetłumaczenia w UI */
  setupNotes: SetupNote[];
}
interface AppState {
  selectedExpansionIds: number[];
  /**
   * true po pierwszej jawnej interakcji z ekspansjami (select/deselect/toggle).
   * false = stan "nie skonfigurowano" = wszystkie ekspansje aktywne (backward-compatible).
   * Gdy true i selectedExpansionIds.length === 0 → przycisk Generate jest wyłączony.
   */
  expansionsEverSet: boolean;
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
      expansionsEverSet: false,
      randomizationMode: "smart",
      heroCount: 5,
      playerCount: 2,
      alpha: 1.0,
      currentSetup: null,
      isEpicMastermind: false,
      pinnedMastermindId: null,
      pinnedSchemeId: null,
      setExpansions: (ids) => set({ selectedExpansionIds: ids, expansionsEverSet: true }),
      toggleExpansion: (id) =>
        set((state) => ({
          expansionsEverSet: true,
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
        expansionsEverSet: state.expansionsEverSet,
        randomizationMode: state.randomizationMode,
        heroCount: state.heroCount,
        playerCount: state.playerCount,
        alpha: state.alpha,
        isEpicMastermind: state.isEpicMastermind,
        pinnedMastermindId: state.pinnedMastermindId,
        pinnedSchemeId: state.pinnedSchemeId,
      }),
    }
  )
);
