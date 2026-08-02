// Day-by-day plans for the whole trip: a timed route through each day's
// stops, with travel times between them. Fully offline (bundled data);
// editable like the itinerary — edits are overrides that sync via /plan.
// `focus` narrows the view to one day / segment / city (see resolvePlanFocus).
import { useEffect, useMemo, useState } from 'react';
import { resolvePlanFocus, type PlanDay, type PlanStep, type PlanTransit } from '../data/plan';
import { todayIso } from '../data/days';
import { mergePlanSteps, usePlanOverrides } from '../lib/planOverrides';
import { useSessionState } from '../lib/storage';
import { useDragSort } from '../lib/dragSort';
import { directionsUrl, mapsUrl } from '../lib/maps';
import {
  fmtDuration,
  fmtTransitDistance,
  hhmmToMinutes,
  minutesToHhmm,
  transitKm,
} from '../lib/units';
import { planStepPhoto, stepIcon } from '../data/plan/stepPhotos';
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

/**
 * Id of the step happening right now: the last one whose start time is in the
 * past, read in the DAY's time zone (the trip crosses three of them, so the
 * phone's own clock is not a safe reference). Returns undefined before the
 * first step of the day.
 */
function currentStepId(steps: PlanStep[], tz?: string): string | undefined {
  const now = new Date();
  const hhmm = tz
    ? now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz })
    : now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  let current: string | undefined;
  for (const s of steps) {
    if (s.time <= hhmm) current = s.id; // times are "HH:MM", so string compare works
  }
  return current;
}

export default function PlanView({ focus }: { focus?: string }) {
  const { t } = useI18n();
  // Kept whole so it can be handed to each day section below.
  const plan = usePlanOverrides();
  const { editStep, addStep, resetPlan } = plan;
  const { days, focused } = useMemo(() => resolvePlanFocus(focus), [focus]);
  const [editing, setEditing] = useState(false);
  // Which step is open in the modal; { dayId, step: null } = adding a new one.
  const [modal, setModal] = useState<{ dayId: string; step: PlanStep | null } | null>(null);

  // Days are collapsible. Default: today if the trip is running, else the
  // next day still to come, else the first one. Any number can be open at
  // once. Kept in sessionStorage so a background sync (which remounts the
  // views) doesn't collapse everything under the user's fingers.
  const [openDays, setOpenDays] = useSessionState<Record<string, boolean>>(
    `planOpen:${focus ?? 'all'}`,
    (() => {
      const today = todayIso();
      const current = days.find((d) => d.iso === today) ?? days.find((d) => d.iso >= today);
      return { [(current ?? days[0]).id]: true };
    })(),
  );
  const toggleDay = (id: string) => setOpenDays((o) => ({ ...o, [id]: !o[id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-xl font-bold">🗺️ {t('planTitle')}</h1>
        <button
          onClick={() => setEditing((e) => !e)}
          className={`text-sm font-medium rounded-lg px-3 py-1.5 ${
            editing ? 'bg-green-600 text-white' : 'bg-stone-200 dark:bg-stone-700'
          }`}
        >
          {editing ? t('doneEditing') : `✏️ ${t('editItinerary')}`}
        </button>
      </div>

      <p className="text-xs text-stone-500 dark:text-stone-400">{t('planHint')}</p>

      {/* Focused view (one segment/city): offer the way back to all 17 days */}
      {focused && (
        <a href="#/plan" className="inline-block text-sm font-medium text-red-700 dark:text-red-400">
          ← {t('planAllDays')}
        </a>
      )}

      {/* Date chips: jump to any day and open it (only in the full index) */}
      {!focused && days.length > 3 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => {
                setOpenDays((o) => ({ ...o, [day.id]: true }));
                document.getElementById(`plan-${day.id}`)?.scrollIntoView({ block: 'start' });
              }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                day.iso === todayIso()
                  ? 'bg-red-700 text-white'
                  : 'bg-stone-200 dark:bg-stone-700'
              }`}
            >
              {day.date.replace('Aug ', '')}
            </button>
          ))}
        </div>
      )}

      {days.map((day) => (
        <PlanDaySection
          key={day.id}
          day={day}
          plan={plan}
          editing={editing}
          isOpen={openDays[day.id] ?? false}
          onToggle={() => toggleDay(day.id)}
          onEditStep={(step) => setModal({ dayId: day.id, step })}
          onAddStep={() => setModal({ dayId: day.id, step: null })}
        />
      ))}

      {editing && !focused && (
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

// --- one collapsible day ----------------------------------------------------
// Its own component because every day owns a drag-sort hook, and hooks cannot
// be created inside a .map(). It also owns the "is this travel estimate still
// valid?" logic, which depends on the order the day is CURRENTLY in.
function PlanDaySection({
  day,
  plan,
  editing,
  isOpen,
  onToggle,
  onEditStep,
  onAddStep,
}: {
  day: PlanDay;
  plan: ReturnType<typeof usePlanOverrides>;
  editing: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onEditStep: (step: PlanStep) => void;
  onAddStep: () => void;
}) {
  const { t, lang } = useI18n();
  const { overrides, removeStep, editSteps, moveStep, setStepOrder, resetDay } = plan;

  const steps = mergePlanSteps(day, overrides);

  // Drag-to-reorder: only while editing an open day.
  const dragEnabled = editing && isOpen;
  const drag = useDragSort({
    ids: steps.map((s) => s.id),
    enabled: dragEnabled,
    onCommit: (ids) => setStepOrder(day.id, ids),
  });
  const byId = new Map(steps.map((s) => [s.id, s]));
  // The order actually on screen — during a drag this is the live preview, so
  // everything below (travel lines, warnings) updates under the finger.
  const shown = drag.order.map((id) => byId.get(id)).filter((s): s is PlanStep => !!s);

  // Which stop each bundled travel estimate was measured FROM.
  //   null      → it is the day's first stop (e.g. "from the hotel")
  //   undefined → a traveller added this step, so there is no baseline
  const bundledPrev = new Map<string, string | null>();
  day.steps.forEach((s, i) => bundledPrev.set(s.id, i === 0 ? null : day.steps[i - 1].id));

  const rows = shown.map((s, i) => {
    const prev = i > 0 ? shown[i - 1] : null;
    const expected = bundledPrev.get(s.id);
    // Reordering changed who comes before this stop → the bundled minutes and
    // km no longer describe this hop.
    const stale = !!s.transit && expected !== undefined && (prev?.id ?? null) !== expected;
    return { s, prev, stale };
  });
  const anyStale = rows.some((r) => r.stale);

  const isToday = day.iso === todayIso();
  const isPast = day.iso < todayIso();
  const nowStepId = isToday ? currentStepId(shown, day.tz) : undefined;

  /** Re-chains every start time of the day: first stop's time, then
   *  + stay + travel, all the way down. Uses only data we have, so it is
   *  exact for the schedule (not for distances). */
  const retime = () => {
    if (shown.length === 0 || !confirm(t('planRetimeConfirm'))) return;
    const updates: Record<string, Partial<PlanStep>> = {};
    let cursor = hhmmToMinutes(shown[0].time);
    shown.forEach((s, i) => {
      if (i > 0) cursor += s.transit?.minutes ?? 0;
      const time = minutesToHhmm(cursor);
      if (time !== s.time) updates[s.id] = { time };
      cursor += s.durationMin ?? 0;
    });
    if (Object.keys(updates).length > 0) editSteps(updates);
  };

  /** The little "how you get here" line above a stop. */
  const travelLine = (s: PlanStep, prev: PlanStep | null, stale: boolean) => {
    // Always points at the CURRENT neighbours, so after a reorder this link
    // gives Google's exact time and distance for the new hop.
    const link =
      prev?.mapsQuery && s.mapsQuery ? directionsUrl(prev.mapsQuery, s.mapsQuery) : undefined;
    const showLink = !!link && (stale || editing);
    if (!s.transit && !showLink) return null;
    return (
      <p
        className={`pl-5 pb-1 text-xs ${
          stale ? 'text-amber-700 dark:text-amber-400' : 'text-stone-500 dark:text-stone-400'
        }`}
      >
        {s.transit && (
          <>
            {TRANSIT_ICON[s.transit.mode]}{' '}
            <span className={stale ? 'line-through opacity-70' : ''}>
              {fmtDuration(s.transit.minutes, t('minutes'))} ·{' '}
              {fmtTransitDistance(transitKm(s.transit.mode, s.transit.minutes, s.transit.km))} ·{' '}
              {t(TRANSIT_LABEL[s.transit.mode])}
            </span>
            {!stale && s.transit.detail ? ` — ${s.transit.detail[lang]}` : ''}
          </>
        )}
        {stale && <> ⚠️ {t('planRouteStale')}</>}
        {showLink && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 font-medium text-red-700 dark:text-red-400 whitespace-nowrap"
          >
            🧭 {t('planCheckRoute')}
          </a>
        )}
      </p>
    );
  };

  return (
    <section id={`plan-${day.id}`} className="space-y-2 scroll-mt-2">
      {/* Header = the toggle. Collapsed days show a one-line summary. */}
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-2 border-b border-stone-300 dark:border-stone-700 pb-1 text-left"
      >
        <span className="flex-1 min-w-0">
          <span className="font-bold text-base">{day.title[lang]}</span>
          {/* Status follows the calendar: nothing before the day comes */}
          {isToday && (
            <span className="ml-2 rounded-full bg-red-700 text-white text-[10px] font-bold px-2 py-0.5 align-middle">
              ● {t('statusNow')}
            </span>
          )}
          {isPast && (
            <span className="ml-2 rounded-full bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 align-middle">
              ✓ {t('statusDone')}
            </span>
          )}
          {!isOpen && (
            <span className="block text-xs font-normal text-stone-500 dark:text-stone-400">
              {shown.length} {t('planStops')}
              {shown[0] ? ` · ${shown[0].time}–${shown[shown.length - 1].time}` : ''}
            </span>
          )}
        </span>
        {/* chevron: rotates when the day is open */}
        <span className={`shrink-0 text-stone-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
          ›
        </span>
      </button>

      {isOpen && dragEnabled && shown.length > 1 && (
        <p className="text-xs text-stone-500 dark:text-stone-400">⠿ {t('dragHint')}</p>
      )}

      {/* After a reorder the times no longer chain — offer to rebuild them. */}
      {isOpen && editing && anyStale && (
        <button
          onClick={retime}
          className="w-full rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 py-2 text-xs font-medium"
        >
          🕐 {t('planRetimeBtn')}
        </button>
      )}

      {isOpen &&
        rows.map(({ s, prev, stale }) => (
          <div
            key={s.id}
            {...(dragEnabled ? drag.itemProps(s.id) : {})}
            className={
              drag.draggingId === s.id ? 'rounded-xl ring-2 ring-red-600 shadow-lg opacity-95' : undefined
            }
          >
            {travelLine(s, prev, stale)}

            <div
              className={`rounded-xl shadow-sm p-3 space-y-1.5 ${
                s.id === nowStepId
                  ? 'bg-red-50 dark:bg-red-950 ring-2 ring-red-600'
                  : 'bg-white dark:bg-stone-900'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 rounded-lg bg-red-700 text-white text-xs font-bold px-2 py-1">
                  {s.time}
                  {s.id === nowStepId && (
                    <span className="block text-[9px] font-bold leading-none pb-0.5">
                      ● {t('stepNow')}
                    </span>
                  )}
                </span>
                {/* A 56×56 tile on every row so the text always lines up:
                    the place's itinerary photo when there is one, else a
                    category emoji (🕐 for a time-zone change, 🍽️ for a
                    meal, 🛏️ for a hotel, …) at the same size. */}
                {planStepPhoto(s.mapsQuery) ? (
                  <img
                    src={planStepPhoto(s.mapsQuery)}
                    alt=""
                    loading="lazy"
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="w-14 h-14 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-3xl shrink-0"
                  >
                    {stepIcon(s)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight">{s.name}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {s.durationMin ? `~${fmtDuration(s.durationMin, t('minutes'))}` : ''}
                    {s.optional && (
                      <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 font-medium">
                        {t('planOptional')}
                      </span>
                    )}
                  </p>
                </div>
                {editing && (
                  <span className="flex gap-1 shrink-0">
                    {/* Grip: press and drag (holding the row works too) */}
                    <button
                      {...drag.handleProps(s.id)}
                      aria-label={t('dragToReorder')}
                      className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 cursor-grab active:cursor-grabbing"
                    >
                      ⠿
                    </button>
                    <button onClick={() => onEditStep(s)} aria-label={t('editStop')} className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700">
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

              {s.note && <p className="text-xs text-stone-600 dark:text-stone-300">{s.note[lang]}</p>}

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

      {isOpen && editing && (
        <button
          onClick={onAddStep}
          className="w-full rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 py-2.5 text-sm font-medium text-stone-600 dark:text-stone-300"
        >
          ＋ {t('addStop')}
        </button>
      )}

      {isOpen && editing && !anyStale && shown.length > 1 && (
        <button
          onClick={retime}
          className="w-full rounded-xl bg-stone-200 dark:bg-stone-700 py-2 text-xs font-medium"
        >
          🕐 {t('planRetimeBtn')}
        </button>
      )}

      {isOpen && editing && (
        <button
          onClick={() => confirm(`${t('planResetDayConfirm')} — ${day.date}`) && resetDay(day)}
          className="w-full rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 py-2 text-xs font-medium"
        >
          ♻️ {t('planResetDayBtn')}
        </button>
      )}
    </section>
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
    transitKm: initial?.transit?.km?.toString() ?? '',
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
            // empty km field = let the app estimate it from mode + minutes
            km: form.transitKm ? Number(form.transitKm) : undefined,
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
          <label className="block text-sm w-20">
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
          <label className="block text-sm w-20">
            km
            <input
              className={input}
              type="number"
              min="0"
              step="0.1"
              placeholder="auto"
              value={form.transitKm}
              onChange={set('transitKm')}
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
