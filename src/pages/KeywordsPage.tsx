import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/layout/PageHeader';
import keywordRulesData from '../../json/keywords.json';

type KeywordRule = { keyword: string; description: string };

const keywordRuleMap = new Map<string, string>(
  (keywordRulesData as KeywordRule[]).map((definition) => [definition.keyword, definition.description]),
);

const fallbackDescriptions: Record<string, string> = {
  'Man Out of Time': 'This keyword represents heroes who can manipulate time or turn order. In practice it usually means they can effectively skip ahead, re-use timing, or interact with the turn structure in a way that acts like extra tempo or a time-travel effect.',
  'Woman Out of Time': 'This keyword works like Man Out of Time. It represents a hero who can manipulate time or act as if they are from another era, creating timing advantages or extra turn-based flexibility.',
  'Wound Mastermind': 'This keyword lets you put Wounds on the active Mastermind instead of dealing normal damage. Wounds reduce the Mastermind’s Attack and are returned to the Wound Stack when the Mastermind is defeated or its tactic is resolved.',
  'Wound Villain': 'This keyword lets you put Wounds on a Villain. Each Wound reduces that Villain’s Attack, and the Wounds are cleared when the Villain leaves the city or is defeated.',
  'Sidekick': 'This keyword refers to the Sidekick rules from Secret Wars / Civil War / Messiah Complex. Sidekicks are recruited from a shared Sidekick Stack, usually for 2[Recruit], and they still count as played heroes for any class or Superpower triggers.',
  'Divided Card': 'Each Divided Card has two miniature sides printed on one card. When you play it, choose one side and ignore the other. The chosen side provides its cost, class, Attack, Recruit, and abilities as normal.',
};

const EXTRA_KEYWORD_DEFINITIONS: KeywordRule[] = [
  { keyword: 'Divided Card', description: fallbackDescriptions['Divided Card'] },
  { keyword: 'Sidekick', description: fallbackDescriptions.Sidekick },
  { keyword: 'Man Out of Time', description: fallbackDescriptions['Man Out of Time'] },
  { keyword: 'Woman Out of Time', description: fallbackDescriptions['Woman Out of Time'] },
  { keyword: 'Wound Mastermind', description: fallbackDescriptions['Wound Mastermind'] },
  { keyword: 'Wound Villain', description: fallbackDescriptions['Wound Villain'] },
];

const ALL_KEYWORD_DEFINITIONS = [...(keywordRulesData as KeywordRule[]), ...EXTRA_KEYWORD_DEFINITIONS];

const KEYWORD_ENTRIES = Array.from(
  new Map(
    ALL_KEYWORD_DEFINITIONS.map((definition) => [
      definition.keyword,
      {
        keyword: definition.keyword,
        description:
          keywordRuleMap.get(definition.keyword)
          ?? fallbackDescriptions[definition.keyword]
          ?? definition.description
          ?? 'No rule text is available for this keyword in the bundled data.',
      },
    ]),
  ).values(),
).sort((a, b) => a.keyword.localeCompare(b.keyword));

export default function KeywordsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filteredKeywords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return KEYWORD_ENTRIES;

    return KEYWORD_ENTRIES.filter(({ keyword, description }) => {
      const haystack = `${keyword} ${description}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [search]);

  return (
    <div className="pb-nav">
      <PageHeader title={t('keywords.title')} subtitle={t('keywords.subtitle')} />

      <div className="px-4 space-y-4">
        <label className="relative block">
          <Search
            size={18}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <span className="sr-only">{t('keywords.searchLabel')}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('keywords.searchPlaceholder')}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-marvel-red focus:outline-none"
          />
        </label>

        <div className="space-y-3">
          {filteredKeywords.length > 0 ? (
            filteredKeywords.map(({ keyword, description }) => (
              <div
                key={keyword}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"
              >
                <h2 className="text-base font-semibold text-white">{keyword}</h2>

                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-300">
                  {description}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-center text-sm text-zinc-500">
              {t('keywords.noResults')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
