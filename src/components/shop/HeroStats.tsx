"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 60, prefix: "+", suffix: " mil", label: "Seguidores en redes" },
  { value: 10, prefix: "+", suffix: "", label: "Años de atención" },
  { value: 9, prefix: "", suffix: "", label: "Departamentos con envío" },
] as const;

export function HeroStats() {
  const root = useRef<HTMLDListElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = root.current;
    if (!element) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setProgress(1);
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();

        const startedAt = performance.now();
        const duration = 1300;
        const animate = (now: number) => {
          const elapsed = Math.min((now - startedAt) / duration, 1);
          // Salida suave: avanza rápido al principio y aterriza sin un corte brusco.
          setProgress(1 - Math.pow(1 - elapsed, 3));
          if (elapsed < 1) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
      },
      { threshold: 0.35 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <dl
      ref={root}
      className="mt-10 grid overflow-hidden border-y border-line bg-ink-900/40 sm:grid-cols-3 sm:divide-x sm:divide-line"
    >
      {STATS.map((stat) => {
        const current = Math.round(stat.value * progress);
        return (
          <div
            key={stat.label}
            className="flex min-w-0 flex-col items-center border-b border-line px-4 py-4 text-center last:border-b-0 sm:border-b-0 sm:px-3 sm:py-5 lg:px-5"
          >
            <dt className="mt-1.5 text-[10px] uppercase leading-snug tracking-[0.12em] text-content-dim lg:text-[11px] lg:tracking-[0.14em]">
              {stat.label}
            </dt>
            <dd
              className="order-first whitespace-nowrap font-display text-[clamp(1.75rem,4vw,2.25rem)] leading-none text-content tabular"
              aria-label={`${stat.prefix}${stat.value}${stat.suffix} ${stat.label}`}
            >
              <span aria-hidden>
                {stat.prefix}
                {current}
                {stat.suffix}
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
