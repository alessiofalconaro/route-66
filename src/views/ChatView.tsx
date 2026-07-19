// Trip assistant. Two layers (CLAUDE.md section 9):
// 1. OFFLINE (always works): bundled "extra ideas" per segment, shown instantly.
// 2. ONLINE (enhancement): free-text follow-ups via the Cloudflare Worker →
//    Groq. On ANY failure we show the offline blurb + a small notice.
import { useState } from 'react';
import { CITIES, CITY_SEGMENT, LEGS, SEGMENTS, segmentById } from '../data/tripData';
import { EXTRA_IDEAS } from '../data/extraIdeas';
import { askAssistant, chatConfigured, type ChatMessage } from '../lib/chat';
import { useSessionState } from '../lib/storage';
import { useI18n } from '../i18n';

/** City id → the segment whose "extra ideas" best cover that city:
 *  its own city segment if it has one, otherwise the leg that ARRIVES there
 *  (whose ideas describe exactly that area). */
function citySegmentId(cityId: string): string {
  if (CITY_SEGMENT[cityId]) return CITY_SEGMENT[cityId];
  return LEGS.find((l) => l.hotelId === cityId)?.id ?? SEGMENTS[0].id;
}

export default function ChatView() {
  const { t, lang } = useI18n();
  // sessionStorage: the conversation survives switching tab or briefly
  // leaving the app; it resets only when the app is closed and reopened.
  // Value format: "city:<cityId>" or "leg:<segmentId>".
  const [sel, setSel] = useSessionState('chat.segment', 'city:chicago');
  const [messages, setMessages] = useSessionState<ChatMessage[]>('chat.messages', []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState(false);

  const [kind, selId] = sel.includes(':') ? sel.split(':') : ['leg', sel];
  const segment =
    segmentById(kind === 'city' ? citySegmentId(selId) : selId) ?? SEGMENTS[0];
  // What we tell the model: the city name when a city is picked (more precise
  // than the whole leg), the leg label otherwise.
  const contextLabel =
    kind === 'city' ? (CITIES.find((c) => c.id === selId)?.label ?? segment.label) : segment.label;
  const ideas = EXTRA_IDEAS[segment.id]?.[lang];

  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput('');
    setOfflineNotice(false);
    const next: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setBusy(true);
    try {
      const reply = await askAssistant(next, contextLabel, lang);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch {
      // Any failure (no signal, rate limit, not configured): offline fallback.
      const fallback = ideas ?? '';
      setMessages([...next, { role: 'assistant', content: fallback }]);
      setOfflineNotice(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">🤖 {t('chatTitle')}</h1>

      <label className="block text-sm font-medium">
        {t('chatPickSegment')}
        <select
          className="mt-1.5 w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2.5 text-sm"
          value={sel}
          onChange={(e) => {
            setSel(e.target.value);
            setMessages([]); // new place = fresh conversation
            setOfflineNotice(false);
          }}
        >
          {/* Same structure as Home: all the cities first, then the legs */}
          <optgroup label={`🏙️ ${t('inACity')}`}>
            {CITIES.map((c) => (
              <option key={c.id} value={`city:${c.id}`}>{c.label}</option>
            ))}
          </optgroup>
          <optgroup label={`🚗 ${t('drivingLeg')}`}>
            {LEGS.map((l) => (
              <option key={l.id} value={`leg:${l.id}`}>{l.label}</option>
            ))}
          </optgroup>
        </select>
      </label>

      {/* Offline layer: always shown instantly, works in airplane mode */}
      {ideas && (
        <div className="rounded-xl bg-white dark:bg-stone-900 shadow-sm p-3">
          <h3 className="font-semibold text-sm mb-1">💡 {t('chatOfflineIdeas')}</h3>
          <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap">{ideas}</p>
        </div>
      )}

      {/* Conversation */}
      {messages.map((m, i) => (
        <div
          key={i}
          className={`rounded-xl p-3 text-sm whitespace-pre-wrap ${
            m.role === 'user'
              ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 ml-6'
              : 'bg-white dark:bg-stone-900 shadow-sm mr-6'
          }`}
        >
          {m.content}
        </div>
      ))}
      {busy && <p className="text-sm text-stone-500 dark:text-stone-400">{t('chatThinking')}</p>}
      {offlineNotice && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {chatConfigured() ? t('chatOfflineShown') : t('chatNotConfigured')}
        </p>
      )}

      {/* Online layer input */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2.5 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('chatAskMore')}
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="rounded-lg bg-red-700 text-white px-4 text-sm font-medium disabled:opacity-50"
        >
          {t('chatSend')}
        </button>
      </div>
    </div>
  );
}
