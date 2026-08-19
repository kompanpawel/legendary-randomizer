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
  /**
   * Czy ten dodatek zawiera "Special Sidekicks" (Pet Avengers / X-Students / ogólne Sidekicks
   * z Secret Wars Vol.1) dołączane do wspólnego Sidekick Stack. Gdy w grze aktywne są ≥2 takie
   * sety, gracze muszą scalić ich stosy Sidekick w jeden przed rozgrywką.
   */
  hasSpecialSidekicks?: boolean;
  /**
   * Czy ten dodatek zawiera Grievous Wounds (trudniejsze do uleczenia — wymagają 5 Recruit)
   * dołączane do wspólnego Wound Stack. Obecność tych ran nie zmienia logiki losowania ani
   * obliczeń trudności silnika (tag wound-removal obsługuje zagrożenie poprawnie), ale jest
   * przydatnym metadatanym dla UI.
   */
  hasGrievousWounds?: boolean;
  /**
   * Czy ten dodatek zawiera Enraging Wounds (dają bonusy gdy zagrane, ale trudniejsze do
   * uleczenia i zwiększają łączną liczbę ran). Analogicznie do hasGrievousWounds — dane
   * metadane, bez wpływu na logikę silnika.
   */
  hasEnragingWounds?: boolean;
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
    /** Minimalna liczba graczy, od której heroCountMod jest aktywny (domyślnie: zawsze) */
    heroCountModMinPlayers?: number;
    extraVillains?: number;
    /** Opis specjalnych zasad setupu wynikających ze schematu */
    specialSetup?: string;
    /**
     * Czy ten schemat wymaga losowego drugiego Masterminda z pełnym zestawem Tactics
     * (dodawanego do gry na Twist 1). Dotyczy wyłącznie Dark Alliance.
     * W odróżnieniu od multipleMasterminds (ogólna flaga), ta flaga oznacza konieczność
     * fizycznego wylosowania i przygotowania drugiego Masterminda przed grą.
     */
    requiresSecondMastermind?: boolean;
    /**
     * Czy ten schemat wprowadza mechnikę Multiple Masterminds — podczas gry mogą pojawić się
     * lub zostać aktywowani dodatkowi Mastermindowie (ascension villainów lub drugi Mastermind
     * z Tactics). Ascending Masterminds nie mają Tactics (pokonywani jedną walką), ale mogą
     * być ich wiele; drugi prawdziwy Mastermind (Dark Alliance) ma pełny zestaw Tactics.
     */
    multipleMasterminds?: boolean;
    /**
     * Villain Groups, które muszą zostać zawarte w setupie (logika AND).
     * Nazwy są rozwiązywane runtime przez matchGroup (fuzzy matching).
     * Np. ["Kree Starforce", "Skrulls"] dla The Kree-Skrull War.
     */
    requiredVillainGroups?: string[];
    /**
     * Henchman Groups, które muszą zostać zawarte w setupie (logika AND).
     * Np. ["Khonshu Guardians"] dla The Mark of Khonshu.
     */
    requiredHenchmanGroups?: string[];
    /**
     * Dokładnie jedna Villain Group z tej listy jest losowana (logika XOR).
     * Np. ["Hydra Elite", "A.I.M., Hydra Offshoot"] dla S.H.I.E.L.D. vs. HYDRA War.
     */
    xorVillainGroups?: string[];
    /**
     * Słowo kluczowe — do setupu musi trafić jedna Villain Group, której karty zawierają
     * ten tekst. Np. "Rise of The Living Dead" dla Marvel Zombies.
     */
    requiredVillainKeyword?: string;
    /**
     * Bohaterowie, którzy muszą trafić do Hero Decku (rozwiązywani po nazwie).
     * Np. ["Party Thor"] dla Trash Earth with Hugest Party Ever.
     */
    requiredHeroes?: string[];
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
  /**
   * Czy ta grupa zawiera kartę „Ambush Scheme" — specjalną kartę dodawaną do
   * Villain Decku, która po wyjściu z talii działa jak dodatkowy schemat
   * (ma Twist effect i może być pokonana). Zgodnie z zasadami w grze może być
   * aktywna tylko jedna taka karta naraz; nadmiarowe są KO'wane.
   */
  hasAmbushScheme?: boolean;
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


