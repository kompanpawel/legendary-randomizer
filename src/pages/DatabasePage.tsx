import React, { useRef, useState } from 'react';
import { Download, Upload, Database as DbIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { exportStats, importStats, validateCardsJson } from '../utils/importExport';

type ToastType = 'success' | 'error';

interface Toast {
  type: ToastType;
  message: string;
}

export default function DatabasePage() {
  const { t } = useTranslation();
  const statsFileRef = useRef<HTMLInputElement>(null);
  const cardsFileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [loading, setLoading] = useState(false);

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleExport = async () => {
    try {
      await exportStats();
      showToast('success', t('database.toast.exportSuccess'));
    } catch (err) {
      showToast('error', t('database.toast.exportError', { error: String(err) }));
    }
  };

  const handleImportStats = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const { imported } = await importStats(file);
      showToast('success', t('database.toast.importSuccess', { count: imported }));
    } catch (err) {
      showToast('error', t('database.toast.importError', { error: String(err) }));
    } finally {
      setLoading(false);
      if (statsFileRef.current) statsFileRef.current.value = '';
    }
  };

  const handleImportCards = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const json: unknown = JSON.parse(text);
      const { valid, error } = validateCardsJson(json);
      if (!valid) {
        showToast('error', t('database.toast.invalidFormat', { error }));
      } else {
        showToast('success', t('database.toast.validationSuccess'));
      }
    } catch (err) {
      showToast('error', t('database.toast.validationError', { error: String(err) }));
    } finally {
      setLoading(false);
      if (cardsFileRef.current) cardsFileRef.current.value = '';
    }
  };

  return (
    <div className="pb-nav">
      <PageHeader title={t('database.title')} subtitle={t('database.subtitle')} />

      {/* Toast */}
      {toast && (
        <div
          className={`mx-4 mb-4 flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
            toast.type === 'success'
              ? 'bg-green-900/20 border-green-700/50 text-green-400'
              : 'bg-red-900/20 border-red-700/50 text-red-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="px-4 space-y-4">
        {/* Export Stats */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-blue-900/20 border border-blue-800/40">
              <Download size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{t('database.export.heading')}</h2>
              <p className="text-xs text-zinc-500">{t('database.export.description')}</p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" onClick={handleExport} loading={loading}>
            {t('database.export.button')}
          </Button>
        </div>

        {/* Import Stats */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-green-900/20 border border-green-800/40">
              <Upload size={18} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{t('database.import.heading')}</h2>
              <p className="text-xs text-zinc-500">{t('database.import.description')}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => statsFileRef.current?.click()}
            loading={loading}
          >
            {t('database.import.button')}
          </Button>
          <input
            ref={statsFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportStats}
          />
        </div>

        {/* Card Database Validation */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-amber-900/20 border border-amber-800/40">
              <DbIcon size={18} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{t('database.validation.heading')}</h2>
              <p className="text-xs text-zinc-500">{t('database.validation.description')}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => cardsFileRef.current?.click()}
            loading={loading}
          >
            {t('database.validation.button')}
          </Button>
          <input
            ref={cardsFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportCards}
          />
        </div>

        {/* Info */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 text-xs text-zinc-500 space-y-1">
          <p>{t('database.info.bundled')}</p>
          <p>{t('database.info.indexeddb')}</p>
          <p>{t('database.info.offline')}</p>
        </div>
      </div>
    </div>
  );
}
