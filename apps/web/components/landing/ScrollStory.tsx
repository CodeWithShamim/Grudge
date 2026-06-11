"use client";

import { useEffect, useRef } from "react";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";

/**
 * Landing scenes 2–4 (motion spec #8): a GSAP ScrollTrigger story, scrubbed
 * by scroll, with Lenis smooth-scrolling. Transform/opacity only; pinned demo
 * ticket; doubt piles onto the tug bar; validator nodes flip; the VERIFIED
 * stamp slams; settle gold washes in with the CTA.
 *
 * With prefers-reduced-motion the scenes render statically (no pin, no scrub).
 */
export function ScrollStory() {
  const root = useRef<HTMLDivElement>(null);
  const { prefersReduced } = useReducedMotionSafe();

  useEffect(() => {
    if (prefersReduced || !root.current) return;
    let lenis: { destroy: () => void; raf: (t: number) => void } | null = null;
    let ctx: { revert: () => void } | null = null;
    let rafId = 0;
    let cancelled = false;

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);

      lenis = new Lenis();
      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
      ScrollTrigger.refresh();

      ctx = gsap.context(() => {
        const q = gsap.utils.selector(root.current);

        // Scene 2: ticket pins; doubt stakes pile onto the tug bar.
        const tl2 = gsap.timeline({
          scrollTrigger: { trigger: "[data-scene='2']", start: "top top", end: "+=1400", scrub: 0.6, pin: true },
        });
        tl2
          .fromTo(q("[data-el='ticket']"), { y: 80, opacity: 0 }, { y: 0, opacity: 1, ease: "none" })
          .fromTo(q("[data-el='tug-doubt']"), { scaleX: 0.12 }, { scaleX: 0.72, ease: "none", duration: 2 }, "<+0.3");
        q("[data-el='doubt-chip']").forEach((chip, i) => {
          tl2.fromTo(
            chip,
            { y: -120, opacity: 0, rotate: -8 + i * 6 },
            { y: 0, opacity: 1, rotate: -3 + i * 3, ease: "power2.out", duration: 0.5 },
            0.4 + i * 0.35,
          );
        });

        // Scene 3: evidence -> validator arc -> VERIFIED stamp, scrubbed.
        const tl3 = gsap.timeline({
          scrollTrigger: { trigger: "[data-scene='3']", start: "top top", end: "+=1600", scrub: 0.6, pin: true },
        });
        tl3.fromTo(q("[data-el='evidence']"), { y: 60, opacity: 0 }, { y: 0, opacity: 1, ease: "none" });
        q("[data-el='vnode']").forEach((node, i) => {
          tl3.fromTo(node, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, ease: "back.out(2)", duration: 0.3 }, 0.5 + i * 0.15);
          tl3.to(node, { backgroundColor: "#19c37d", color: "#101216", duration: 0.2 }, 1.6 + i * 0.18);
        });
        tl3.fromTo(
          q("[data-el='stamp']"),
          { scale: 1.6, opacity: 0, rotate: -5 },
          { scale: 1, opacity: 1, rotate: -5, ease: "power4.in", duration: 0.5 },
          2.8,
        );

        // Scene 4: settle — gold wash + CTA rises.
        gsap.fromTo(
          q("[data-el='cta-wrap']"),
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: "[data-scene='4']", start: "top 70%", end: "top 30%", scrub: 0.6 },
          },
        );
      }, root);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      ctx?.revert();
      lenis?.destroy();
    };
  }, [prefersReduced]);

  return (
    <div ref={root} className="overflow-hidden">
      {/* Scene 2 — doubt piles on */}
      <section data-scene="2" className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-mut">1 · they put money on your failure</p>
        <div data-el="ticket" className="grain relative w-full max-w-lg rounded-card bg-ink-soft p-6 shadow-e3">
          <h3 className="display-statement mb-4 text-display-md text-paper">I will run 5km every day for 30 days</h3>
          <div className="relative flex h-8 overflow-hidden rounded-control">
            <div className="stripes-believe h-full flex-1 animate-stripe-drift" />
            <div
              data-el="tug-doubt"
              className="stripes-doubt h-full w-full origin-right animate-stripe-drift"
              style={{ transform: "scaleX(0.12)", willChange: "transform" }}
            />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["150 GEN — “you quit everything”", "80 GEN — “day 9, you're done”", "120 GEN — “easy money”"].map((t) => (
              <span
                key={t}
                data-el="doubt-chip"
                className="rounded-full bg-doubt px-4 py-2 font-mono text-xs font-bold text-paper shadow-e2"
                style={{ willChange: "transform, opacity" }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Scene 3 — the tribunal */}
      <section data-scene="3" className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-mut">2 · validator LLMs judge your proof</p>
        <div data-el="evidence" className="grain relative mb-10 w-full max-w-md rounded-card bg-ink-soft p-5 shadow-e2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mut">evidence · day 12</p>
          <p className="mt-1 text-sm text-paper/90">“5.3km, 30:55 — Strava link attached”</p>
        </div>
        <div className="mb-10 flex items-end gap-4">
          {[28, 8, 0, 8, 28].map((y, i) => (
            <div
              key={i}
              data-el="vnode"
              className="flex size-12 items-center justify-center rounded-full bg-ink-raised font-mono text-xs font-bold text-mut shadow-e2"
              style={{ transform: `translateY(${y}px)`, willChange: "transform, opacity" }}
            >
              V{i + 1}
            </div>
          ))}
        </div>
        <div
          data-el="stamp"
          className="border-4 border-believe px-8 py-2 font-display text-4xl uppercase italic tracking-wider text-believe"
          style={{ willChange: "transform, opacity", opacity: 0 }}
        >
          VERIFIED
        </div>
      </section>

      {/* Scene 4 — settle + CTA */}
      <section data-scene="4" className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <div data-el="cta-wrap" style={{ willChange: "transform, opacity" }}>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-gold">3 · deadline hits — the contract pays</p>
          <h2 className="display-statement mb-8 max-w-3xl text-display-lg text-paper">
            Win: you take the doubters&apos; pool.
            <br />
            <span className="text-doubt">Fold: they mint the receipts.</span>
          </h2>
          <a
            href="/create"
            className="inline-block rounded-control bg-gold px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-ink shadow-e3 transition-transform hover:bg-gold/90 active:scale-[0.97]"
          >
            Put money on yourself
          </a>
        </div>
      </section>
    </div>
  );
}
