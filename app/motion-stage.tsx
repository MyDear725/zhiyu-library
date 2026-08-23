"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

type MotionStageProps = {
  children: ReactNode;
  view: string;
};

export function MotionStage({ children, view }: MotionStageProps) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const main = scope.current?.querySelector("main");
    if (!main) return;

    const sections = Array.from(main.children).slice(0, 8);
    const media = gsap.matchMedia();

    media.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
        desktop: "(min-width: 860px)",
      },
      (context) => {
        const { reduceMotion, desktop } = context.conditions as {
          reduceMotion: boolean;
          desktop: boolean;
        };

        if (reduceMotion) {
          gsap.set([main, ...sections], { autoAlpha: 1, clearProps: "transform" });
          return;
        }

        const timeline = gsap.timeline({
          defaults: { duration: desktop ? 0.58 : 0.42, ease: "power3.out" },
        });

        timeline
          .fromTo(main, { autoAlpha: 0.72 }, { autoAlpha: 1, duration: 0.24 })
          .fromTo(
            sections,
            { autoAlpha: 0, y: desktop ? 20 : 12 },
            { autoAlpha: 1, y: 0, stagger: 0.055, clearProps: "transform,visibility" },
            0.05,
          );
      },
    );

    return () => media.revert();
  }, { scope, dependencies: [view], revertOnUpdate: true });

  return <div ref={scope} className="view-stage" data-view={view}>{children}</div>;
}
