import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from "react";
import type { DesktopAppId } from "@/lib/desktop/apps";
import type { Rect } from "@/lib/desktop/window-store";
import { motion, motionDuration, prefersReducedMotion, windowAnchor } from "@/lib/desktop/motion";
type Options = { id: DesktopAppId; visible: boolean; minimized: boolean; mobile: boolean; rect: Rect; overview?: CSSProperties };
/** A single geometry owner retargets animations from their current visual frame. */
export function useWindowMotion(ref: RefObject<HTMLElement | null>, { id, visible, minimized, mobile, rect, overview }: Options) {
  const previous = useRef<{ visible: boolean; minimized: boolean; mobile: boolean } | null>(null), running = useRef<Animation | null>(null), settle = useRef<() => void>(() => {});
  const left = Number(overview?.left ?? rect.x), top = Number(overview?.top ?? rect.y), transform = String(overview?.transform ?? "none"), origin = String(overview?.transformOrigin ?? "top left");
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const was = previous.current; previous.current = { visible, minimized, mobile };
    const wasHidden = el.hidden; el.hidden = false;
    const from = el.getBoundingClientRect(), opacity = getComputedStyle(el).opacity, interrupted = !!running.current;
    running.current?.cancel(); running.current = null;
    el.style.left = `${left}px`; el.style.top = `${top}px`; el.style.width = `${rect.width}px`; el.style.height = `${rect.height}px`;
    if (mobile) el.style.removeProperty("transform"); else el.style.transform = transform;
    el.style.transformOrigin = origin; el.style.removeProperty("--os-pull");
    const to = el.getBoundingClientRect();
    const finish = () => { el.hidden = !visible; el.dataset.phase = visible ? "visible" : minimized ? "minimized" : "closed"; el.style.willChange = ""; };
    settle.current = finish;
    function animate(frames: Keyframe[], duration: number, phase: string, easing = motion.out) {
      el!.dataset.phase = phase;
      if (!duration || !el!.animate) { finish(); return; }
      el!.style.willChange = "transform, opacity";
      const animation = el!.animate(frames, { duration, easing }); running.current = animation;
      animation.finished.then(() => { if (running.current === animation) { finish(); running.current = null; } }, () => {});
    }
    const flip = (box: DOMRect) => `translate(${box.left - to.left}px,${box.top - to.top}px) scale(${box.width / (el.offsetWidth || 1)},${box.height / (el.offsetHeight || 1)})`;
    const anchor = windowAnchor(id, visible && !was?.visible && !was?.minimized);
    const middle = anchor ? `translate(${(anchor.left + anchor.width / 2 - (to.left + to.width / 2)) * .38 + to.width * .08}px,${(anchor.top + anchor.height / 2 - (to.top + to.height / 2)) * .38 + to.height * .2}px) scale(.84,.6)` : transform;
    if (prefersReducedMotion() || document.hidden || (was && was.mobile !== mobile)) { finish(); return; }
    if (!visible && (!was?.visible || wasHidden)) { finish(); return; }
    if (!visible) {
      if (mobile) animate([{ transform: `translateY(${from.top - to.top}px)`, opacity }, { transform: `translateY(${innerHeight}px)`, opacity: 1 }], motionDuration("exit", el), "exiting", motion.in);
      else if (minimized && anchor?.width) animate([{ transform: flip(from), opacity }, { transform: middle, opacity: .9, offset: .38 }, { transform: flip(anchor), opacity: 0 }], motionDuration("minimize", el), "minimizing", motion.minimizeEase);
      else animate([{ transform: flip(from), opacity }, { transform: `translate(${to.width * .03}px,${to.height * .024 + 6}px) scale(.94)`, opacity: 0 }], motionDuration("exit", el), "exiting", motion.in);
    } else if (!was?.visible || wasHidden) {
      const start = interrupted && !wasHidden ? flip(from) : mobile ? `translateY(${innerHeight}px)` : anchor?.width ? flip(anchor) : "translateY(12px) scale(.96)";
      const frames: Keyframe[] = [{ transform: start, opacity: interrupted && !wasHidden ? opacity : mobile ? 1 : 0 }];
      if (was?.minimized && anchor?.width && !interrupted && !mobile) frames.push({ transform: middle, opacity: .9, offset: .62 });
      frames.push({ transform, opacity: 1 });
      animate(frames, motionDuration(mobile ? "sheet" : was?.minimized ? "minimize" : "window", el), "entering", was?.minimized ? motion.out : motion.spring);
    } else if (Math.abs(from.x - to.x) > .5 || Math.abs(from.y - to.y) > .5 || Math.abs(from.width - to.width) > .5 || Math.abs(from.height - to.height) > .5) {
      animate([{ transform: flip(from), opacity }, { transform, opacity: 1 }], motionDuration("layout", el), "arranging");
    } else finish();
  }, [id, visible, minimized, mobile, left, top, rect.width, rect.height, transform, origin, ref]);
  useLayoutEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => { if (prefersReducedMotion() || document.hidden) { running.current?.cancel(); running.current = null; settle.current(); } };
    media.addEventListener("change", stop); document.addEventListener("visibilitychange", stop);
    const observer = new MutationObserver(stop), root = document.querySelector(".geeospace-os");
    if (root) observer.observe(root, { attributes: true, attributeFilter: ["data-motion"] });
    return () => { media.removeEventListener("change", stop); document.removeEventListener("visibilitychange", stop); observer.disconnect(); running.current?.cancel(); running.current = null; previous.current = null; };
  }, []);
  return {
    beginGesture(): Rect | undefined {
      const el = ref.current; if (!el || !running.current) return;
      const box = el.getBoundingClientRect(), parent = el.parentElement!.getBoundingClientRect();
      running.current.cancel(); running.current = null;
      if (mobile) { el.style.setProperty("--os-pull", `${Math.max(0, box.top - parent.top)}px`); settle.current(); return { x: 0, y: Math.max(0, box.top - parent.top), width: box.width, height: box.height }; }
      el.style.transform = "none";
      const visual = { x: box.left - parent.left, y: box.top - parent.top, width: box.width, height: box.height };
      el.style.left = `${visual.x}px`; el.style.top = `${visual.y}px`; el.style.width = `${visual.width}px`; el.style.height = `${visual.height}px`; settle.current(); return visual;
    },
    rebound() {
      const el = ref.current; if (!el) return; const from = getComputedStyle(el).transform; el.style.removeProperty("--os-pull");
      if (!prefersReducedMotion() && el.animate) { running.current?.cancel(); const animation = el.animate([{ transform: from }, { transform: "none" }], { duration: motionDuration("rebound", el), easing: motion.out }); running.current = animation; animation.finished.then(() => { if (running.current === animation) running.current = null; }, () => {}); }
    },
  };
}
