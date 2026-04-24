import { ScrollReveal } from "@/components/ScrollReveal";

export const BridgeStatement = () => {
  return (
    <section
      className="relative py-12 sm:py-16 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #1f1138 0%, #251541 50%, #251541 100%)",
      }}
      aria-label="Posicionamiento MusicDibs"
    >
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-40 rounded-full bg-fuchsia-600/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container mx-auto px-4 relative">
        <ScrollReveal>
          <p className="text-center max-w-3xl mx-auto text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-white/90 leading-snug">
            La plataforma{" "}
            <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(232,121,249,0.35)]">
              #1
            </span>{" "}
            para{" "}
            <span className="bg-gradient-to-r from-fuchsia-300 to-purple-300 bg-clip-text text-transparent">
              registrar y distribuir
            </span>{" "}
            música con IA de forma legal.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};
