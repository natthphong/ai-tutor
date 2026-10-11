"use client";

import { useEffect, useRef, type RefObject } from "react";

type SwipeOptions = {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
};

/** Resistance past an edge: the further the drag, the less the card follows. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Where a flick would come to rest, using scroll-like deceleration. */
export function project(velocity: number, decelerationRate = 0.99): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Lets a card be dragged sideways with the finger to move to the previous or
 * next item. The card tracks the touch 1:1 from where it was grabbed, resists
 * at the first and last item, and on release goes where the flick was heading
 * rather than where the finger happened to stop. Touch and pen only: a mouse
 * drag stays free for selecting text.
 */
export function useSwipeNav(ref: RefObject<HTMLElement | null>, options: SwipeOptions, elementKey: string) {
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let pointer = -1;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let offset = 0;
    let samples: { x: number; t: number }[] = [];
    const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function settle(target: number, after?: () => void) {
      el!.style.transition = reduced() ? "none" : "transform 320ms cubic-bezier(.22,1,.36,1), opacity 220ms ease-out";
      el!.style.transform = target ? `translate3d(${target}px,0,0)` : "";
      el!.style.opacity = target ? "0" : "";
      window.setTimeout(() => {
        el!.style.transition = "";
        if (after) {
          el!.style.transform = "";
          el!.style.opacity = "";
          after();
        }
      }, reduced() ? 0 : target ? 170 : 320);
    }
    function down(event: PointerEvent) {
      if (latest.current.disabled || event.pointerType === "mouse" || pointer !== -1) return;
      if ((event.target as HTMLElement).closest("audio, input, textarea, [data-no-swipe]")) return;
      pointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      tracking = false;
      offset = 0;
      samples = [{ x: event.clientX, t: event.timeStamp }];
    }
    function move(event: PointerEvent) {
      if (event.pointerId !== pointer) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!tracking) {
        // Wait for a clear sideways intent before taking the gesture.
        if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { pointer = -1; return; }
        if (Math.abs(dx) < 10) return;
        tracking = true;
        startX = event.clientX;
        el!.setPointerCapture(pointer);
        el!.style.transition = "none";
        return;
      }
      samples.push({ x: event.clientX, t: event.timeStamp });
      if (samples.length > 5) samples.shift();
      const { canPrev, canNext } = latest.current;
      const blocked = (dx > 0 && !canPrev) || (dx < 0 && !canNext);
      offset = blocked ? rubberband(dx, el!.offsetWidth) : dx;
      el!.style.transform = `translate3d(${offset}px,0,0)`;
      el!.style.opacity = String(Math.max(0.55, 1 - Math.abs(offset) / (el!.offsetWidth * 1.6)));
    }
    function up(event: PointerEvent) {
      if (event.pointerId !== pointer) return;
      pointer = -1;
      if (!tracking) return;
      tracking = false;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const elapsed = Math.max(1, last.t - first.t);
      const velocity = ((last.x - first.x) / elapsed) * 1000;
      const landing = offset + project(velocity);
      const width = el!.offsetWidth;
      const { canPrev, canNext, onPrev, onNext } = latest.current;
      if (landing < -width * 0.35 && canNext) settle(-width * 0.5, onNext);
      else if (landing > width * 0.35 && canPrev) settle(width * 0.5, onPrev);
      else settle(0);
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    // The card is a new element for every item, so listeners follow its key.
  }, [ref, elementKey]);
}
