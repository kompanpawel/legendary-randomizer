// Typy bazowe
export type HeroClass = 'Covert' | 'Instinct' | 'Ranged' | 'Strength' | 'Tech';
export type Keyword = string;
export type CounterTag = string;

export interface Expansion {
  id: number;
  label: string;
  value: string;
  initials: string;
  cardTypes: readonly number[];
}

export interface HeroCard {
  name: string;
  quantity: number;
  cost: number;
  class: HeroClass;
  attack: string;
  recruit: string;
  abilities: string;
}

export interface Hero {
  id: string;
  name: string;
  expansionId: number;
  faction: string;
  primaryClasses: HeroClass[];
  keywords: Keyword[];
  powerLevel: 1 | 2 | 3 | 4 | 5;
  countersProvided: CounterTag[];
  cards: readonly HeroCard[];
}

export interface MastermindCard {
  name: string;
  isEpic: boolean;
  abilities: string;
}

export interface Mastermind {
  id: string;
  name: string;
  expansionId: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  alwaysLeads: string;
  theme: string;
  vp: number | null;
  countersNeeded: CounterTag[];
  cards: readonly MastermindCard[];
}

export interface SchemeCard {
  name: string;
  abilities: string;
}

export interface Scheme {
  id: string;
  name: string;
  expansionId: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  countersNeeded: CounterTag[];
  overrides: {
    heroCountMod?: number;
    extraVillains?: number;
    specialSetup?: string;
  };
  cards: readonly SchemeCard[];
}

export interface VillainCard {
  name: string;
  qtd?: number | null;
  vAttack?: string | null;
  vAttackNumeric?: number | null;
  vp?: number | null;
  vpRaw?: string | null;
  isEpic?: boolean;
  abilities: string;
}

export interface VillainGroup {
  id: string;
  name: string;
  expansionId: number;
  theme: string;
  countersNeeded: CounterTag[];
  cards: readonly VillainCard[];
}

export interface HenchmanCard {
  name: string;
  qtd?: number | null;
  vAttack?: string | null;
  vAttackNumeric?: number | null;
  abilities: string;
}

export interface Henchman {
  id: string;
  name: string;
  expansionId: number;
  countersNeeded: CounterTag[];
  cards: readonly HenchmanCard[];
}

export interface CardsDatabase {
  expansions: Expansion[];
  heroes: Hero[];
  masterminds: Mastermind[];
  schemes: Scheme[];
  villains: VillainGroup[];
  henchmen: Henchman[];
}


