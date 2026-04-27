import { ScrollReveal } from "@/components/ScrollReveal";

export const BridgeStatement = () => {
  return (
    <section
      className="relative overflow-hidden py-14 sm:py-20 -mt-px -mb-px"
      style={{
        // Continuo: arranca donde acaba AIStudioShowcase (#251541)
        // y termina donde arranca PromoVisualsShowcase (#251541)
        background:
          "linear-gradient(180deg, #251541 0%, #2a1747 50%, #251541 100%)",
      }}
      aria-label="Posicionamiento Musicdibs"
    >
      {/* Subtle ambient glow — sin líneas duras */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-48 rounded-full bg-fuchsia-600/12 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-purple-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-violet-600/10 blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <ScrollReveal>
          <p className="text-center max-w-3xl mx-auto text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-white/90 leading-snug">
            La plataforma{" "}
            <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(232,121,249,0.35)]">
              #1
            </span>{" "}
            para{" "}
            <span className="bg-gradient-to-r from-fuchsia-300 to-purple-300 bg-clip-text text-transparent">
              crear y lanzar
            </span>{" "}
            música con validez legal.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};
