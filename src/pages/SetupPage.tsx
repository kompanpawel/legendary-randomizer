import { useState, useMemo } from 'react';
import { Shuffle, ChevronDown, ChevronUp, Zap, Lock } from 'lucide-react';
import cardsData from '../assets/cards.json';
import type { CardsDatabase } from '../types/cards';
import { useAppStore } from '../store/useAppStore';
import { useAllHeroStats } from '../db/hooks/useHeroStats';
import { useTotalMatchCount } from '../db/hooks/useMatchLog';
import { useAllMastermindStats } from '../db/hooks/useMastermindStats';
import { useAllSchemeStats } from '../db/hooks/useSchemeStats';
import { generateSetup, rerollHero } from '../engine/SmartRandomizerEngine';
import { getSetupRules } from '../engine/playerSetupRules';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { ToggleChip } from '../components/ui/ToggleChip';
import { HeroCard } from '../components/game/HeroCard';
import { MastermindCard } from '../components/game/MastermindCard';
import { SchemeCard } from '../components/game/SchemeCard';
import { VillainCard, HenchmanCard } from '../components/game/VillainCard';
import { SaveMatchModal } from '../components/game/SaveMatchModal';

const db = cardsData as unknown as CardsDatabase;

const MODE_OPTIONS = [
  { value: 'smart' as const, label: '\u26a1 Smart', desc: 'Balances plays' },
  { value: 'dustOff' as const, label: '\ud83c\udfd9\ufe0f Shelf', desc: 'Least played' },
  { value: 'synergy' as const, label: '\ud83d\udd17 Synergy', desc: 'Synergy with scheme' },
];

function getBalanceInfo(gap: number) {
  if (gap > 3)  return { color: 'border-red-700/60 bg-red-950/40 text-red-300',         icon: '\ud83d\udc80', label: 'Bardzo trudne',  hint: 'Zagro\u017cenie znacznie silniejsze od dru\u017cyny' };
  if (gap > 1)  return { color: 'border-orange-700/60 bg-orange-950/40 text-orange-300', icon: '\u2694\ufe0f', label: 'Wymagaj\u0105ce', hint: 'Zagro\u017cenie mocniejsze od dru\u017cyny' };
  if (gap > -1) return { color: 'border-zinc-700/60 bg-zinc-800/40 text-zinc-300',      icon: '\u2696\ufe0f', label: 'Wyr\u00f3wnane',    hint: 'Si\u0142a dru\u017cyny i zagro\u017cenia s\u0105 zbli\u017cone' };
  if (gap > -3) return { color: 'border-blue-700/60 bg-blue-950/40 text-blue-300',      icon: '\u2705',        label: '\u0141atwiejsze',  hint: 'Dru\u017cyna nieco silniejsza od zagro\u017cenia' };
  return          { color: 'border-green-700/60 bg-green-950/40 text-green-300',         icon: '\ud83d\ude0e', label: '\u0141atwe',        hint: 'Dru\u017cyna wyraza\u0301nie silniejsza od zagro\u017cenia' };
}

export default function SetupPage() {
  const {
    selectedExpansionIds, toggleExpansion,
    randomizationMode, setMode,
    alpha, playerCount, setPlayerCount,
    currentSetup, setSetup,
    isEpicMastermind, setIsEpicMastermind,
    pinnedMastermindId, setPinnedMastermindId,
    pinnedSchemeId, setPinnedSchemeId,
  } = useAppStore();

  const heroStats       = useAllHeroStats()       ?? [];
  const totalMatches    = useTotalMatchCount()     ?? 0;
  const mastermindStats = useAllMastermindStats()  ?? [];
  const schemeStats     = useAllSchemeStats()      ?? [];
  const [generating, setGenerating]       = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [expansionsOpen, setExpansionsOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);

  const setupRules = getSetupRules(playerCount);

  const activeIds = selectedExpansionIds.length > 0
    ? selectedExpansionIds
    : db.expansions.map((e) => e.id);

  // Wszystkie mastermindowie i schematy dostępne w aktywnych ekspansjach (do dropdownów)
  const availableMasterminds = useMemo(
    () => db.masterminds
      .filter((m) => activeIds.includes(m.expansionId))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [activeIds]
  );
  const availableSchemes = useMemo(
    () => db.schemes
      .filter((s) => activeIds.includes(s.expansionId))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [activeIds]
  );

  // Wybrany mastermind / schemat (z dropdown)
  const pinnedMastermind = pinnedMastermindId
    ? db.masterminds.find((m) => m.id === pinnedMastermindId) ?? null
    : null;
  const pinnedScheme = pinnedSchemeId
    ? db.schemes.find((s) => s.id === pinnedSchemeId) ?? null
    : null;

  // Gdy coś jest przypięte – pula pozostałych kart pochodzi z ekspansji przypiętych kart
  const restrictedExpansionIds = useMemo(() => {
    const pinned: number[] = [];
    if (pinnedMastermind) pinned.push(pinnedMastermind.expansionId);
    if (pinnedScheme) pinned.push(pinnedScheme.expansionId);
    // Unikalne id, ograniczone do aktywnych ekspansji
    return pinned.length > 0
      ? [...new Set(pinned)].filter((id) => activeIds.includes(id))
      : activeIds;
  }, [pinnedMastermind, pinnedScheme, activeIds]);

  const filteredHeroes   = db.heroes.filter((h) => restrictedExpansionIds.includes(h.expansionId));
  const filteredVillains = db.villains.filter((v) => restrictedExpansionIds.includes(v.expansionId));
  const filteredHenchmen = db.henchmen.filter((h) => restrictedExpansionIds.includes(h.expansionId));
  // Mastermindy i schematy – ograniczone do restricted (używane tylko gdy nie są przypięte)
  const filteredMasterminds = db.masterminds.filter((m) => restrictedExpansionIds.includes(m.expansionId));
  const filteredSchemes     = db.schemes.filter((s) => restrictedExpansionIds.includes(s.expansionId));

  const currentMastermindHasEpic = currentSetup?.mastermind.cards.some(c => c.isEpic) ?? false;
  const pinnedMastermindHasEpic  = pinnedMastermind?.cards.some(c => c.isEpic) ?? false;
  const showEpicToggle = currentMastermindHasEpic || pinnedMastermindHasEpic;

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      try {
        const setup = generateSetup({
          heroes: filteredHeroes,
          heroStats,
          mastermindStats,
          schemeStats,
          masterminds: filteredMasterminds,
          schemes: filteredSchemes,
          villains: filteredVillains,
          henchmen: filteredHenchmen,
          totalMatches,
          playerCount,
          alpha,
          mode: randomizationMode,
          isEpicMastermind,
          forcedMastermind: pinnedMastermind ?? undefined,
          forcedScheme: pinnedScheme ?? undefined,
        });
        setSetup(setup);
      } catch (err) {
        console.error(err);
      } finally {
        setGenerating(false);
      }
    }, 300);
  };

  const handleReroll = (heroIndex: number) => {
    if (!currentSetup) return;
    const replacement = rerollHero(
      currentSetup.heroes,
      currentSetup.heroes[heroIndex],
      filteredHeroes,
      heroStats,
      totalMatches,
      alpha,
      randomizationMode,
      currentSetup.threatScore
    );
    const newHeroes = [...currentSetup.heroes];
    newHeroes[heroIndex] = replacement;
    setSetup({ ...currentSetup, heroes: newHeroes });
  };

  const statsMap           = new Map(heroStats.map((s) => [s.heroId, s]));
  const mastermindStatsMap = new Map(mastermindStats.map((s) => [s.mastermindId, s]));
  const schemeStatsMap     = new Map(schemeStats.map((s) => [s.schemeId, s]));

  return (
    <div className="pb-nav">
      <PageHeader title="Legendary Randomizer" subtitle="Generate your setup" />

      <div className="px-4 space-y-4">
        {/* Expansions */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setExpansionsOpen(!expansionsOpen)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div>
              <p className="text-sm font-medium text-white">Expansions</p>
              <p className="text-xs text-zinc-500">
                {selectedExpansionIds.length === 0
                  ? 'All active'
                  : `${selectedExpansionIds.length} of ${db.expansions.length}`}
              </p>
            </div>
            {expansionsOpen
              ? <ChevronUp size={18} className="text-zinc-400" />
              : <ChevronDown size={18} className="text-zinc-400" />}
          </button>
          {expansionsOpen && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {db.expansions.map((exp) => (
                  <ToggleChip
                    key={exp.id}
                    label={exp.label}
                    initials={exp.initials}
                    selected={selectedExpansionIds.includes(exp.id)}
                    onToggle={() => toggleExpansion(exp.id)}
                  />
                ))}
              </div>
              <button
                onClick={() => useAppStore.getState().setExpansions([])}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Clear (use all)
              </button>
            </div>
          )}
        </div>

        {/* Manual pick – Mastermind & Scheme */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setPickOpen(!pickOpen)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Lock size={15} className={pinnedMastermind || pinnedScheme ? 'text-marvel-red' : 'text-zinc-500'} />
              <div>
                <p className="text-sm font-medium text-white">Manual pick</p>
                <p className="text-xs text-zinc-500">
                  {pinnedMastermind || pinnedScheme
                    ? [
                        pinnedMastermind ? pinnedMastermind.name : null,
                        pinnedScheme ? pinnedScheme.name : null,
                      ].filter(Boolean).join(' · ')
                    : 'Both random'}
                </p>
              </div>
            </div>
            {pickOpen
              ? <ChevronUp size={18} className="text-zinc-400" />
              : <ChevronDown size={18} className="text-zinc-400" />}
          </button>
          {pickOpen && (
            <div className="px-4 pb-4 space-y-3">
              {/* Mastermind dropdown */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Mastermind</label>
                <select
                  value={pinnedMastermindId ?? ''}
                  onChange={(e) => setPinnedMastermindId(e.target.value || null)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-marvel-red appearance-none"
                >
                  <option value="">🎲 Random</option>
                  {availableMasterminds.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.cards.some(c => c.isEpic) ? `⚡ ${m.name}` : m.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Scheme dropdown */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Scheme</label>
                <select
                  value={pinnedSchemeId ?? ''}
                  onChange={(e) => setPinnedSchemeId(e.target.value || null)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-marvel-red appearance-none"
                >
                  <option value="">🎲 Random</option>
                  {availableSchemes.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {(pinnedMastermind || pinnedScheme) && (
                <p className="text-xs text-zinc-500 leading-relaxed">
                  🔒 Villains, henchmen &amp; heroes losowane z{' '}
                  {restrictedExpansionIds.length === 1
                    ? `ekspansji: ${db.expansions.find((e) => e.id === restrictedExpansionIds[0])?.label ?? restrictedExpansionIds[0]}`
                    : `${restrictedExpansionIds.length} ekspansji`}
                </p>
              )}
              {(pinnedMastermind || pinnedScheme) && (
                <button
                  onClick={() => { setPinnedMastermindId(null); setPinnedSchemeId(null); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Clear (both random)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Randomization mode */}
        <div className="grid grid-cols-3 gap-2">
          {MODE_OPTIONS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                randomizationMode === m.value
                  ? 'border-marvel-red bg-marvel-red/10 text-white'
                  : 'border-zinc-700 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <p className="text-xs font-semibold">{m.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{m.desc}</p>
            </button>
          ))}
        </div>

        {/* Player count */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Players</h2>
            <span className="text-xs text-zinc-500">
              {(() => {
                const activeHeroMod = currentSetup?.schemeHeroMod ?? 0;
                const effectiveHeroCount = setupRules.heroCount + activeHeroMod;
                return (
                  <>
                    {effectiveHeroCount > setupRules.heroCount
                      ? <span className="text-amber-400 font-semibold">{effectiveHeroCount}h</span>
                      : <span>{effectiveHeroCount}h</span>
                    }
                    {' \u00b7 '}{setupRules.villainCount}v{' \u00b7 '}{setupRules.henchmanCount}hm
                  </>
                );
              })()}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                  playerCount === n
                    ? 'bg-marvel-red border-marvel-red text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Epic toggle */}
        {showEpicToggle && (
          <button
            onClick={() => setIsEpicMastermind(!isEpicMastermind)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
              isEpicMastermind
                ? 'border-orange-600/60 bg-orange-950/40 text-orange-300'
                : 'border-zinc-700 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <Zap size={18} className={isEpicMastermind ? 'text-orange-400 fill-current' : 'text-zinc-500'} />
              <div className="text-left">
                <p className="text-sm font-semibold">Epic Mastermind</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {isEpicMastermind
                    ? 'U\u017cywasz epickich kart \u2014 trudno\u015b\u0107 +1, osobne statystyki'
                    : 'Prze\u0142\u0105cz, je\u015bli chcesz zagra\u0107 w trybie Epic'}
                </p>
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
              isEpicMastermind ? 'bg-orange-500' : 'bg-zinc-700'
            }`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                isEpicMastermind ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
          </button>
        )}

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          loading={generating}
          size="lg"
          className={`w-full ${generating ? 'animate-pulse' : ''}`}
        >
          <Shuffle size={18} className="mr-2 inline" />
          Generate Setup
        </Button>

        {/* Results */}
        {currentSetup && (
          <div className="space-y-4 animate-in fade-in duration-300">

            {/* ── Threat Level banner ─────────────────────────────────────── */}
            {(() => {
              const info = getBalanceInfo(currentSetup.balanceGap);
              const cc   = currentSetup.counterCoverage;
              const pct  = Math.round(cc.coverageRatio * 100);
              const hasCounters = cc.neededCounters.length > 0;

              return (
                <div className={`rounded-xl border overflow-hidden ${info.color}`}>
                  {/* Główny wiersz */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{info.icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{info.label}</p>
                        <p className="text-xs opacity-70">{info.hint}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs font-mono opacity-70">
                      <p>Threat {currentSetup.threatScore.toFixed(1)}/10</p>
                      <p>Gap {currentSetup.balanceGap > 0 ? '+' : ''}{currentSetup.balanceGap}</p>
                    </div>
                  </div>

                  {/* Counter coverage pasek */}
                  {hasCounters && (
                    <div className="px-4 pb-3 space-y-1.5 border-t border-current/10">
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="opacity-70">Counter coverage</span>
                        <span className="font-mono font-semibold">
                          {cc.coveredCounters.length}/{cc.neededCounters.length} ({pct}%)
                        </span>
                      </div>
                      {/* Pasek postępu */}
                      <div className="w-full h-1.5 rounded-full bg-current/20">
                        <div
                          className="h-full rounded-full bg-current transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                    </div>
                  )}
                </div>
              );
            })()}

            <MastermindCard
              mastermind={currentSetup.mastermind}
              stats={mastermindStatsMap.get(currentSetup.mastermind.id)}
              isEpic={currentSetup.isEpicMastermind}
            />
            <SchemeCard
              scheme={currentSetup.scheme}
              stats={schemeStatsMap.get(currentSetup.scheme.id)}
              playerCount={playerCount}
              schemeHeroMod={currentSetup.schemeHeroMod}
            />

            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide px-1">Villains</p>
              {currentSetup.villains.map((v) => (
                <VillainCard key={v.id} villain={v} />
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide px-1">Henchmen</p>
              {currentSetup.henchmen.map((h) => (
                <HenchmanCard key={h.id} henchman={h} />
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide px-1">Heroes</p>
              {currentSetup.heroes.map((hero, idx) => {
                const isExtra = currentSetup.schemeHeroMod > 0 && idx >= currentSetup.heroes.length - currentSetup.schemeHeroMod;
                return (
                  <HeroCard
                    key={hero.id}
                    hero={hero}
                    stats={statsMap.get(hero.id)}
                    onReroll={() => handleReroll(idx)}
                    badge={isExtra ? 'Extra' : undefined}
                  />
                );
              })}
            </div>

            <Button variant="secondary" size="lg" className="w-full" onClick={() => setSaveModalOpen(true)}>
              {'📝'} Save match result
            </Button>

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
              <span className="text-xl">{'🧑‍🤝‍🧑'}</span>
              <div>
                <p className="text-xs font-semibold text-zinc-300">Bystanders in villain deck</p>
                <p className="text-sm font-bold text-marvel-gold">{currentSetup.bystanders} cards</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {currentSetup && (
        <SaveMatchModal
          open={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          setup={currentSetup}
          playerCount={playerCount}
          mode={randomizationMode}
        />
      )}
    </div>
  );
}
