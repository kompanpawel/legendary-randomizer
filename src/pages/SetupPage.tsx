import { useState, useMemo } from 'react';
import { Shuffle, ChevronDown, ChevronUp, Zap, Lock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

function getBalanceInfo(gap: number, t: (key: string) => string) {
  if (gap > 3)  return { color: 'border-red-700/60 bg-red-950/40 text-red-300',         icon: '💀', label: t('setup.balance.veryHard.label'),    hint: t('setup.balance.veryHard.hint') };
  if (gap > 1)  return { color: 'border-orange-700/60 bg-orange-950/40 text-orange-300', icon: '⚔️', label: t('setup.balance.challenging.label'), hint: t('setup.balance.challenging.hint') };
  if (gap > -1) return { color: 'border-zinc-700/60 bg-zinc-800/40 text-zinc-300',       icon: '⚖️', label: t('setup.balance.balanced.label'),    hint: t('setup.balance.balanced.hint') };
  if (gap > -3) return { color: 'border-blue-700/60 bg-blue-950/40 text-blue-300',       icon: '✅', label: t('setup.balance.easier.label'),      hint: t('setup.balance.easier.hint') };
  return          { color: 'border-green-700/60 bg-green-950/40 text-green-300',          icon: '😎', label: t('setup.balance.easy.label'),        hint: t('setup.balance.easy.hint') };
}

export default function SetupPage() {
  const { t } = useTranslation();

  const MODE_OPTIONS = [
    { value: 'smart' as const,    label: t('setup.modes.smart.label'),   desc: t('setup.modes.smart.desc') },
    { value: 'dustOff' as const,  label: t('setup.modes.dustOff.label'), desc: t('setup.modes.dustOff.desc') },
    { value: 'synergy' as const,  label: t('setup.modes.synergy.label'), desc: t('setup.modes.synergy.desc') },
  ];

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
  const [unveiledVisible, setUnveiledVisible] = useState(false);

  const setupRules = getSetupRules(playerCount);

  const activeIds = useMemo(
    () => selectedExpansionIds.length > 0
      ? selectedExpansionIds
      : db.expansions.map((e) => e.id),
    [selectedExpansionIds]
  );

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
  const pinnedMastermind = useMemo(
    () => pinnedMastermindId ? db.masterminds.find((m) => m.id === pinnedMastermindId) ?? null : null,
    [pinnedMastermindId]
  );
  const pinnedScheme = useMemo(
    () => pinnedSchemeId ? db.schemes.find((s) => s.id === pinnedSchemeId) ?? null : null,
    [pinnedSchemeId]
  );

  // Pule kart do losowania — zawsze ze wszystkich aktywnych ekspansji.
  // Jedynym ograniczeniem doboru jest warunek alwaysLeads (obsługiwany w silniku).
  const filteredHeroes      = useMemo(() => db.heroes.filter((h) => activeIds.includes(h.expansionId)),      [activeIds]);
  const filteredVillains    = useMemo(() => db.villains.filter((v) => activeIds.includes(v.expansionId)),    [activeIds]);
  const filteredHenchmen    = useMemo(() => db.henchmen.filter((h) => activeIds.includes(h.expansionId)),    [activeIds]);
  const filteredMasterminds = useMemo(() => db.masterminds.filter((m) => activeIds.includes(m.expansionId)), [activeIds]);
  const filteredSchemes     = useMemo(() => db.schemes.filter((s) => activeIds.includes(s.expansionId)),     [activeIds]);

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
        setUnveiledVisible(false); // reset spoiler przy nowym setupie
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
      <PageHeader title={t('setup.title')} subtitle={t('setup.subtitle')} />

      <div className="px-4 space-y-4">
        {/* Expansions */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setExpansionsOpen(!expansionsOpen)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div>
              <p className="text-sm font-medium text-white">{t('setup.expansions.heading')}</p>
              <p className="text-xs text-zinc-500">
                {selectedExpansionIds.length === 0
                  ? t('setup.expansions.allActive')
                  : t('setup.expansions.countOf', { count: selectedExpansionIds.length, total: db.expansions.length })}
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
                {t('setup.expansions.clearButton')}
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
                <p className="text-sm font-medium text-white">{t('setup.manualPick.heading')}</p>
                <p className="text-xs text-zinc-500">
                  {pinnedMastermind || pinnedScheme
                    ? [
                        pinnedMastermind ? pinnedMastermind.name : null,
                        pinnedScheme ? pinnedScheme.name : null,
                      ].filter(Boolean).join(' · ')
                    : t('setup.manualPick.bothRandom')}
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
                <label className="block text-xs font-medium text-zinc-400 mb-1">{t('setup.manualPick.mastermindLabel')}</label>
                <select
                  value={pinnedMastermindId ?? ''}
                  onChange={(e) => setPinnedMastermindId(e.target.value || null)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-marvel-red appearance-none"
                >
                  <option value="">{t('setup.manualPick.randomOption')}</option>
                  {availableMasterminds.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.cards.some(c => c.isEpic) ? `⚡ ${m.name}` : m.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Scheme dropdown */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">{t('setup.manualPick.schemeLabel')}</label>
                <select
                  value={pinnedSchemeId ?? ''}
                  onChange={(e) => setPinnedSchemeId(e.target.value || null)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-marvel-red appearance-none"
                >
                  <option value="">{t('setup.manualPick.randomOption')}</option>
                  {availableSchemes.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {(pinnedMastermind || pinnedScheme) && (
                <p className="text-xs text-zinc-500 leading-relaxed">
                  🔒 {t('setup.manualPick.lockedInfo')}
                </p>
              )}
              {(pinnedMastermind || pinnedScheme) && (
                <button
                  onClick={() => { setPinnedMastermindId(null); setPinnedSchemeId(null); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  {t('setup.manualPick.clearButton')}
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
            <h2 className="text-sm font-semibold text-white">{t('setup.players.heading')}</h2>
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
                <p className="text-sm font-semibold">{t('setup.epicToggle.label')}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {isEpicMastermind
                    ? t('setup.epicToggle.descOn')
                    : t('setup.epicToggle.descOff')}
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
          {t('setup.generateButton')}
        </Button>

        {/* Results */}
        {currentSetup && (
          <div className="space-y-4 animate-in fade-in duration-300">

            {/* ── Threat Level banner ─────────────────────────────────────── */}
            {(() => {
              const info = getBalanceInfo(currentSetup.balanceGap, t);
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
                     <p>{t('setup.threat')} {currentSetup.threatScore.toFixed(1)}/10</p>
                     <p>{t('setup.gap')} {currentSetup.balanceGap > 0 ? '+' : ''}{currentSetup.balanceGap}</p>
                    </div>
                  </div>

                  {/* Counter coverage pasek */}
                  {hasCounters && (
                    <div className="px-4 pb-3 space-y-1.5 border-t border-current/10">
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="opacity-70">{t('setup.counterCoverage')}</span>
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

            {/* Drugi Mastermind (Dark Alliance — losowany na Twist 1) */}
            {currentSetup.secondMastermind && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-purple-400/80 uppercase tracking-wide px-1">
                  2nd Mastermind <span className="normal-case text-purple-300/60">(Dark Alliance — Twist 1)</span>
                </p>
                <MastermindCard
                  mastermind={currentSetup.secondMastermind}
                  stats={mastermindStatsMap.get(currentSetup.secondMastermind.id)}
                  isEpic={false}
                  className="border-purple-800/50 bg-gradient-to-br from-purple-950/30 to-zinc-900/60"
                />
              </div>
            )}

            {/* Drained Mastermind (Symbiotic Absorption — odłożony poza grę) */}
            {currentSetup.drainedMastermind && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400/80 uppercase tracking-wide px-1">
                  Drained Mastermind <span className="normal-case text-zinc-300/60">(Symbiotic Absorption — set aside)</span>
                </p>
                <MastermindCard
                  mastermind={currentSetup.drainedMastermind}
                  stats={mastermindStatsMap.get(currentSetup.drainedMastermind.id)}
                  isEpic={false}
                  className="border-zinc-700/50 bg-gradient-to-br from-zinc-800/30 to-zinc-900/60"
                />
              </div>
            )}
            <SchemeCard
              scheme={currentSetup.scheme}
              stats={schemeStatsMap.get(currentSetup.scheme.id)}
              playerCount={playerCount}
              schemeHeroMod={currentSetup.schemeHeroMod}
              schemeExtraVillainMod={currentSetup.schemeExtraVillainMod}
            />

            {/* Unveiled Scheme (krok 16 — "druga faza" Veiled Scheme, opcjonalny spoiler) */}
            {currentSetup.unveiledScheme && (
              <div className="space-y-2">
                <button
                  onClick={() => setUnveiledVisible(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-orange-700/40 bg-orange-950/20 text-orange-300 text-xs font-medium hover:border-orange-600/60 transition-colors"
                >
                  <span>
                    {unveiledVisible
                      ? t('setup.unveiledScheme.hideButton')
                      : t('setup.unveiledScheme.revealButton')}
                  </span>
                  <span className="text-orange-400/60 text-xs">
                    {t('setup.unveiledScheme.subheading', {
                      twist: currentSetup.scheme.overrides.veilTransformsTwist ?? '?',
                    })}
                  </span>
                </button>
                {unveiledVisible && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-orange-400/80 uppercase tracking-wide px-1">
                      {t('setup.unveiledScheme.heading')}
                      <span className="normal-case text-orange-300/60 ml-1">
                        ({t('setup.unveiledScheme.subheading', {
                          twist: currentSetup.scheme.overrides.veilTransformsTwist ?? '?',
                        })})
                      </span>
                    </p>
                    <SchemeCard
                      scheme={currentSetup.unveiledScheme}
                      stats={schemeStatsMap.get(currentSetup.unveiledScheme.id)}
                      playerCount={playerCount}
                      className="border-orange-800/50 bg-gradient-to-br from-orange-950/30 to-zinc-900/60"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide px-1">{t('setup.sections.villains')}</p>
              {currentSetup.villains.map((v) => (
                <VillainCard key={v.id} villain={v} />
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide px-1">{t('setup.sections.henchmen')}</p>
              {currentSetup.henchmen.map((h) => (
                <HenchmanCard key={h.id} henchman={h} />
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide px-1">{t('setup.sections.heroes')}</p>
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
              {t('setup.saveMatchButton')}
            </Button>

            {/* Setup Notes (np. Ambush Scheme overlap, Multiple Masterminds) */}
            {currentSetup.setupNotes.length > 0 && (
              <div className="space-y-2">
                {currentSetup.setupNotes.map((note, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs border bg-amber-950/30 border-amber-700/50 text-amber-200"
                  >
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 text-amber-400" />
                    <span>{t(note.key, note.params)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
              <span className="text-xl">{'🧑‍🤝‍🧑'}</span>
              <div>
                <p className="text-xs font-semibold text-zinc-300">{t('setup.bystanders')}</p>
                <p className="text-sm font-bold text-marvel-gold">{t('setup.bystanders_cards', { count: currentSetup.bystanders })}</p>
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
