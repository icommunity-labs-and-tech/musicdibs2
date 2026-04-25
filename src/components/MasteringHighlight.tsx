import { Wand2, Sparkles, Volume2, Radio, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";

// Compact "before/after" waveform: left bars look small/dull, right bars tall/bright
const BeforeAfterWave = () => {
  const total = 48;
  const bars = Array.from({ length: total });
  return (
    <div className="relative flex items-end justify-between h-14 sm:h-16 w-full gap-[2px]">
      {bars.map((_, i) => {
        const isAfter = i >= total / 2;
        const envelope =
          (Math.sin(i * 0.45) * 0.5 + Math.sin(i * 1.1 + 0.7) * 0.35 + 1) / 2;
        // Before: compressed/small. After: full dynamic, taller.
        const h = isAfter ? 30 + envelope * 70 : 14 + envelope * 28;
        return (
          <span
            key={i}
            className={`flex-1 rounded-full ${
              isAfter
                ? "bg-gradient-to-t from-fuchsia-400 to-pink-300 shadow-[0_0_8px_rgba(244,114,182,0.6)]"
                : "bg-white/20"
            }`}
            style={{ height: `${h}%` }}
          />
        );
      })}
      {/* Vertical divider with label */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-white/40 to-transparent"
      />
    </div>
  );
};

const BENEFITS = [
  { icon: Volume2, label: "Más volumen" },
  { icon: Sparkles, label: "Más claridad" },
  { icon: Radio, label: "Listo para streaming" },
];

export const MasteringHighlight = () => {
  const scrollToPricing = () => {
    document
      .getElementById("pricing-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="relative overflow-hidden py-14 sm:py-20"
      style={{
        background:
          "linear-gradient(180deg, #2a1747 0%, #2e1a4f 50%, #2a1747 100%)",
      }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 left-1/4 w-[26rem] h-[26rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 w-[26rem] h-[26rem] rounded-full bg-violet-600/20 blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div
            className="relative rounded-3xl p-6 sm:p-8 md:p-10 border border-white/10 backdrop-blur-xl shadow-[0_0_60px_rgba(217,70,239,0.18)]"
            style={{
              background:
                "linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(236,72,153,0.10) 50%, rgba(59,130,246,0.10) 100%)",
            }}
          >
            {/* Gradient border glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                padding: "1px",
                background:
                  "linear-gradient(135deg, rgba(244,114,182,0.45), rgba(168,85,247,0.35), rgba(59,130,246,0.25))",
                WebkitMask:
                  "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
            />

            <div className="relative grid md:grid-cols-[1fr_auto] gap-6 md:gap-8 items-center">
              {/* Left: copy */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/10 text-white/90 text-[11px] font-semibold tracking-wide uppercase mb-4">
                  <Headphones className="w-3.5 h-3.5 text-fuchsia-300" />
                  Masterizado IA
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-3">
                  Masteriza tu canción de forma{" "}
                  <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent">
                    profesional
                  </span>
                </h3>
                <p className="text-white/75 text-sm sm:text-base leading-relaxed mb-5 max-w-xl">
                  Mejora volumen, claridad y potencia para que tu música suene
                  lista para plataformas.
                </p>

                {/* Benefits */}
                <ul className="flex flex-wrap gap-2 mb-6">
                  {BENEFITS.map((b) => (
                    <li
                      key={b.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/10 text-white/90 text-xs font-medium"
                    >
                      <b.icon className="w-3.5 h-3.5 text-fuchsia-300" />
                      {b.label}
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  onClick={scrollToPricing}
                  className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white border-0 shadow-[0_0_30px_rgba(217,70,239,0.45)] hover:shadow-[0_0_45px_rgba(217,70,239,0.7)] hover:scale-[1.03] transition-all"
                >
                  <Wand2 className="w-4 h-4" />
                  Masterizar mi canción
                </Button>
              </div>

              {/* Right: before/after waveform card */}
              <div className="w-full md:w-[280px] lg:w-[320px]">
                <div className="rounded-2xl bg-black/40 border border-white/10 p-4 shadow-inner">
                  <div className="flex items-center justify-between text-[10px] font-semibold tracking-[0.18em] uppercase mb-3">
                    <span className="text-white/50">Antes</span>
                    <span className="text-fuchsia-300">Después</span>
                  </div>
                  <BeforeAfterWave />
                  <div className="mt-3 flex items-center justify-between text-[11px] text-white/60">
                    <span>Mezcla cruda</span>
                    <span className="text-white/90 font-medium">
                      Master listo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
