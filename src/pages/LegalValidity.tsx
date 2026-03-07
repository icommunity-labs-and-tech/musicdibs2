import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Shield, Lock, Globe, FileCheck, Link as LinkIcon } from "lucide-react";

const LegalValidity = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16082a] to-[#0d0618] text-white">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Validez Legal
          </h1>
          <p className="text-white/70 text-center text-lg mb-16 max-w-2xl mx-auto">
            En Musicdibs, entendemos lo importante que es proteger tus creaciones musicales. Nuestra certificación basada en blockchain garantiza la seguridad e inmutabilidad de tus obras, con validez legal en todo el mundo.
          </p>

          {/* Legal Framework */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-pink-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Marco Legal</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-pink-400 mt-1 shrink-0" />
                <span className="text-white/80">
                  <strong className="text-white">Convenio de Berna</strong> para la protección de obras literarias y artísticas.{" "}
                  <a href="https://www.wipo.int/treaties/es/ip/berne/" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline inline-flex items-center gap-1">
                    Ver aquí <LinkIcon className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-pink-400 mt-1 shrink-0" />
                <span className="text-white/80">
                  <strong className="text-white">Tratado OMPI</strong> sobre derecho de autor.{" "}
                  <a href="https://www.wipo.int/treaties/es/ip/wct/" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline inline-flex items-center gap-1">
                    Ver aquí <LinkIcon className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-pink-400 mt-1 shrink-0" />
                <span className="text-white/80">
                  <strong className="text-white">Directiva Europea sobre Derechos de Autor en la Era Digital</strong>.{" "}
                  <a href="https://digital-strategy.ec.europa.eu/es/policies/copyright" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline inline-flex items-center gap-1">
                    Ver aquí <LinkIcon className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-pink-400 mt-1 shrink-0" />
                <span className="text-white/80">
                  <strong className="text-white">Regulación de blockchain aplicada a propiedad intelectual</strong>.
                </span>
              </li>
            </ul>
            <p className="text-white/70 mt-6 border-t border-white/10 pt-6">
              Cada registro genera un certificado digital inmutable y verificable que sirve como prueba legal de autoría. Si alguna vez necesitas defender tu creación en una disputa legal, tu certificación de Musicdibs te respalda.
            </p>
          </div>

          {/* Blockchain */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Trabajamos con Blockchain</h2>
            </div>
            <p className="text-white/80 leading-relaxed mb-4">
              La <a href="https://www.youtube.com/watch?v=Yn8WGaO__ak" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline">tecnología blockchain</a> ha revolucionado la forma en que almacenamos y compartimos información. Utilizando criptografía para mantener la información segura, blockchain ofrece una base de datos descentralizada basada en una red de ordenadores independientes, llamados nodos.
            </p>
            <p className="text-white/80 leading-relaxed">
              Cada uno de estos nodos tiene que validar y aprobar un cambio en la red, lo que reduce las dependencias y vulnerabilidades del almacenamiento centralizado de información. Cumple con la Legislación Europea, gracias a su sello de tiempo, garantizando la máxima prueba posible de autoría basada en la fecha y hora del registro.
            </p>
          </div>

          {/* Identity Verification */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Globe className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Verificación de Identidad</h2>
            </div>
            <p className="text-white/80 leading-relaxed mb-4">
              Al igual que cuando vas a un notario para firmar un documento, o cuando vas a un registro público para llevar a cabo una inscripción, te piden tu documento de identidad para verificar tu identidad, para que las certificaciones emitidas por Musicdibs tengan validez legal, deben estar asociadas a una identidad previamente verificada.
            </p>
            <p className="text-white/80 leading-relaxed">
              Puedes estar tranquilo de que tus datos personales no serán compartidos con nadie y solo serán utilizados con este fin. Además, debes saber que al realizar las certificaciones de blockchain, esta información no será visible, ya que gracias a la criptografía "anonimizamos" todas las operaciones, manteniendo tus datos personales a salvo.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LegalValidity;
