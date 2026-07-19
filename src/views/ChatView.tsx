// Trip assistant. Two layers (CLAUDE.md section 9):
// 1. OFFLINE (always works): bundled "extra ideas" per segment, shown instantly.
// 2. ONLINE (enhancement): free-text follow-ups via the Cloudflare Worker →
//    Groq. On ANY failure we show the offline blurb + a small notice.
import { useState } from 'react';
import { SEGMENTS } from '../data/tripData';
import { EXTRA_IDEAS } from '../data/extraIdeas';
import { askAssistant, chatConfigured, type ChatMessage } from '../lib/chat';
import { useI18n } from '../i18n';

export default function ChatView() {
  const { t, lang } = useI18n();
  const [segmentId, setSegmentId] = useState(SEGMENTS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState(false);

  const segment = SEGMENTS.find((s) => s.id === segmentId)!;
  const ideas = EXTRA_IDEAS[segmentId]?.[lang];

  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput('');
    setOfflineNotice(false);
    const next: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setBusy(true);
    try {
      const reply = await askAssistant(next, segment.label, lang);
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
          className="w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 py-2.5 text-sm"
          value={segmentId}
          onChange={(e) => {
            setSegmentId(e.target.value);
            setMessages([]); // new segment = fresh conversation
            setOfflineNotice(false);
          }}
        >
          {SEGMENTS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
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
