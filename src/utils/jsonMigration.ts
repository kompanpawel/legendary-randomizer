/**
 * Skrypt migracji danych z /json/ do src/assets/cards.json
 * Uruchom: tsx src/utils/jsonMigration.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  CardsDatabase,
  Expansion,
  Hero,
  HeroCard,
  HeroClass,
  Mastermind,
  MastermindCard,
  Scheme,
  SchemeCard,
  VillainGroup,
  VillainCard,
  Henchman,
  HenchmanCard,
} from '../types/cards.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonDir = path.resolve(__dirname, '../../json');
const outputPath = path.resolve(__dirname, '../assets/cards.json');

function readJson<T>(filename: string): T {
  const raw = fs.readFileSync(path.join(jsonDir, filename), 'utf-8');
  return JSON.parse(raw) as T;
}

// ─── Typy surowych danych ────────────────────────────────────────────────────

interface RawExpansion {
  id: number;
  label: string;
  value: string;
  initials: string;
  cardTypes: number[];
}

interface RawHeroCard {
  name: string;
  quantity: number;
  cost: number;
  class: string;
  attack: string;
  recruit: string;
  abilities: string;
}

interface RawHero {
  id: string;
  name: string;
  setId: number;
  teamId?: number;
  teamLabel?: string;
  cards: RawHeroCard[];
}

interface RawMastermindCard {
  name: string;
  isEpic: boolean;
  abilities: string;
}

interface RawMastermind {
  id: string;
  name: string;
  setId: number;
  vAttack?: string | null;
  vAttackNumeric?: number | null;
  vp?: number | null;
  vpRaw?: string | null;
  cards: RawMastermindCard[];
}

interface RawSchemeCard {
  name: string;
  abilities: string;
}

interface RawScheme {
  id: string;
  name: string;
  setId: number;
  cards: RawSchemeCard[];
}

interface RawVillainCard {
  name: string;
  qtd?: number | null;
  vAttack?: string | null;
  vAttackNumeric?: number | null;
  vp?: number | null;
  vpRaw?: string | null;
  isEpic?: boolean;
  abilities: string;
}

interface RawVillain {
  id: string;
  name: string;
  setId: number | number[];
  vAttack?: string | null;
  vAttackNumeric?: number | null;
  vp?: number | null;
  vpRaw?: string | null;
  cards: RawVillainCard[];
}

interface RawHenchmanCard {
  name: string;
  qtd?: number | null;
  vAttack?: string | null;
  vAttackNumeric?: number | null;
  abilities: string;
}

interface RawHenchman {
  id: string;
  name: string;
  setId: number | number[];
  vAttack?: string | null;
  vAttackNumeric?: number | null;
  vp?: number | null;
  vpRaw?: string | null;
  cards: RawHenchmanCard[];
}

// ─── Derywacja primaryClasses ────────────────────────────────────────────────
function derivePrimaryClasses(cards: RawHeroCard[]): HeroClass[] {
  const counts: Partial<Record<HeroClass, number>> = {};
  let total = 0;
  for (const card of cards) {
    const cls = card.class as HeroClass;
    counts[cls] = (counts[cls] ?? 0) + card.quantity;
    total += card.quantity;
  }
  if (!total) return [];
  const threshold = total * 0.33;
  const sorted = (Object.entries(counts) as [HeroClass, number][]).sort((a, b) => b[1] - a[1]);
  const topCount = sorted[0]?.[1] ?? 0;
  const primary: HeroClass[] = [];
  for (const [cls, cnt] of sorted) {
    if (cnt >= threshold || cnt === topCount) primary.push(cls);
    if (primary.length >= 2 && cnt < threshold) break;
  }
  return primary;
}

// ─── Derywacja keywords ───────────────────────────────────────────────────────
const KEYWORD_PATTERNS: [RegExp, string][] = [
  [/\[Size-Changing\]|Size-Changing/i, 'Size-Changing'],
  [/Microscopic Size-Changing/i, 'Microscopic Size-Changing'],
  [/\[Teleport\]/i, 'Teleport'],
  [/\[Dodge\]/i, 'Dodge'],
  [/\[Phasing\]/i, 'Phasing'],
  [/Undercover/i, 'Undercover'],
  [/Man Out of Time/i, 'Man Out of Time'],
  [/Woman Out of Time/i, 'Woman Out of Time'],
  [/Fated Future/i, 'Fated Future'],
  [/Cyber-Mod/i, 'Cyber-Mod'],
  [/\[Ambush\]/i, 'Ambush'],
  [/Cheering Crowds/i, 'Cheering Crowds'],
  [/Versatile/i, 'Versatile'],
  [/Conqueror/i, 'Conqueror'],
  [/\[Savior\]/i, 'Savior'],
  [/\[Empowered\]/i, 'Empowered'],
  [/\[Demolish\]/i, 'Demolish'],
  [/Divided Card/i, 'Divided Card'],
  [/\[Focus/i, 'Focus'],
  [/Dark Memories/i, 'Dark Memories'],
  [/Throne'?s Favor/i, "Throne's Favor"],
  [/\[Sidekick\]/i, 'Sidekick'],
  [/\[Unleash\]/i, 'Unleash'],
  [/Wound the Mastermind/i, 'Wound Mastermind'],
  [/Wound (a |each |the )?Villain/i, 'Wound Villain'],
  [/\[Investigate\]/i, 'Investigate'],
  [/\[Patrol/i, 'Patrol'],
  [/Patrol the Streets/i, 'Patrol'],
  [/\[Thrown Artifact\]|\[Artifact\]/i, 'Artifact'],
  [/\[Wounded Fury\]/i, 'Wounded Fury'],
  [/\[Smash/i, 'Smash'],
  [/\[Transform\]/i, 'Transform'],
  [/\[Hunt for Victims\]/i, 'Hunt for Victims'],
];

function deriveKeywords(cards: RawHeroCard[]): string[] {
  const all = cards.map(c => c.abilities).join(' ');
  const found = new Set<string>();
  for (const [pattern, keyword] of KEYWORD_PATTERNS) {
    if (pattern.test(all)) found.add(keyword);
  }
  // keep Microscopic Size-Changing over generic Size-Changing
  if (found.has('Microscopic Size-Changing')) found.delete('Size-Changing');
  return [...found].sort();
}

// ─── Derywacja countersProvided ───────────────────────────────────────────────
function deriveCounters(cards: RawHeroCard[]): string[] {
  const all = cards.map(c => c.abilities).join(' ');
  const counters = new Set<string>();

  if (/rescue a bystander|rescue (the|this) bystander/i.test(all)) counters.add('bystander-rescue');
  if (/KO (a|one|two|up to) card(s)? from your (hand|discard|hand or discard|deck)/i.test(all)) counters.add('deck-thinning');
  if (/KO (it|this|one of them|them)/i.test(all)) counters.add('deck-thinning');
  if (/draw (a|two|three|an extra|extra) card/i.test(all)) counters.add('extra-draws');
  if (/draw (one|1|2|3) (of them|card)/i.test(all)) counters.add('extra-draws');
  if (/KO (a |the |up to two )?wound/i.test(all)) counters.add('wound-removal');
  if (/return (that wound|a wound) to the wound stack/i.test(all)) counters.add('wound-removal');
  if (/send (this|a)? ?wound (from .+)? ?\[undercover\]/i.test(all)) counters.add('wound-removal');
  if (/\[Wound (the Mastermind|a Villain|each Villain)/.test(all)) counters.add('wound-deal');

  const totalQty = cards.reduce((s, c) => s + c.quantity, 0);
  const recruitQty = cards.filter(c => String(c.recruit) !== '0' && String(c.recruit) !== '0+').reduce((s, c) => s + c.quantity, 0);
  if (totalQty > 0 && recruitQty / totalQty >= 0.35) counters.add('recruit-boost');

  if (/undercover/i.test(all)) counters.add('undercover');
  if (/gain a \[sidekick\]|gain a sidekick/i.test(all)) counters.add('sidekick');
  if (/s\.?h\.?i\.?e\.?l\.?d\./i.test(all) || /\[S\.H\.I\.E\.L\.D\.\]/.test(all)) counters.add('shield-synergy');
  if (/move a villain|swap (villains|them)/i.test(all)) counters.add('villain-control');
  if (/(look at|reveal) the top (two|three|\d+)? ?card/i.test(all)) counters.add('top-deck-control');
  if (/put (it|the rest|them|a card) back/i.test(all)) counters.add('top-deck-control');
  if (/(you may discard a card|discarded any cards this turn|discard a card)/i.test(all)) counters.add('discard');
  if (/\[Demolish\]/.test(all)) counters.add('discard-attack');
  if (/\[Investigate\]/.test(all)) { counters.add('bystander-rescue'); counters.add('deck-thinning'); }
  if (/\[Patrol/.test(all)) counters.add('location-control');
  if (/Patrol the Streets/i.test(all)) counters.add('location-control');
  if (/\[Artifact\]|\[Thrown Artifact\]|control an \[Artifact\]/i.test(all)) counters.add('artifact-synergy');
  if (/\[Wounded Fury\]|\[Smash/.test(all)) { counters.add('wound-synergy'); counters.add('heavy-hitter'); }
  if (/\[Transform\]/.test(all)) counters.add('transform');
  if (/the Lair|Ally Deck|HYDRA Ally|\[Ally\]/i.test(all)) counters.add('villain-ally-synergy');
  if (/\[Dodge\]/.test(all) && /(discard|kidnap|attack)/i.test(all)) counters.add('dodge-offense');
  if (/\[Hunt for Victims\]|Patrol the Streets/i.test(all)) counters.add('city-control');
  if (/henchman/i.test(all)) counters.add('henchman-synergy');
  if (/each (hero )?class you have|different (hero )?class/i.test(all)) counters.add('multi-class');
  if (/\[Size-Changing\]|Microscopic Size-Changing/i.test(all)) counters.add('size-changing');
  if (/Man Out of Time|Woman Out of Time/i.test(all)) counters.add('time-travel');
  if (/\[Ambush\]/.test(all)) counters.add('ambush');
  if (/\[Focus/.test(all)) counters.add('focus');
  if (/\[Empowered\]/.test(all)) counters.add('empowered');
  if (/\[Savior\]/.test(all)) counters.add('savior');
  if (/Conqueror/.test(all)) counters.add('conqueror');
  if (/Dark Memories/.test(all)) counters.add('dark-memories');
  if (/each villain|all villains|wound (villains|each villain)/i.test(all)) counters.add('aoe');

  const highAttackCards = cards.filter(c => (c.quantity === 1 || c.quantity === 3) && /^[5-9]|\d{2}/.test(String(c.attack)));
  if (highAttackCards.length > 0) counters.add('heavy-hitter');

  return [...counters].sort();
}

// ─── Derywacja countersNeeded dla Schematu ───────────────────────────────────
/**
 * Na podstawie tekstu karty schematu (Twist-ów, Special Rules, warunków zwycięstwa)
 * określa, jakie zdolności bohaterów są potrzebne, by skutecznie go kontrować.
 * Logika: co SCHEMAT ROBI graczom/miastu → jakie zdolności to kontrują.
 */
function deriveSchemeCounters(cards: RawSchemeCard[]): string[] {
  const all = cards.map(c => c.abilities).join('\n');
  const counters = new Set<string>();

  // ── Rany (wounds) zadawane graczom → wound-removal ────────────────────────
  if (/gain(s)? (a |two |three |\d+ )?Wound/i.test(all) ||
      /Wound (Stack|Deck) runs out/i.test(all) ||
      /\[Hunts? for Victims\]/i.test(all)) {
    counters.add('wound-removal');
  }

  // ── Efekty odrzucania kart → extra-draws ─────────────────────────────────
  if (/each player discards?/i.test(all) ||
      /discard(s)? (all |down to \d+|two cards?|a card|their (hand|cards?))/i.test(all) ||
      /all players? (must )?discard/i.test(all)) {
    counters.add('extra-draws');
  }

  // ── KO bohaterów z HQ lub talii bohaterów → recruit-boost + deck-thinning ─
  if (/KO (all (the )?)?(the )?Heroes? (from|in) the HQ/i.test(all) ||
      /KO (a |the |one )?(non-grey )?Hero(es)? from the HQ/i.test(all) ||
      /KO (the )?top (three|two|one|\d+) cards? of the Hero Deck/i.test(all) ||
      /KO (the )?leftmost (card|Hero)/i.test(all) ||
      /KO each Hero from the HQ that has/i.test(all)) {
    counters.add('recruit-boost');
    counters.add('deck-thinning');
  }

  // ── Talia bohaterów wyczerpuje się jako warunek przegranej ────────────────
  if (/Evil Wins.*Hero Deck runs out/i.test(all) ||
      /Hero Deck runs out.*Evil Wins/i.test(all) ||
      /Hero Deck (or Villain Deck )?runs out/i.test(all)) {
    counters.add('deck-thinning');
    counters.add('recruit-boost');
  }

  // ── Bohaterowie kosztują więcej → recruit-boost ───────────────────────────
  if (/cost(s)? \+\d+\[Recruit\]/i.test(all) ||
      /pay (an extra|\d+)\[Recruit\] for each/i.test(all) ||
      /must also (pay|spend).*for each/i.test(all) ||
      /Heroes?.*(cost|costs).*\+/i.test(all)) {
    counters.add('recruit-boost');
  }

  // ── Wrogowie zyskują siłę ataku z upływem czasu → villain-control + heavy-hitter
  if (/\+\d+\[Attack\] for each/i.test(all) ||
      /gets \+\d+\[Attack\]/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Wysoka siła ataku wrogów ──────────────────────────────────────────────
  const attackValues = [...all.matchAll(/\b(\d+)\[Attack\]/g)].map(m => parseInt(m[1]));
  const maxAttack = attackValues.length ? Math.max(...attackValues) : 0;
  if (maxAttack >= 10) { counters.add('heavy-hitter'); counters.add('villain-control'); counters.add('aoe'); }
  else if (maxAttack >= 7) { counters.add('heavy-hitter'); counters.add('villain-control'); }
  else if (maxAttack >= 5) { counters.add('heavy-hitter'); }

  // ── Wielu Villainów wchodzi do miasta / dodatkowe grupy ───────────────────
  if (/Play (two|three|2|3) cards? from the Villain Deck/i.test(all) ||
      /extra Villain Group/i.test(all) ||
      /extra Henchman (group|Villain Group)/i.test(all)) {
    counters.add('villain-control');
  }

  // ── Villainowie uciekają → villain-control ────────────────────────────────
  if (/Evil Wins[^.]*(\d+ Villains?( per player)? (have )?(escaped|are in the Escape))/i.test(all) ||
      /If \d+ Villains? escape/i.test(all) ||
      /When \d+ Villains? (have )?escaped/i.test(all) ||
      /\d+ Villains? per player.*Escape Pile/i.test(all)) {
    counters.add('villain-control');
  }

  // ── Bystanders zamieniają się w Villainów → bystander-rescue + villain-control
  if (/Bystander(s)? (face down next to|in the Villain Deck count as|become(s)?|enter(s)? (the city|a city space) as)/i.test(all) ||
      /put a Bystander.*as (a |an )?\d+\[Attack\]/i.test(all)) {
    counters.add('bystander-rescue');
    counters.add('villain-control');
  }

  // ── SHIELD Officers / Bodyguards stają się Villainami → villain-control + heavy-hitter
  if (/S\.?H\.?I\.?E\.?L\.?D\.? Officers?.*Villain/i.test(all) ||
      /Officers?.*\d+\[Attack\].*Villain/i.test(all) ||
      /Bodyguards?.*Villain/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Heroes z Villain Deck (Secret Invasion, Skrull itp.) → villain-control + recruit-boost
  if (/Heroes? in the Villain Deck (count as|are) ("|\u201C)?Villain/i.test(all) ||
      /Hero cards? in the Villain Deck.*Villain/i.test(all) ||
      /Skrull (Villain|Infiltrator)/i.test(all)) {
    counters.add('villain-control');
    counters.add('recruit-boost');
  }

  // ── KO non-grey Heroes (z ręki, talii, przez efekty) → deck-thinning + recruit-boost
  if (/KO (each |a |one |all )?(non-grey )?Heroes? drawn/i.test(all) ||
      /KO (a |one |each )?non-grey Hero/i.test(all) ||
      /KO (one of )?your (non-grey )?Heroes?/i.test(all)) {
    counters.add('deck-thinning');
    counters.add('recruit-boost');
  }

  // ── KO kart z HQ (Heroes cost less lub KO on cost threshold) → recruit-boost
  if (/KO each Hero from the HQ whose (cost|printed \[Attack\])/i.test(all) ||
      /KO (the )?leftmost (card|Hero)/i.test(all) ||
      /Stack (a |this )?card(s)? from the HQ next to/i.test(all) ||
      /put.*from the HQ.*next to the (Scheme|Mastermind)/i.test(all)) {
    counters.add('recruit-boost');
    counters.add('deck-thinning');
  }

  // ── Mastermind gromadzi zasoby (Force Fields, Secrets, Shards, etc.) → heavy-hitter
  if (/next to the Mastermind as.*(Force Field|Secret|Shard|Conquest)/i.test(all) ||
      /Mastermind (gains?|gets?) (a |\d+ )?\[(Shard|Force Field)/i.test(all) ||
      /must also (pay|spend).*for each/i.test(all)) {
    counters.add('heavy-hitter');
    counters.add('recruit-boost');
  }

  // ── Wiele Mastermindów → heavy-hitter + multi-class + villain-control
  if (/(extra|additional|another|random) Mastermind/i.test(all) ||
      /four Masterminds/i.test(all)) {
    counters.add('heavy-hitter');
    counters.add('multi-class');
    counters.add('villain-control');
  }

  // ── Villainowie dostają atak bez wzorca "for each" (np. Eternal Darkness, Splice Humans)
  if (/Villains?.*(get|have|gets?) \+\d+\[Attack\]/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Mechanika [Fateful Resurrection] → heavy-hitter + villain-control
  if (/\[Fateful Resurrection\]/i.test(all)) {
    counters.add('heavy-hitter');
    counters.add('villain-control');
  }

  // ── Mechanika [Circle of Kung-Fu] → heavy-hitter
  if (/\[Circle of Kung-Fu\]/i.test(all)) {
    counters.add('heavy-hitter');
    counters.add('villain-control');
  }

  // ── Villain ally synergy (Villains ekspansja) ─────────────────────────────
  if (/the Lair|Lair Deck|Ally (Deck|Stack)|KO (an? )?Ally/i.test(all)) {
    counters.add('villain-ally-synergy');
  }

  // ── Bystanders są KO-owani lub przechwytywani → bystander-rescue ──────────
  if (/KO (a |all )?Bystander(s)?/i.test(all) ||
      /Bystanders? (are |in the )KO/i.test(all) ||
      /Bystanders? (carried (off|away)|in the Escape)/i.test(all) ||
      /captures? (a |\d+ )?Bystander/i.test(all) ||
      /\[Hunts? for Victims\]/i.test(all) ||
      /(Evil Wins|Escape Pile).*(Bystander|Bystanders)/i.test(all)) {
    counters.add('bystander-rescue');
  }

  // ── Wyzwania klasowe → multi-class ───────────────────────────────────────
  if (/reveal(s)? (a |an |one )?\[(Tech|Ranged|Strength|Instinct|Covert|X-Men|Avengers|Marvel Knights|S\.H\.I\.E\.L\.D\.)\] Hero or/i.test(all) ||
      /at least (two|three|four|five) of these colou?rs/i.test(all) ||
      /plays? three Heroes? that share a Hero Class/i.test(all)) {
    counters.add('multi-class');
  }

  // ── Mechanika Undercover / Unleash ────────────────────────────────────────
  if (/\[Undercover\]/i.test(all)) {
    counters.add('undercover');
  }
  if (/\[Unleash\]/i.test(all)) {
    counters.add('undercover');
  }

  // ── Mechanika Focus / manipulacja talią ───────────────────────────────────
  if (/\[Focus/i.test(all)) {
    counters.add('top-deck-control');
    counters.add('focus');
  }

  // ── Mechanika Investigate ─────────────────────────────────────────────────
  if (/\[Investigate\]/i.test(all)) {
    counters.add('top-deck-control');
    counters.add('deck-thinning');
  }

  // ── Size-Changing ──────────────────────────────────────────────────────────
  if (/\[Size-Changing\]/i.test(all)) {
    counters.add('size-changing');
  }

  // ── Mechanika czasowa ─────────────────────────────────────────────────────
  if (/\btime.?stream\b|Purged from the Timestream|temporal/i.test(all)) {
    counters.add('time-travel');
  }

  // ── Artefakty ─────────────────────────────────────────────────────────────
  if (/\[Artifact\]|\[Ritual Artifact\]/i.test(all)) {
    counters.add('artifact-synergy');
  }

  // ── Dark Memories ─────────────────────────────────────────────────────────
  if (/\[Dark Memories\]/i.test(all)) {
    counters.add('dark-memories');
    counters.add('undercover');
  }

  // ── Wound the Mastermind / Wound Villain ──────────────────────────────────
  if (/\[Wound (the Mastermind|a Villain|each Villain)\]/i.test(all)) {
    counters.add('wound-deal');
  }

  // ── Mechanika Empowered (wymaga różnych klas) ─────────────────────────────
  if (/\[Empowered\]/i.test(all)) {
    counters.add('empowered');
    counters.add('multi-class');
  }

  // ── Mechanika Sidekick ────────────────────────────────────────────────────
  if (/\[Sidekick\]/i.test(all)) {
    counters.add('sidekick');
    counters.add('recruit-boost');
  }

  // ── Mechanika Ambush (Villain Deck gra dużo kart / Ambush ability) ─────────
  if (/\[Ambush\]|Ambush:|Ambush ability/i.test(all)) {
    counters.add('ambush');
    counters.add('villain-control');
  }

  // ── Mechanika Conqueror ───────────────────────────────────────────────────
  if (/\[Conqueror|\bConqueror \d/i.test(all)) {
    counters.add('conqueror');
  }

  // ── Mechanika Savior ──────────────────────────────────────────────────────
  if (/\[Savior\]/i.test(all)) {
    counters.add('savior');
  }

  // ── Transform scheme ──────────────────────────────────────────────────────
  if (/Scheme \[Transforms?\]|this Scheme \[Transforms?\]/i.test(all)) {
    counters.add('transform');
  }

  // ── Nie można walczyć z Mastermindem bez Bystyander → bystander-rescue + heavy-hitter
  if (/can'?t fight the Mastermind.*Bystander|Bystander.*fight.*Mastermind/i.test(all)) {
    counters.add('bystander-rescue');
    counters.add('heavy-hitter');
  }

  // ── Artifact card (Infinity Gems, Cursed Pages, itp.) → artifact-synergy
  if (/Artifact card|Infinity Gem Artifact/i.test(all)) {
    counters.add('artifact-synergy');
    counters.add('villain-control');
  }

  // ── Zniszczenie przestrzeni miejskiej → location-control + villain-control
  if (/Destroy (the )?city space|city is destroyed|city space.*Destroy/i.test(all)) {
    counters.add('location-control');
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Wrogowie ponownie wchodzą z Victory Pile → villain-control + heavy-hitter
  if (/(Villain|Adversary) from.*(Victory Pile|your pile).*enters/i.test(all) ||
      /Victory Pile.*enters the (city|Bridge|Sewers|Streets|Bank)/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Mechanika Past (Time Heist) → time-travel
  if (/Past Hero Deck|The Past.*city|Past HQ/i.test(all)) {
    counters.add('time-travel');
    counters.add('villain-control');
  }

  // ── [Moonlight] / [Sunlight] mechanics → villain-control
  if (/\[Moonlight\]|\[Sunlight\]/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Heroes w Villain Deck (elastyczne) → villain-control + recruit-boost
  if (/\d+ cards? of (a |an )?(extra |random )?Hero.*Villain Deck/i.test(all) ||
      /Heroes? .*in the Villain Deck/i.test(all)) {
    counters.add('villain-control');
    counters.add('recruit-boost');
  }

  // ── Henchmen/Villains piętrzą się obok Masterminda → villain-control + heavy-hitter
  if (/Henchman.*next to the Mastermind|next to the Mastermind.*Henchman/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Villain capture hero cards → heavy-hitter + deck-thinning
  if (/captures? a non-grey Hero|captures? (a |the )?Hero from (your|a player)/i.test(all)) {
    counters.add('heavy-hitter');
    counters.add('villain-control');
    counters.add('deck-thinning');
  }

  // ── Wydaj [Attack] by zapieczętować lub uniknąć → heavy-hitter
  if (/spend \d?\[Attack\] (to|each)/i.test(all) ||
      /\d+\[Attack\] (to Seal|for the escape)/i.test(all)) {
    counters.add('heavy-hitter');
  }

  // ── Klasy bohaterów KOowane z HQ (Hydra Helicarriers) → multi-class + recruit-boost
  if (/Hero Class(es)?.*KO|KO.*Hero Class(es)?/i.test(all) ||
      /\[Strength\].*\[Instinct\].*\[Covert\].*\[Tech\].*\[Ranged\]/i.test(all)) {
    counters.add('multi-class');
    counters.add('recruit-boost');
    counters.add('deck-thinning');
  }

  // ── Villain ucieka z przestrzeni miejskiej → villain-control
  if (/Any Villain (there |There )?escapes/i.test(all) ||
      /Villain(s?).*escapes? from (the|a) city/i.test(all)) {
    counters.add('villain-control');
  }

  // ── Bystyanders jako Jurorzy / element punktacji → bystander-rescue
  if (/Bystander(s?).*Juror|Juror.*Bystander|Bystander(s?).*as.*Jurors?/i.test(all)) {
    counters.add('bystander-rescue');
    counters.add('heavy-hitter');
    counters.add('villain-control');
  }

  // ── Bindings (mechnika Villains exp. — Binding = rodzaj rany/odrzucenia) → discard-attack
  if (/\bBinding(s)?\b/i.test(all)) {
    counters.add('discard-attack');
  }

  // ── Overrun Pile (Villains expansion) → villain-control
  if (/Overrun Pile/i.test(all)) {
    counters.add('villain-control');
  }

  // ── VP zdobywane aktywnie jako warunek zagrożenia → heavy-hitter + villain-control
  if (/Victory Points this turn|get any Victory Points/i.test(all)) {
    counters.add('heavy-hitter');
    counters.add('villain-control');
  }

  // ── Schemat "znikającego" (Enigma, guessing) → top-deck-control
  if (/guess (the )?color|face.down.*Enigma|mix up.*face.down/i.test(all)) {
    counters.add('top-deck-control');
  }

  // ── Villain kontroluje przestrzeń miejską → villain-control
  if (/Villain(s?)? (on|in) the (Streets|Bridge|Sewers|Bank)/i.test(all)) {
    counters.add('villain-control');
  }

  // ── Bystanders/Galactic Jurors jako punkt trwania schematu → bystander-rescue
  if (/Bystander(s?).*next to the Scheme.*face down|face down.*Bystander.*Scheme/i.test(all)) {
    counters.add('bystander-rescue');
  }

  // ── Schematy z losowymy Horrorami (Horror of Horrors) → villain-control
  if (/Play a random Horror|random Horror\./i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Blood Frenzy / Vampire (mechanika Midnight Chronicles) ────────────────
  if (/\[Blood Frenzy\]/i.test(all)) {
    counters.add('villain-control');
    counters.add('bystander-rescue');
  }

  // ── [Throne's Favor] — częste walki z Mastermindem → heavy-hitter ─────────
  if (/\[Throne'?s Favor\]/i.test(all)) {
    counters.add('heavy-hitter');
    counters.add('villain-control');
  }

  // ── Odwrócona waluta (Enemies cost [Recruit], Heroes cost [Attack]) ────────
  if (/Enemies cost \[Recruit\] to fight|Heroes cost \[Attack\] to recruit/i.test(all)) {
    counters.add('recruit-boost');
    counters.add('heavy-hitter');
  }

  // ── Gracze zaczynają z Wound-ami w tali startowej → wound-removal ─────────
  if (/starting deck adds? (a |\d+ )?Wound/i.test(all)) {
    counters.add('wound-removal');
    counters.add('deck-thinning');
  }

  // ── Ujawniane karty z Hero Deck jako hazard / zgadywanie → top-deck-control
  if (/Wagered Soul|Reveal cards? from the Hero Deck.*adding/i.test(all)) {
    counters.add('top-deck-control');
    counters.add('heavy-hitter');
  }

  // ── Zniszczenie przestrzeni TV / HQ space z KO bohatera → recruit-boost
  if (/When all TV is destroyed|KO any Hero in that HQ space/i.test(all)) {
    counters.add('recruit-boost');
    counters.add('deck-thinning');
    counters.add('location-control');
  }

  // ── Osobne "Reality" / grupy Villainów jako odrębne talie → villain-control
  if (/each Villain Group.*Reality|Reality.*destroyed|as its own.*Reality/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Villain wchodzi z dowolnego miejsca / Victory Pile → villain-control
  if (/enters (the city|a city space) from wherever/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Wedding Hero Stack / Secondary hero deck z KO → recruit-boost
  if (/Wedding Hero Stack|KO two cards from the top of each/i.test(all)) {
    counters.add('recruit-boost');
    counters.add('deck-thinning');
  }

  // ── Non-grey Ally mechanic (Villains expansion) → villain-ally-synergy ────
  if (/non-grey Ally/i.test(all)) {
    counters.add('villain-ally-synergy');
  }

  // ── Adversary pilnuje Bystanders → bystander-rescue + villain-control ─────
  if (/guards \d+ Bystanders|Adversary.*guards|Adversary.*Bridge.*Bystander/i.test(all)) {
    counters.add('bystander-rescue');
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── VP cards zakopywane w Victory Pile → villain-control + heavy-hitter ───
  if (/Victory Pile face down|put.*Victory Pile.*face down/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Bohatera z ręki trafia do dodatkowej puli → deck-thinning ────────────
  if (/non-grey Hero from your hand.*Pile|from your hand.*Mutation/i.test(all)) {
    counters.add('deck-thinning');
    counters.add('recruit-boost');
  }

  // ── Hulk Deck / Prison Ship (Hulk schemes) → recruit-boost ───────────────
  if (/Hulk Deck|Prison Ship/i.test(all)) {
    counters.add('recruit-boost');
    counters.add('heavy-hitter');
  }

  // ── Zapłać [Recruit] by uniknąć twista → recruit-boost ───────────────────
  if (/you may pay \d+\[Recruit\]/i.test(all)) {
    counters.add('recruit-boost');
  }

  return [...counters].sort();
}

// ─── Derywacja countersNeeded dla Masterminda ────────────────────────────────
/**
 * Na podstawie tekstów Master Strike i kart Taktyk określa,
 * jakie zdolności bohaterów są potrzebne do walki z tym mastermindem.
 * Logika: co mastermind ROBI graczom → jakie zdolności to kontrują.
 */
function deriveMastermindCounters(cards: RawMastermindCard[]): string[] {
  const all = cards.map(c => c.abilities).join('\n');
  const counters = new Set<string>();

  // ── Wound effects (any strike type) ──────────────────────────────────────
  if (/(Master Strike|Command Strike|Fight):.*gain(s)? (a |two )?Wound/i.test(all) ||
      /or gain(s)? (a |two )?Wound/i.test(all) ||
      /\[Finish the Prey\]|gains two Wounds/i.test(all)) {
    counters.add('wound-removal');
  }
  if (/puts? (a |two )?Wound(s)? from.*discard.*(on top|onto)/i.test(all) ||
      /discards? (that many|.*number of Wounds)/i.test(all)) {
    counters.add('wound-removal');
    counters.add('extra-draws');
  }
  if (/Escape:.*gains? (a |two )?Wound/i.test(all)) {
    counters.add('wound-removal');
    counters.add('heavy-hitter');
  }

  // ── Discard effects ───────────────────────────────────────────────────────
  if (/(Master Strike|Command Strike):.*discard(s)?/i.test(all) ||
      /discard(s)? down to (four|five|six|\d) cards?/i.test(all) ||
      /discard(s)? (all|their|their entire) (hand|cards?)/i.test(all) ||
      /\[Demonic Bargain\].*discard/i.test(all) ||
      /discard(s)? half/i.test(all)) {
    counters.add('extra-draws');
  }
  if (/discard(s)? half/i.test(all)) counters.add('recruit-boost');

  // ── Class-specific targeting → multi-class ───────────────────────────────
  if (/(discard(s)?|KO(s)?) (a |an |one )?\[(Covert|Strength|Instinct|Ranged|Tech|X-Men|Marvel Knights|SHIELD|Avengers)\]/i.test(all) ||
      /reveals? (a |an |one )?\[(X-Men|Marvel Knights|SHIELD|Avengers|Covert|Strength|Instinct|Ranged|Tech)\].*(Hero|Ally).*(or gain|or discard|or KO|or put|or gains)/i.test(all)) {
    counters.add('multi-class');
  }

  // ── S.H.I.E.L.D. Clearance (trzeba odrzucić Hero S.H.I.E.L.D./HYDRA, by walczyć) → shield-synergy
  if (/S\.H\.I\.E\.L\.D\. Clearance/i.test(all)) counters.add('shield-synergy');

  // ── KO / deck-thinning effects ────────────────────────────────────────────
  if (/(Master Strike|Command Strike):.*KO(s|'?s)?/i.test(all) ||
      /Fight:.*KO(s)? (a |one |two |up to two )?(non-grey )?Hero(es)?/i.test(all) ||
      /puts? (a |one )?.*(Hero|Ally).*(Threat Analysis|Bound Souls|Telepathic Pawn|next to)/i.test(all) ||
      /KO(s)? (a |one )?cards? that cost(s)? [12]/i.test(all) ||
      /\[Demonic Bargain\].*KO/i.test(all)) {
    counters.add('deck-thinning');
  }
  if (/discards? (their|your) deck|discard(s)? (their|your) entire/i.test(all)) {
    counters.add('extra-draws'); counters.add('deck-thinning'); counters.add('recruit-boost');
  }

  // ── Villain mechanics ─────────────────────────────────────────────────────
  if (/gets \+\d+\[Attack\] for each (other )?Villain/i.test(all) ||
      /gets \+\d+\[Attack\] for each.*(city|Escape Pile)/i.test(all) ||
      /for each.*(in the city|in the Overrun Pile)/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }
  if (/Fight:.*enters? (the city|a city space)/i.test(all) ||
      /Villain(s)? (there )?escape(s)?|Destroy (the )?city space/i.test(all) ||
      /\[charges?\]|charges? (one|two|three|\d+) space/i.test(all)) {
    counters.add('villain-control');
  }

  // ── Multi-class requirements ──────────────────────────────────────────────
  if (/\[Cosmic Threat\]/i.test(all)) { counters.add('multi-class'); counters.add('heavy-hitter'); }
  if (/\[Adapt\]/i.test(all) || /may either recruit or attack this turn/i.test(all)) {
    counters.add('multi-class');
  }
  if (/may either recruit or attack this turn/i.test(all)) counters.add('heavy-hitter');
  if (/\[Brotherhood\].*or gains? (a )?Bindings?|reveals?.*or gains? (a )?Bindings?/i.test(all)) {
    counters.add('multi-class');
  }

  // ── Special mechanics ─────────────────────────────────────────────────────
  if (/\[Conqueror|Conqueror \d/i.test(all)) counters.add('conqueror');
  if (/\[Wound the Mastermind\]|\[Wound Mastermind\]/i.test(all)) counters.add('wound-deal');
  if (/\[Cyber-Mod\]/i.test(all)) counters.add('undercover');
  if (/Man (or Woman )?Out of Time|Woman Out of Time|Time Incursion|take another turn/i.test(all)) {
    counters.add('time-travel');
  }
  if (/Bystander Stack.*ascends|ascends.*Bystander Stack|from the Bystander Stack/i.test(all)) {
    counters.add('bystander-rescue');
  }
  if (/(Master Strike|Fight):.*KO(s)?.*(Bystander|bystanders)/i.test(all)) counters.add('bystander-control');
  if (/(Master Strike|Fight):.*KO(s)? (a |one )?(Villain|Hydra|Warbound)/i.test(all)) counters.add('heavy-hitter');
  if (/Heroes? from the HQ (into|to) (the|your)|put.*Hero.*from.*HQ/i.test(all)) {
    counters.add('recruit-boost'); counters.add('top-deck-control');
  }
  if (/Command Strike:.*\[demolish\]/i.test(all)) { counters.add('discard-attack'); counters.add('extra-draws'); }
  if (/(Scheme Twist|Master Strike).*on top of (the Villain|that) Deck/i.test(all) ||
      /Play all the Master Strikes/i.test(all) ||
      /Shuffle this Master Strike into|becomes a Mastermind Tactic/i.test(all)) {
    counters.add('heavy-hitter');
  }
  if (/\[Fateful Resurrection\]/i.test(all)) counters.add('heavy-hitter');
  if (/Telepathic Pawn|gets \+\d+\[Attack\] for each (Ally|card) stacked/i.test(all)) {
    counters.add('deck-thinning'); counters.add('heavy-hitter');
  }

  // ── Attack level ──────────────────────────────────────────────────────────
  const attackValues = [...all.matchAll(/\b(\d+)\[Attack\]/g)].map(m => parseInt(m[1]));
  const maxAttack = attackValues.length ? Math.max(...attackValues) : 0;
  if (maxAttack >= 8) { counters.add('heavy-hitter'); counters.add('recruit-boost'); }
  else if (maxAttack >= 6) { counters.add('heavy-hitter'); }

  // ── Fallback ──────────────────────────────────────────────────────────────
  if (counters.size === 0 && maxAttack >= 5) counters.add('heavy-hitter');

  return [...counters].sort();
}

// ─── Ekstrakcja "Always Leads" z abilities masterminda ───────────────────────
function extractAlwaysLeads(cards: RawMastermindCard[]): string {
  const nonEpic = cards.find(c => !c.isEpic);
  if (!nonEpic) return '';
  const match = nonEpic.abilities.match(/Always Leads?:\s*(.+?)(?:\n|$)/i);
  return match ? match[1].trim() : '';
}

// ─── Derywacja countersNeeded dla Grupy Villainów ────────────────────────────
/**
 * Analizuje WSZYSTKIE karty grupy łotrów razem i określa,
 * jakie zdolności bohaterów są potrzebne by skutecznie ją skontrować.
 * Logika: co cała grupa ROBI graczom/miastu → jakie zdolności to kontrują.
 */
function deriveVillainGroupCounters(cards: RawVillainCard[]): string[] {
  const all = cards.map(c => c.abilities).join('\n');
  const counters = new Set<string>();

  // ── Maksymalna siła ataku grupy ───────────────────────────────────────────
  const attackValues = cards.map(c => c.vAttackNumeric ?? 0);
  const maxAttack = Math.max(0, ...attackValues);
  if (maxAttack >= 9) { counters.add('heavy-hitter'); counters.add('aoe'); }
  else if (maxAttack >= 6) counters.add('heavy-hitter');
  else if (maxAttack >= 4) {/* attack alone is medium — wait for other signals */}

  // ── Rany zadawane graczom → wound-removal ─────────────────────────────────
  if (/(Ambush|Fight|Escape):.*gain(s)? (a |two |three )?(Wound)/i.test(all) ||
      /each player gain(s)? (a |two )?Wound/i.test(all) ||
      /or gain(s)? (a |two )?Wound/i.test(all) ||
      /divid(e|ing).*Wound(s)?.*player/i.test(all)) {
    counters.add('wound-removal');
  }

  // ── Efekty odrzucania kart → extra-draws ─────────────────────────────────
  if (/each player discards?/i.test(all) ||
      /(Ambush|Fight|Escape):.*discard(s)? (a |one |two |non-grey |all |cards? |a card)/i.test(all) ||
      /discard.*down to/i.test(all)) {
    counters.add('extra-draws');
  }

  // ── KO bohaterów gracza → deck-thinning + recruit-boost ──────────────────
  if (/Fight:.*KO (one of |a |your )(non-grey )?Hero(es)?/i.test(all) ||
      /Escape:.*KO (one of |a |your )?Hero(es)?/i.test(all) ||
      /KO (one of )?your Heroes?/i.test(all) ||
      /each player.*KO.*Hero/i.test(all)) {
    counters.add('deck-thinning');
    counters.add('recruit-boost');
  }

  // ── Bohaterowie odsyłani na dno talii / z HQ → recruit-boost ─────────────
  if (/on the bottom of (the |your )?Hero Deck/i.test(all) ||
      /Hero.*bottom of.*Hero Deck/i.test(all)) {
    counters.add('recruit-boost');
  }

  // ── Przechwytywanie Bystanders → bystander-rescue ─────────────────────────
  if (/captures? (a |one |\d+ )?Bystander/i.test(all) ||
      /KO (a |the )?Bystander from (each player|your Victory)/i.test(all)) {
    counters.add('bystander-rescue');
  }

  // ── Kolejne Villainowe wchodzą do miasta → villain-control ───────────────
  if (/(Ambush|Fight):.*enters? (the city|a city space|the Bridge|the Sewers)/i.test(all) ||
      /Villain.*enters? the city|Henchman.*enters? (the )?city/i.test(all)) {
    counters.add('villain-control');
  }

  // ── Villain wraca do talii / ponownie wchodzi → villain-control + heavy-hitter
  if (/shuffle.*back into the Villain Deck|reenter(s)? the city/i.test(all) ||
      /Villain.*Deck.*and play|put.*back.*Villain Deck/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Mechanika Momentum (przyspieszają) → villain-control + heavy-hitter ──
  if (/\[Momentum/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Empowered by class → multi-class + empowered ─────────────────────────
  if (/\[Empowered\] by \[|\[Double Empowered\]/i.test(all)) {
    counters.add('empowered');
    counters.add('multi-class');
  }

  // ── S.H.I.E.L.D. Clearance (trzeba odrzucić Hero S.H.I.E.L.D./HYDRA, by walczyć) → shield-synergy
  if (/S\.H\.I\.E\.L\.D\. Clearance/i.test(all)) counters.add('shield-synergy');

  // ── "Reveals X Hero or gains Wound" → multi-class + wound-removal ─────────
  if (/reveal(s)? (a |an |one )?\[(Tech|Ranged|Strength|Instinct|Covert)\] Hero or/i.test(all)) {
    counters.add('multi-class');
    if (!counters.has('wound-removal')) counters.add('wound-removal');
  }

  // ── Mechanika Undercover / Dark Memories → undercover ────────────────────
  if (/\[Dark Memories\]/i.test(all)) {
    counters.add('undercover');
    counters.add('dark-memories');
  }
  if (/send.*\[Undercover\]|Heroes?.*\[Undercover\]|\[Unleash\]/i.test(all)) {
    counters.add('undercover');
  }

  // ── Mechanika Man/Woman Out of Time → time-travel ────────────────────────
  if (/\[Man Out of Time\]|\[Man or Woman Out of Time\]|\[Woman Out of Time\]|Man Out of Time/i.test(all)) {
    counters.add('time-travel');
    counters.add('undercover');
  }

  // ── Mechanika Conqueror (zdobywają przestrzenie) → conqueror + villain-control
  if (/Conqueror \d|\[.*Conqueror/i.test(all)) {
    counters.add('conqueror');
    counters.add('villain-control');
  }

  // ── Villain przechwytuje bohatera z talii/odrzuconych → heavy-hitter + deck-thinning
  if (/captures? (a |the |one )?non-grey Hero/i.test(all) ||
      /captures? (the )?Hero|captures? (a|the) card from (your|any player)/i.test(all)) {
    counters.add('heavy-hitter');
    counters.add('deck-thinning');
    counters.add('villain-control');
  }

  // ── Master Strike manipulation (wstrzykuje do talii) → extra-draws + villain-control
  if (/Master Strike.*Villain Deck|shuffle.*Master Strike.*into/i.test(all)) {
    counters.add('extra-draws');
    counters.add('villain-control');
  }

  // ── Mechanika "Wound the Villain" (zranić wroga) → wound-deal + heavy-hitter
  if (/\[Wound (Villain|him|her|them|it)\]|spend.*\[Attack\].*to \[Wound/i.test(all)) {
    counters.add('wound-deal');
    counters.add('heavy-hitter');
  }

  // ── Villain staje się Scheme Twist → transform + heavy-hitter ────────────
  if (/becomes? (a )?Scheme Twist/i.test(all)) {
    counters.add('transform');
    counters.add('heavy-hitter');
  }

  // ── Mechanika [Size-Changing] → size-changing ─────────────────────────────
  if (/\[Microscopic Size-Changing\]|\[Size-Changing\]/i.test(all)) {
    counters.add('size-changing');
  }

  // ── Mechanika [Chivalrous Duel] (Medieval) → multi-class + heavy-hitter ──
  if (/\[Chivalrous Duel\]/i.test(all)) {
    counters.add('multi-class');
    counters.add('heavy-hitter');
  }

  // ── Mechanika [Savior] → savior ───────────────────────────────────────────
  if (/\[Savior\]/i.test(all)) {
    counters.add('savior');
    counters.add('bystander-rescue');
  }

  // ── Villain od Henchmanów ponownie wchodzi → henchman-synergy + villain-control
  if (/Henchman.*Victory Pile.*enters|from.*Victory Pile.*Henchman/i.test(all) ||
      /Henchman Villain.*enter(s)? (the city|a city)/i.test(all)) {
    counters.add('henchman-synergy');
    counters.add('villain-control');
  }

  // ── Villain z Victory Pile ponownie wchodzi → villain-control + heavy-hitter
  if (/(Ambush|Fight|Escape):.*Villain from.*Victory Pile.*enters/i.test(all) ||
      /from.*Victory Pile.*enter(s)? (the )?city/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── Mechanika [Blood Frenzy] (Vampire) → bystander-rescue + villain-control
  if (/\[Blood Frenzy\]/i.test(all)) {
    counters.add('bystander-rescue');
    counters.add('villain-control');
  }

  // ── Mechanika Ally / Lair (Villains expansion) → villain-ally-synergy ─────
  if (/\[Ally\]|Ally (Deck|Stack)|the Lair/i.test(all)) {
    counters.add('villain-ally-synergy');
  }

  // ── Mechanika Focus → top-deck-control ───────────────────────────────────
  if (/\[Focus/i.test(all)) {
    counters.add('top-deck-control');
    counters.add('focus');
  }

  // ── Artefakty → artifact-synergy ─────────────────────────────────────────
  if (/\[Artifact\]|\[Thrown Artifact\]|\[Uru-Enchanted/i.test(all)) {
    counters.add('artifact-synergy');
  }

  // ── Mechanika [Demolish] → discard-attack + extra-draws ──────────────────
  if (/\[Demolish\]/i.test(all)) {
    counters.add('discard-attack');
    counters.add('extra-draws');
  }

  // ── Gracz musi coś ujawnić lub zapłacić extra → top-deck-control ──────────
  if (/To fight.*you must also/i.test(all)) {
    counters.add('top-deck-control');
  }

  // ── Fight / Ambush powoduje zagranie kolejnych kart z Villain Deck → villain-control
  if (/(Fight|Ambush):.*[Pp]lay (the )?top (two|three|\d+) cards? (from |of )(the )?Villain Deck/i.test(all) ||
      /Ambush:.*[Pp]lay another card from the Villain Deck/i.test(all)) {
    counters.add('villain-control');
  }

  // ── Bohater przechwycony i umieszczony pod/obok Villainem → villain-control + recruit-boost
  if (/put.*Hero.*from the HQ (under|beneath|next to)/i.test(all) ||
      /Hero.*under this Villain|under this.*Villain.*Hero/i.test(all)) {
    counters.add('villain-control');
    counters.add('recruit-boost');
  }

  // ── Mechanika [Prey] / Finish the Prey (klasy jako cel) → multi-class + deck-thinning
  if (/\[Prey\]|Finish the Prey|\[Finish the Prey\]/i.test(all)) {
    counters.add('multi-class');
    counters.add('deck-thinning');
    counters.add('villain-control');
  }

  // ── Mechanika [Demonic Bargain] → wound-removal + villain-control ─────────
  if (/\[Demonic Bargain\]/i.test(all)) {
    counters.add('wound-removal');
    counters.add('villain-control');
  }

  // ── Infinity Gem Artifacts (stają się Artefaktami) → artifact-synergy ─────
  if (/becomes? (an? )?Artifact|into.*Artifact|\[Artifact -\]|Fight: Put this.*Artifact/i.test(all)) {
    counters.add('artifact-synergy');
    counters.add('villain-control');
  }

  // ── By End of Turn (Murderworld - wyzwania rekrutacji/Bystanders) ──────────
  if (/By End of Turn:.*[Rr]ecruit|Or Suffer:.*[Rr]ecruit/i.test(all)) {
    counters.add('recruit-boost');
  }
  if (/Or Suffer:.*Bystander|By End of Turn.*Bystander/i.test(all)) {
    counters.add('bystander-rescue');
  }
  if (/Or Suffer:.*Villain.*enters|Or Suffer:.*[Pp]lay/i.test(all)) {
    counters.add('villain-control');
  }

  // ── Mechanika Bindings (Villains expansion — kary odrzucania) → discard-attack
  if (/\bBinding(s)?\b/i.test(all)) {
    counters.add('discard-attack');
    counters.add('villain-ally-synergy');
  }

  // ── Overrun / Lair mechanic (Villains expansion) → villain-ally-synergy ───
  if (/\bOverrun\b|Overrun:/i.test(all)) {
    counters.add('villain-ally-synergy');
  }

  // ── Mechanika Abomination → multi-class (synergizuje z klasami) ───────────
  if (/\[Abomination\]/i.test(all)) {
    counters.add('multi-class');
  }

  // ── Escape niszczy przestrzeń miejską → location-control + heavy-hitter ──
  if (/Escape:.*Destroy (the )?city space/i.test(all)) {
    counters.add('location-control');
    counters.add('heavy-hitter');
  }

  // ── Fallback: jeśli brak sygnałów a mają wysoki atak → heavy-hitter ───────
  if (counters.size === 0 && maxAttack >= 4) {
    counters.add('heavy-hitter');
  }
  // Absolutny fallback: każda grupa jest zagrożeniem dla miasta
  if (counters.size === 0) {
    counters.add('villain-control');
  }

  return [...counters].sort();
}

// ─── Derive countersNeeded for Henchman Group ────────────────────────────────
/**
 * Analyzes all cards in a henchman group and determines what hero abilities
 * are needed to effectively counter them.
 * Logic: what the henchman group DOES to players/city → what abilities counter it.
 */
function deriveHenchmanCounters(cards: RawHenchmanCard[], vAttackNumeric: number | null | undefined): string[] {
  const all = cards.map(c => c.abilities).join('\n');
  const counters = new Set<string>();

  // ── Group-level attack value → heavy-hitter ───────────────────────────────
  const groupAttack = vAttackNumeric ?? 0;
  if (groupAttack >= 4) counters.add('heavy-hitter');

  // ── Fight: KO one of your Heroes → deck-thinning + recruit-boost ─────────
  if (/Fight:.*KO (one of (your|your own) |a |your )(non-grey )?Hero/i.test(all) ||
      /KO (one of )?your Heroes?/i.test(all)) {
    counters.add('deck-thinning');
    counters.add('recruit-boost');
  }

  // ── Fight: KO a card from your discard → deck-thinning ───────────────────
  if (/KO (a |one )?card(s)? from your (discard|hand|deck)/i.test(all) ||
      /KO (it|one of them) and put the (other|rest) back/i.test(all) ||
      /Look at the top.+KO one of them/i.test(all)) {
    counters.add('deck-thinning');
  }

  // ── Fight: draw a card / extra draw → extra-draws ─────────────────────────
  if (/draw (a|an extra|extra|\d+) card/i.test(all) ||
      /draw a new hand.*draw an extra card/i.test(all)) {
    counters.add('extra-draws');
  }

  // ── Fight: +1 Recruit → recruit-boost ────────────────────────────────────
  if (/you get \+\d+\[Recruit\]/i.test(all) ||
      /Gain a \[New Recruit\]/i.test(all)) {
    counters.add('recruit-boost');
  }

  // ── Ambush: captures a Bystander → bystander-rescue ──────────────────────
  if (/captures? (a |one )?Bystander/i.test(all) ||
      /Ambush:.*Bystander/i.test(all)) {
    counters.add('bystander-rescue');
  }

  // ── Ambush: another Villain enters the city → villain-control ────────────
  if (/Ambush:.*(enters? (the city|a city space)|move this)/i.test(all) ||
      /Villain.*enters? (the city|a city)/i.test(all)) {
    counters.add('villain-control');
  }

  // ── [Empowered] by class → empowered + multi-class ───────────────────────
  if (/\[Empowered\] by \[/i.test(all)) {
    counters.add('empowered');
    counters.add('multi-class');
  }

  // ── S.H.I.E.L.D. Clearance (trzeba odrzucić Hero S.H.I.E.L.D./HYDRA, by walczyć) → shield-synergy
  if (/S\.H\.I\.E\.L\.D\. Clearance/i.test(all)) counters.add('shield-synergy');

  // ── Reveal X class Hero or KO → multi-class ──────────────────────────────
  if (/[Rr]eveal (a |an |one )?\[(Tech|Ranged|Strength|Instinct|Covert)\] Hero or/i.test(all)) {
    counters.add('multi-class');
    if (!counters.has('wound-removal')) counters.add('wound-removal');
  }

  // ── [Clone] mechanic → villain-control ───────────────────────────────────
  if (/\[Clone\]/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── [Conqueror] mechanic → conqueror + villain-control ───────────────────
  if (/\[.*Conqueror/i.test(all) || /Conqueror \d/i.test(all)) {
    counters.add('conqueror');
    counters.add('villain-control');
  }

  // ── [Size-Changing] / [Microscopic Size-Changing] → size-changing ─────────
  if (/\[Microscopic Size-Changing\]|\[Size-Changing\]/i.test(all)) {
    counters.add('size-changing');
  }

  // ── [Shard] mechanic (Guardians expansion) → villain-control ─────────────
  if (/\[Shard\]|Burn \d+ Shards/i.test(all)) {
    counters.add('villain-control');
  }

  // ── Gain a [New Recruit] → recruit-boost (already handled above) ──────────

  // ── Discard effects → extra-draws ────────────────────────────────────────
  if (/each player discards?/i.test(all) ||
      /(Ambush|Fight):.*discard(s)? (a |the top |their )/i.test(all)) {
    counters.add('extra-draws');
  }

  // ── [Liberate] mechanic → bystander-rescue ───────────────────────────────
  if (/\[Liberate/i.test(all)) {
    counters.add('bystander-rescue');
    counters.add('heavy-hitter');
  }

  // ── [Fateful Resurrection] → heavy-hitter ────────────────────────────────
  if (/\[Fateful Resurrection\]/i.test(all)) {
    counters.add('heavy-hitter');
  }

  // ── [Rise of The Living Dead] → villain-control + heavy-hitter ───────────
  if (/\[Rise of The Living Dead\]/i.test(all)) {
    counters.add('villain-control');
    counters.add('heavy-hitter');
  }

  // ── [Outwit] mechanic → deck-thinning ────────────────────────────────────
  if (/\[Outwit\]/i.test(all)) {
    counters.add('deck-thinning');
  }

  // ── [Feast] mechanic → deck-thinning + recruit-boost ─────────────────────
  if (/\[Feast\]/i.test(all)) {
    counters.add('deck-thinning');
    counters.add('recruit-boost');
  }

  // ── Villain Deck manipulation → villain-control ───────────────────────────
  if (/put this Villain on the bottom of the Villain Deck/i.test(all) ||
      /shuffle.*Villain Deck/i.test(all)) {
    counters.add('villain-control');
  }

  // ── [Explore] mechanic → top-deck-control ────────────────────────────────
  if (/\[Explore\]/i.test(all)) {
    counters.add('top-deck-control');
  }

  // ── Fallback: every henchman group threatens the city
  if (counters.size === 0) {
    counters.add('heavy-hitter');
  }

  return [...counters].sort();
}

// ─── Migracja ─────────────────────────────────────────────────────────────────
function migrate(): CardsDatabase {
  const rawExpansions = readJson<RawExpansion[]>('expansions.json');
  const rawHeroes = readJson<RawHero[]>('hero.json');
  const rawMasterminds = readJson<RawMastermind[]>('mastermind.json');
  const rawSchemes = readJson<RawScheme[]>('scheme.json');
  const rawVillains = readJson<RawVillain[]>('villain.json');
  const rawHenchmen = readJson<RawHenchman[]>('henchman.json');

  const expansions: Expansion[] = rawExpansions.map(e => ({
    id: e.id,
    label: e.label,
    value: e.value,
    initials: e.initials,
    cardTypes: e.cardTypes,
  }));

  const heroes: Hero[] = rawHeroes.map(h => ({
    id: h.id,
    name: h.name,
    expansionId: h.setId,
    faction: h.teamLabel ?? '',
    primaryClasses: derivePrimaryClasses(h.cards),
    keywords: deriveKeywords(h.cards),
    powerLevel: 3 as const,
    countersProvided: deriveCounters(h.cards),
    cards: h.cards.map(c => ({
      name: c.name,
      quantity: c.quantity,
      cost: c.cost,
      class: c.class as HeroClass,
      attack: c.attack,
      recruit: c.recruit,
      abilities: c.abilities,
    } satisfies HeroCard)),
  }));

  const masterminds: Mastermind[] = rawMasterminds.map(m => ({
    id: m.id,
    name: m.name,
    expansionId: m.setId,
    difficulty: 3 as const,
    alwaysLeads: extractAlwaysLeads(m.cards),
    theme: '',
    vp: m.vp ?? null,
    countersNeeded: deriveMastermindCounters(m.cards),
    cards: m.cards.map(c => ({
      name: c.name,
      isEpic: c.isEpic,
      abilities: c.abilities,
    } satisfies MastermindCard)),
  }));

  const schemes: Scheme[] = rawSchemes.map(s => ({
    id: s.id,
    name: s.name,
    expansionId: s.setId,
    difficulty: 3 as const,
    countersNeeded: deriveSchemeCounters(s.cards),
    overrides: {},
    cards: s.cards.map(c => ({
      name: c.name,
      abilities: c.abilities,
    } satisfies SchemeCard)),
  }));

  const villains: VillainGroup[] = rawVillains.map(v => ({
    id: v.id,
    name: v.name,
    expansionId: Array.isArray(v.setId) ? v.setId[0] : v.setId,
    theme: '',
    countersNeeded: deriveVillainGroupCounters(v.cards),
    cards: v.cards.map(c => ({
      name: c.name,
      qtd: c.qtd ?? null,
      vAttack: c.vAttack ?? null,
      vAttackNumeric: c.vAttackNumeric ?? null,
      vp: c.vp ?? null,
      vpRaw: c.vpRaw ?? null,
      isEpic: c.isEpic ?? false,
      abilities: c.abilities,
    } satisfies VillainCard)),
  }));

  const henchmen: Henchman[] = rawHenchmen.map(h => ({
    id: h.id,
    name: h.name,
    expansionId: Array.isArray(h.setId) ? h.setId[0] : h.setId,
    countersNeeded: deriveHenchmanCounters(h.cards, h.vAttackNumeric),
    cards: h.cards.map(c => ({
      name: c.name,
      qtd: c.qtd ?? null,
      vAttack: c.vAttack ?? null,
      vAttackNumeric: c.vAttackNumeric ?? null,
      abilities: c.abilities,
    } satisfies HenchmanCard)),
  }));

  return { expansions, heroes, masterminds, schemes, villains, henchmen };
}

// ─── Uruchomienie ─────────────────────────────────────────────────────────────
const db = migrate();

// Upewnij się, że katalog istnieje
const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(db, null, 2), 'utf-8');
console.log(`✅ Migracja zakończona!`);
console.log(`   Ekspansje: ${db.expansions.length}`);
console.log(`   Bohaterowie: ${db.heroes.length}`);
console.log(`   Mastermindowie: ${db.masterminds.length}`);
console.log(`   Schematy: ${db.schemes.length}`);
console.log(`   Grupy łotrów: ${db.villains.length}`);
console.log(`   Słudzy: ${db.henchmen.length}`);
console.log(`   Wynik zapisany do: ${outputPath}`);




