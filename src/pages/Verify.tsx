import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { Upload, ShieldCheck, FileSearch, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";

const Verify = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<"idle" | "verified" | "not_found">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult("idle");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleVerify = () => {
    if (!file) return;
    setVerifying(true);
    // Simulated verification — in production this would call the backend
    setTimeout(() => {
      setVerifying(false);
      setResult("not_found");
    }, 2000);
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO title="Verificar obra" description="Comprueba si una obra ha sido registrada en MusicDibs. Verifica su certificación blockchain al instante." path="/verify" />
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-8">
            <ShieldCheck className="w-5 h-5 text-pink-300" />
            <span className="text-white/90 text-sm font-medium">Verificación de registros</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Verifica la autenticidad<br />
            <span className="bg-gradient-to-r from-pink-400 to-purple-300 bg-clip-text text-transparent">de cualquier obra</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
            Comprueba si una obra ha sido previamente registrada en <strong className="text-white">Musicdibs</strong>. 
            Selecciona el archivo original y verifica su certificación al instante.
          </p>
        </div>
      </section>

      {/* Verify Card */}
      <section className="px-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <FileSearch className="w-6 h-6 text-pink-400" />
              <h2 className="text-xl font-semibold text-white">Verificar obra</h2>
            </div>

            <p className="text-white/60 mb-8 text-sm leading-relaxed">
              Arrastra o selecciona el <strong className="text-white/80">archivo original</strong> que fue registrado en Musicdibs. 
              Nuestro sistema comparará su huella digital con los registros almacenados en blockchain para confirmar su autenticidad.
            </p>

            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 mb-6 ${
                dragOver
                  ? "border-pink-400 bg-pink-400/10"
                  : file
                  ? "border-green-400/50 bg-green-400/5"
                  : "border-white/20 hover:border-white/40 bg-white/5"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                  <span className="text-white/90 font-medium truncate max-w-xs">{file.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult("idle"); }}
                    className="text-white/40 hover:text-white/80 transition-colors ml-2"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-white/30 mx-auto mb-3" />
                  <p className="text-white/60 text-sm">
                    <span className="text-pink-400 font-medium">Haz clic para seleccionar</span> o arrastra tu archivo aquí
                  </p>
                  <p className="text-white/30 text-xs mt-1">Audio, vídeo, imagen o documento</p>
                </>
              )}
            </div>

            {/* Verify button */}
            <Button
              onClick={handleVerify}
              disabled={!file || verifying}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-6 text-lg rounded-xl transition-all duration-200 disabled:opacity-40"
            >
              {verifying ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : (
                "Verificar"
              )}
            </Button>

            {/* Result */}
            {result === "verified" && (
              <div className="mt-6 p-5 bg-green-500/10 border border-green-400/30 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 className="w-6 h-6 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-green-300 font-semibold">Obra verificada</p>
                  <p className="text-green-200/70 text-sm mt-1">
                    Esta obra se encuentra registrada en Musicdibs con un certificado válido en blockchain.
                  </p>
                </div>
              </div>
            )}
            {result === "not_found" && (
              <div className="mt-6 p-5 bg-amber-500/10 border border-amber-400/30 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                <AlertCircle className="w-6 h-6 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-amber-300 font-semibold">No se encontraron registros</p>
                  <p className="text-amber-200/70 text-sm mt-1">
                    Este archivo no coincide con ninguna obra registrada en Musicdibs. Asegúrate de subir el archivo original sin modificaciones.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">¿Cómo funciona?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Sube tu archivo",
                desc: "Selecciona el archivo original que fue registrado en Musicdibs. Puede ser audio, vídeo, imagen o documento.",
              },
              {
                step: "02",
                title: "Comparación blockchain",
                desc: "Nuestro sistema genera una huella digital del archivo y la compara con los registros almacenados en blockchain.",
              },
              {
                step: "03",
                title: "Resultado instantáneo",
                desc: "En segundos sabrás si la obra está registrada y podrás confirmar su autoría y fecha de registro.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-5xl font-black bg-gradient-to-b from-pink-400/60 to-transparent bg-clip-text text-transparent mb-4">
                  {item.step}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Verify;
