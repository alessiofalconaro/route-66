// "Hold and drag" reordering for the vertical lists (stops and plan steps).
//
// Hand-rolled on purpose: the app ships no UI libraries, and the browser's own
// drag-and-drop does not work on touch screens. Pointer Events cover mouse and
// finger with one code path.
//
// How it behaves:
//   - press and HOLD a row (~0.26 s) to pick it up; moving before that is a
//     normal scroll, so the list still scrolls the way it always did
//   - or press the ⠿ handle to pick it up immediately
//   - rows swap live while you drag, and the list auto-scrolls near the edges
//   - releasing commits the new order (one write, one sync push)
//
// TS notes for a Java dev:
//   - useRef({...}) is a mutable box that survives re-renders (like a field on
//     the instance). Writing to it does NOT trigger a re-render — that is why
//     the live order lives both there (for the handlers) and in state (to draw).
//   - the function returned by useEffect is its cleanup, like a finally block.

import { useCallback, useEffect, useRef, useState } from 'react';

const LONG_PRESS_MS = 260;
const MOVE_CANCEL_PX = 10; // finger travelled this far before the timer = scroll
const EDGE_PX = 90; // auto-scroll band at the top/bottom of the scroller
const EDGE_STEP = 12; // pixels per tick while auto-scrolling

interface Options {
  /** Current order (ids as rendered). */
  ids: string[];
  /** Called once, on drop, with the new order. */
  onCommit: (ids: string[]) => void;
  /** Dragging is only enabled in edit mode. */
  enabled: boolean;
}

export function useDragSort({ ids, onCommit, enabled }: Options) {
  // Order shown while a drag is in progress (null = just use `ids`).
  const [preview, setPreview] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLElement>()).current;
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const drag = useRef({
    id: null as string | null,
    order: [] as string[],
    active: false,
    startY: 0,
    lastY: 0,
    pointerId: -1,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    scroller: null as HTMLElement | null,
    autoScroll: undefined as ReturnType<typeof setInterval> | undefined,
    endedAt: 0,
  }).current;

  /** Moves the dragged row to wherever the finger currently is. */
  const reorderTo = useCallback(
    (y: number) => {
      if (!drag.active || !drag.id) return;
      const cur = drag.order;
      // Insert before the first row whose middle is below the pointer.
      let target = cur.length - 1;
      for (let i = 0; i < cur.length; i++) {
        const r = rows.get(cur[i])?.getBoundingClientRect();
        if (r && y < r.top + r.height / 2) {
          target = i;
          break;
        }
      }
      const from = cur.indexOf(drag.id);
      if (from === -1 || target === from) return;
      const next = [...cur];
      next.splice(target, 0, next.splice(from, 1)[0]);
      drag.order = next;
      setPreview(next);
    },
    [drag, rows],
  );

  const stop = useCallback(
    (commit: boolean) => {
      clearTimeout(drag.timer);
      clearInterval(drag.autoScroll);
      const finished = drag.active;
      const order = drag.order;
      drag.timer = undefined;
      drag.autoScroll = undefined;
      drag.scroller = null;
      drag.active = false;
      drag.id = null;
      if (finished) drag.endedAt = Date.now(); // swallow the click that follows
      setDraggingId(null);
      setPreview(null);
      if (commit && finished && order.length && order.join() !== idsRef.current.join()) {
        onCommit(order);
      }
    },
    [drag, onCommit],
  );

  /** Picks the row up: from the long-press timer, or straight from the handle. */
  const begin = useCallback(
    (id: string, el: HTMLElement, pointerId: number, y: number) => {
      drag.id = id;
      drag.order = [...idsRef.current];
      drag.active = true;
      drag.lastY = y;
      drag.pointerId = pointerId;
      drag.scroller = el.closest('main');
      try {
        el.setPointerCapture(pointerId); // keeps the moves coming to this row
      } catch {
        /* mouse without capture support — pointermove still bubbles */
      }
      navigator.vibrate?.(15);
      setDraggingId(id);
      setPreview([...idsRef.current]);
      // Auto-scroll while the finger sits near the top/bottom of the screen.
      drag.autoScroll = setInterval(() => {
        const sc = drag.scroller;
        if (!sc || !drag.active) return;
        const r = sc.getBoundingClientRect();
        const dy =
          drag.lastY < r.top + EDGE_PX ? -EDGE_STEP : drag.lastY > r.bottom - EDGE_PX ? EDGE_STEP : 0;
        if (dy !== 0) {
          sc.scrollTop += dy;
          reorderTo(drag.lastY);
        }
      }, 16);
    },
    [drag, reorderTo],
  );

  // While dragging: block the page from scrolling under the finger (iOS only
  // honours preventDefault on a NON-passive listener, which React does not
  // give us), and always release if the pointer dies outside the row.
  useEffect(() => {
    if (!draggingId) return;
    const block = (e: TouchEvent) => e.preventDefault();
    const onUp = () => stop(true);
    const onCancel = () => stop(false);
    document.addEventListener('touchmove', block, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      document.removeEventListener('touchmove', block);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [draggingId, stop]);

  // Drop everything if the component unmounts mid-drag.
  useEffect(() => () => {
    clearTimeout(drag.timer);
    clearInterval(drag.autoScroll);
  }, [drag]);

  /** Props for the row itself: hold to pick up. */
  const itemProps = (id: string) => ({
    ref: (el: HTMLElement | null) => {
      if (el) rows.set(id, el);
      else rows.delete(id);
    },
    onPointerDown: (e: React.PointerEvent) => {
      if (!enabled || drag.active) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const el = e.currentTarget as HTMLElement;
      drag.startY = e.clientY;
      drag.lastY = e.clientY;
      const pid = e.pointerId;
      drag.timer = setTimeout(() => begin(id, el, pid, drag.lastY), LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      drag.lastY = e.clientY;
      if (!drag.active) {
        // Moved before the hold completed → it was a scroll, not a drag.
        if (drag.timer && Math.abs(e.clientY - drag.startY) > MOVE_CANCEL_PX) {
          clearTimeout(drag.timer);
          drag.timer = undefined;
        }
        return;
      }
      reorderTo(e.clientY);
    },
    onPointerUp: () => {
      clearTimeout(drag.timer);
      drag.timer = undefined;
      if (drag.active) stop(true);
    },
    onPointerCancel: () => {
      clearTimeout(drag.timer);
      drag.timer = undefined;
      if (drag.active) stop(false);
    },
    // A drag ends with a click event on the row: don't let it open a link.
    onClickCapture: (e: React.MouseEvent) => {
      if (Date.now() - drag.endedAt < 300) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    style: draggingId === id ? ({ touchAction: 'none' } as const) : undefined,
  });

  /** Props for the ⠿ grip: picks the row up immediately, no hold needed. */
  const handleProps = (id: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (!enabled || drag.active) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const el = rows.get(id);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      drag.startY = e.clientY;
      begin(id, el, e.pointerId, e.clientY);
    },
    style: { touchAction: 'none' as const },
  });

  return {
    /** The order to render right now. */
    order: preview ?? ids,
    draggingId,
    itemProps,
    handleProps,
  };
}
