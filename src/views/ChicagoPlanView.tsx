// Chicago day-by-day plan (Aug 3–5): a timed walking route through all the
// city stops, with transit times between them. Fully offline (bundled data);
// editable like the itinerary — edits are overrides that sync via /plan.
import { useEffect, useState } from 'react';
import { CHICAGO_PLAN, type PlanStep, type PlanTransit } from '../data/chicagoPlan';
import { mergePlanSteps, usePlanOverrides } from '../lib/planOverrides';
import { mapsUrl } from '../lib/maps';
import { useI18n, type TKey } from '../i18n';

const TRANSIT_ICON: Record<PlanTransit['mode'], string> = {
  walk: '🚶',
  bus: '🚌',
  car: '🚗',
  taxi: '🚕',
};

const TRANSIT_LABEL: Record<PlanTransit['mode'], TKey> = {
  walk: 'planWalk',
  bus: 'planBus',
  car: 'planCar',
  taxi: 'planTaxi',
};

export default function ChicagoPlanView() {
  const { t, lang } = useI18n();
  const { overrides, removeStep, editStep, addStep, moveStep, resetPlan } = usePlanOverrides();
  const [editing, setEditing] = useState(false);
  // Which step is open in the modal; { dayId, step: null } = adding a new one.
  const [modal, setModal] = useState<{ dayId: string; step: PlanStep | null } | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-xl font-bold">🗺️ {t('chiPlanTitle')}</h1>
        <button
          onClick={() => setEditing((e) => !e)}
          className={`text-sm font-medium rounded-lg px-3 py-1.5 ${
            editing ? 'bg-green-600 text-white' : 'bg-stone-200 dark:bg-stone-700'
          }`}
        >
          {editing ? t('doneEditing') : `✏️ ${t('editItinerary')}`}
        </button>
      </div>

      <p className="text-xs text-stone-500 dark:text-stone-400">{t('chiPlanHint')}</p>

      {CHICAGO_PLAN.map((day) => {
        const steps = mergePlanSteps(day, overrides);
        return (
          <section key={day.id} className="space-y-2">
            <h2 className="font-bold text-base border-b border-stone-300 dark:border-stone-700 pb-1">
              {day.title[lang]}
            </h2>

            {steps.map((s) => (
              <div key={s.id}>
                {/* Transit connector: how to get here from the previous stop */}
                {s.transit && (
                  <p className="pl-5 pb-1 text-xs text-stone-500 dark:text-stone-400">
                    {TRANSIT_ICON[s.transit.mode]} {s.transit.minutes} {t('minutes')} ·{' '}
                    {t(TRANSIT_LABEL[s.transit.mode])}
                    {s.transit.detail ? ` — ${s.transit.detail[lang]}` : ''}
                  </p>
                )}

                <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 rounded-lg bg-red-700 text-white text-xs font-bold px-2 py-1">
                      {s.time}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">{s.name}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {s.durationMin ? `~${s.durationMin} ${t('minutes')}` : ''}
                        {s.optional && (
                          <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 font-medium">
                            {t('planOptional')}
                          </span>
                        )}
                      </p>
                    </div>
                    {editing && (
                      <span className="flex gap-1 shrink-0">
                        <button onClick={() => setModal({ dayId: day.id, step: s })} aria-label={t('editStop')} className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700">
                          ✏️
                        </button>
                        <button onClick={() => moveStep(day, overrides, s.id, -1)} aria-label={t('moveUp')} className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700">
                          ↑
                        </button>
                        <button onClick={() => moveStep(day, overrides, s.id, 1)} aria-label={t('moveDown')} className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700">
                          ↓
                        </button>
                        <button
                          onClick={() => confirm(`${t('removeConfirm')} — ${s.name}`) && removeStep(s.id)}
                          aria-label={t('removeStop')}
                          className="px-2 py-1 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                        >
                          🗑️
                        </button>
                      </span>
                    )}
                  </div>

                  {s.note && (
                    <p className="text-xs text-stone-600 dark:text-stone-300">{s.note[lang]}</p>
                  )}

                  {s.mapsQuery && (
                    <a
                      href={mapsUrl(s.mapsQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs font-medium text-red-700 dark:text-red-400"
                    >
                      📍 {t('openInMaps')}
                    </a>
                  )}
                </div>
              </div>
            ))}

            {editing && (
              <button
                onClick={() => setModal({ dayId: day.id, step: null })}
                className="w-full rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 py-2.5 text-sm font-medium text-stone-600 dark:text-stone-300"
              >
                ＋ {t('addStop')}
              </button>
            )}
          </section>
        );
      })}

      {editing && (
        <button
          onClick={() => confirm(t('planResetConfirm')) && resetPlan()}
          className="w-full rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 py-2.5 text-sm font-medium"
        >
          ♻️ {t('planResetBtn')}
        </button>
      )}

      {modal && (
        <StepForm
          initial={modal.step ?? undefined}
          onCancel={() => setModal(null)}
          onSave={(data) => {
            if (modal.step) {
              editStep(modal.step.id, data);
            } else {
              addStep(modal.dayId, { ...data, id: `user-${crypto.randomUUID()}` });
            }
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

// --- add/edit modal ---------------------------------------------------------
// Notes typed here are saved for BOTH languages (the traveler writes once);
// the bundled EN/ES notes stay untouched unless the note field is changed.
function StepForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: PlanStep;
  onSave: (data: Omit<PlanStep, 'id'>) => void;
  onCancel: () => void;
}) {
  const { t, lang } = useI18n();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const [form, setForm] = useState({
    time: initial?.time ?? '',
    name: initial?.name ?? '',
    durationMin: initial?.durationMin?.toString() ?? '',
    transitMode: (initial?.transit?.mode ?? '') as '' | PlanTransit['mode'],
    transitMin: initial?.transit?.minutes?.toString() ?? '',
    note: initial?.note?.[lang] ?? '',
    mapsQuery: initial?.mapsQuery ?? '',
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.time) return;
    const noteText = form.note.trim();
    // Keep the original bilingual note if the user didn't touch the text.
    const untouched = initial?.note && noteText === initial.note[lang];
    onSave({
      time: form.time,
      name: form.name.trim(),
      durationMin: form.durationMin ? Number(form.durationMin) : undefined,
      optional: initial?.optional,
      transit: form.transitMode
        ? {
            mode: form.transitMode,
            minutes: form.transitMin ? Number(form.transitMin) : 0,
            // keep the bundled detail text if the mode didn't change
            detail: initial?.transit?.mode === form.transitMode ? initial.transit.detail : undefined,
          }
        : undefined,
      note: untouched ? initial.note : noteText ? { en: noteText, es: noteText } : undefined,
      mapsQuery: form.mapsQuery.trim() || undefined,
    });
  };

  const input =
    'w-full rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm bg-white dark:bg-stone-800';
  const modes: PlanTransit['mode'][] = ['walk', 'bus', 'car', 'taxi'];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={initial ? t('editStop') : t('addStop')}
    >
      <form
        onSubmit={submit}
        className="bg-white dark:bg-stone-900 rounded-2xl p-4 w-full max-w-md space-y-3 max-h-[85vh] overflow-y-auto"
      >
        <h3 className="font-bold text-lg">{initial ? t('editStop') : t('addStop')}</h3>

        <label className="block text-sm">
          {t('planTime')}
          <input className={input} type="time" value={form.time} onChange={set('time')} required />
        </label>
        <label className="block text-sm">
          {t('stopName')}
          <input className={input} value={form.name} onChange={set('name')} required />
        </label>
        <label className="block text-sm">
          {t('stopDwell')}
          <input className={input} type="number" min="0" value={form.durationMin} onChange={set('durationMin')} />
        </label>

        {/* How to get there from the previous stop (mode + minutes) */}
        <div className="flex gap-2">
          <label className="block text-sm flex-1">
            {t('directions')}
            <select className={input} value={form.transitMode} onChange={set('transitMode')}>
              <option value="">{t('planNoTransit')}</option>
              {modes.map((m) => (
                <option key={m} value={m}>
                  {TRANSIT_ICON[m]} {t(TRANSIT_LABEL[m])}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm w-28">
            {t('minutes')}
            <input
              className={input}
              type="number"
              min="0"
              value={form.transitMin}
              onChange={set('transitMin')}
              disabled={!form.transitMode}
            />
          </label>
        </div>

        <label className="block text-sm">
          {t('stopNote')}
          <input className={input} value={form.note} onChange={set('note')} />
        </label>
        <label className="block text-sm">
          {t('stopMapsQuery')}
          <input className={input} value={form.mapsQuery} onChange={set('mapsQuery')} placeholder={form.name} />
        </label>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel} className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-lg py-2 font-medium">
            {t('cancel')}
          </button>
          <button type="submit" className="flex-1 bg-green-600 text-white rounded-lg py-2 font-medium">
            {t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
