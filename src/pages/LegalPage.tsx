import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/layout/PageHeader';

interface AccordionProps {
  heading: string;
  body: string;
}

function LegalAccordion({ heading, body }: AccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-white">{heading}</span>
        {open ? (
          <ChevronUp size={16} className="text-zinc-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-zinc-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-zinc-800">
          {body.split('\n').map((line, i) => (
            line.trim() === '' ? (
              <div key={i} className="h-3" />
            ) : (
              <p key={i} className="text-xs text-zinc-400 leading-relaxed">
                {line}
              </p>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default function LegalPage() {
  const { t } = useTranslation();

  return (
    <div className="pb-nav">
      <PageHeader title={t('legal.title')} />

      <div className="px-4 space-y-3">
        <LegalAccordion
          heading={t('legal.disclaimer.heading')}
          body={t('legal.disclaimer.body')}
        />
        <LegalAccordion
          heading={t('legal.privacy.heading')}
          body={t('legal.privacy.body')}
        />
        <LegalAccordion
          heading={t('legal.terms.heading')}
          body={t('legal.terms.body')}
        />

        <p className="text-center text-xs text-zinc-600 pt-2 pb-4">
          Legendary Randomizer — unofficial fan-made tool
        </p>
      </div>
    </div>
  );
}
