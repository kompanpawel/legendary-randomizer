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
     * Minimalna łączna liczba Villain Groups w setupie, niezależna od liczby graczy.
     * Nadpisuje villainCount „od dołu": effectiveCount = max(standard+extra, minVillainCount).
     * Np. 3 dla „Breach the Nexus of All Realities" (1-2 players: Use 3 Villain Groups).
     */
    minVillainCount?: number;
    /**
     * Czy schemat wymaga podziału Villain Deck na wiele równoległych talii/„rzeczywistości".
     * Metadane informacyjne — nie zmienia logiki losowania, ale służy jako badge UI
     * i podstawa do setup note. Dotyczy: Breach the Nexus, Five Families, Fragmented Realities,
     * Smash Two Dimensions Together.
     */
    isMultiDeck?: boolean;
    /**
     * Czy schemat wymaga losowego „Drained" Masterminda (Symbiotic Absorption).
     * Jego alwaysLeads Villain trafia jako wymuszona dodatkowa Villain Group,
     * a jego 4 Tactics są sukcesywnie tasowane do talii głównego Masterminda (Twisty 1–4).
     * GameSetup.drainedMastermind przechowuje wylosowanego Masterminda dla UI.
     */
    requiresDrainedMastermind?: boolean;
    /**
     * Bohaterowie, którzy muszą trafić do Hero Decku (rozwiązywani po nazwie).
     * Np. ["Party Thor"] dla Trash Earth with Hugest Party Ever.
     */
    requiredHeroes?: string[];
    /**
     * Nadpisuje całkowitą liczbę bohaterów niezależnie od playerCount i heroCountMod.
     * Używane gdy schemat z definicji ma stały skład decku Hero.
     * Np. 6 dla Avengers vs. X-Men / House of M, 7 dla Divide and Conquer.
     */
    heroCountOverride?: number;
    /**
     * Podziel Hero Deck na 2 drużyny (frakcje) po teamSize bohaterów z każdej.
     * Silnik losuje 2 frakcje z wystarczającą pulą bohaterów i wybiera po teamSize z każdej.
     * Całkowicie zastępuje normalny tryb losowania bohaterów.
     * Np. { teamSize: 3 } dla Avengers vs. X-Men (3+3=6).
     */
    heroFactionSplit?: { teamSize: number };
    /**
     * Wymagana liczba bohaterów z konkretnej frakcji (pre-selekcja).
     * excludeFromRemainder=true: pozostałe sloty nie mogą zawierać bohaterów tej frakcji.
     * Np. { faction: "X-Men", count: 4, excludeFromRemainder: true } dla House of M.
     */
    requiredFactionCount?: { faction: string; count: number; excludeFromRemainder?: boolean };
    /**
     * Wymagana dokładna liczba bohaterów z podciągiem w nazwie.
     * Po pre-selekcji exactCount bohaterów z substring, reszta puli wyklucza ten substring.
     * Np. { substring: "Hulk", exactCount: 2 } dla Fall of the Hulks.
     */
    requiredHeroNameSubstring?: { substring: string; exactCount: number };
    /**
     * Silnik zapewnia co najmniej 1 bohatera każdej klasy (Strength/Instinct/Covert/Tech/Ranged).
     * Najpierw wybiera brakujące klasy, potem resztę normalnym trybem.
     * Używane dla Divide and Conquer (5 talii klas = 5 miejsc HQ).
     */
    requiresAllHeroClasses?: boolean;
    /**
     * Frakcja (Hero.faction), z której co najmniej 1 bohater musi trafić do Hero Decku.
     * Np. "Mercs for Money" dla Everybody Hates Deadpool,
     *     "Spider Friends" dla Distract the Hero.
     * Silnik losuje 1 bohatera z tej frakcji i pre-selekcjonuje go przed trybem losowania.
     */
    requiredHeroFaction?: string;
    /**
     * Czy to jest Veiled Scheme — podczas gry (na `veilTransformsTwist` Twiście) transformuje
     * w losowy Unveiled Scheme z tej samej ekspansji. Veiled Schemes są grywalne standalone.
     * Podczas losowania silnik automatycznie pre-wybiera jeden z dostępnych Unveiled Schemes
     * i zwraca go jako `GameSetup.unveiledScheme` (do opcjonalnego ujawnienia graczowi).
     */
    isVeiledScheme?: boolean;
    /**
     * Czy to jest Unveiled Scheme — "druga faza" Veiled Scheme, ujawniana losowo podczas gry.
     * Unveiled Schemes NIE są losowane jako samodzielne schematy przez silnik; dostępne
     * wyłącznie przez ręczny wybór (Manual Pick) lub jako partner Veiled Scheme w GameSetup.
     */
    isUnveiledScheme?: boolean;
    /**
     * Numer Twista, na którym Veiled Scheme transformuje w losowy Unveiled Scheme.
     * Np. 6 dla "Hack Cerebro Servers To...", 4 dla "Raid Gene Banks To...".
     * Wyłącznie dla schematów z `isVeiledScheme: true`.
     */
    veilTransformsTwist?: number;
    /**
     * Minimalna liczba graczy, od której extraVillains jest aktywne.
     * Np. 3 dla „3-5 players: Add a Villain Group" (Deadpool Wants a Chimichanga).
     */
    extraVillainsMinPlayers?: number;    /**
     * Maksymalna liczba graczy, do której extraVillains jest aktywne (włącznie).
     * Np. 1 dla „If playing solo, add an extra Villain Group" (Crush Them With My Bare Hands).
     */
    extraVillainsMaxPlayers?: number;
    /**
     * Addytywna modyfikacja liczby Bystanders w Villain Decku ponad wartość bazową z PLAYER_SETUP_RULES.
     * Np. 4 dla „Add 4 extra Bystanders" (Negative Zone Prison Breakout exp 42).
     */
    bystandersMod?: number;    /**
     * Nadpisuje liczbę Bystanders dokładną wartością (niezależną od liczby graczy).
     * Np. 0 dla „No Bystanders in the Villain Deck" (Hypnotize Every Human).
     */
    bystandersOverride?: number;
    /**
     * Liczba dodatkowych grup Henchman losowanych z puli, ponad standard z playerSetupRules.
     * Np. 1 dla „Add an extra Henchman group" (Negative Zone Prison Breakout exp 1,
     * Asgard Under Siege, Invasion of the Venom Symbiotes).
     * Działa analogicznie do extraVillains — zwiększa effectiveHenchmanCount.
     */
    extraHenchmen?: number;
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


