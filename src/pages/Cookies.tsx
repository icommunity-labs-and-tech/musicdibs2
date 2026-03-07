import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const Cookies = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16082a] to-[#0d0618] text-white">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-12 text-center bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Política de Cookies
          </h1>

          <div className="prose prose-invert prose-pink max-w-none space-y-8">
            <p className="text-white/80 leading-relaxed">
              La presente política de cookies tiene por finalidad informarle de manera clara y precisa sobre las cookies que se utilizan en el sitio web de Musicdibs, propiedad de iCommunity Labs Techs S.L.
            </p>

            <h2 className="text-2xl font-bold text-white">¿Qué son las cookies?</h2>
            <p className="text-white/80">
              Una cookie es un pequeño fragmento de texto que los sitios web que visita envían al navegador y que permite al sitio web recordar información sobre su visita, como su idioma preferido y otras opciones, con el fin de facilitar su próxima visita y hacer que el sitio le sea más útil. Las cookies juegan un papel muy importante y contribuyen a una mejor experiencia de navegación para el usuario.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10">Tipos de cookies</h2>
            <p className="text-white/80">
              Dependiendo de quién sea la entidad que gestiona el dominio desde donde se envían las cookies y trata los datos obtenidos, se pueden distinguir dos tipos: cookies propias y cookies de terceros. Existe también una segunda clasificación según el plazo de tiempo que permanecen almacenadas en el navegador del cliente, pudiendo tratarse de cookies de sesión o cookies persistentes. Por último, existe otra clasificación con cinco tipos de cookies según la finalidad para la que se traten los datos obtenidos: cookies técnicas, cookies de personalización, cookies de análisis, cookies publicitarias y cookies de publicidad comportamental. Para más información al respecto puede consultar la Guía sobre el uso de cookies de la{' '}
              <a href="https://www.aepd.es/sites/default/files/2020-07/guia-cookies.pdf" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline">Agencia Española de Protección de Datos</a>.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10">Cookies utilizadas en el sitio web</h2>
            <p className="text-white/80">
              A continuación se identifican las cookies que se están utilizando en este portal, junto con su tipología y función:
            </p>
            <p className="text-white/80">
              <strong>Cookies técnicas:</strong> Son aquellas que permiten al usuario la navegación a través de una página web, plataforma o aplicación y la utilización de las diferentes opciones o servicios que en ella existan como, por ejemplo, controlar el tráfico y la comunicación de datos, identificar la sesión, acceder a partes de acceso restringido, recordar los elementos que integran un pedido, realizar el proceso de compra de un pedido, realizar la solicitud de inscripción o participación en un evento, utilizar elementos de seguridad durante la navegación, almacenar contenidos para la difusión de vídeos o sonido o compartir contenidos a través de redes sociales.
            </p>
            <p className="text-white/80">
              <strong>Cookies de personalización:</strong> Son aquellas que permiten al usuario acceder al servicio con algunas características de carácter general predefinidas en función de una serie de criterios en el terminal del usuario como, por ejemplo, el idioma, el servicio, la configuración regional desde la que se accede al servicio, etc.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10">Aceptación de la política de cookies</h2>
            <p className="text-white/80">
              Al pulsar el botón "Aceptar" se asume que acepta el uso de cookies.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10">Cómo modificar la configuración de cookies</h2>
            <p className="text-white/80">
              Puede restringir, bloquear o eliminar las cookies del sitio web de Musicdibs o de cualquier otro sitio web utilizando su navegador. En cada navegador la operación es diferente, la función "Ayuda" le mostrará cómo hacerlo.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10">Actualizaciones y cambios en la política de cookies</h2>
            <p className="text-white/80">
              iCommunity Labs Techs S.L. se reserva el derecho de modificar esta Política de Cookies en función de los requisitos legislativos y reglamentarios, o con el fin de adaptar dicha política a las instrucciones dictadas por la Agencia Española de Protección de Datos, por lo que se aconseja a los usuarios que la visiten periódicamente. Cuando se produzcan cambios significativos en esta Política de Cookies, estos se comunicarán a los usuarios ya sea a través de la web o por correo electrónico a los usuarios registrados.
            </p>

            <p className="text-white/80 mt-6">28 de febrero de 2022</p>

            {/* Copyright */}
            <div className="border-t border-white/20 pt-6 mt-10">
              <p className="text-white/60 text-sm">©iCommunity Labs Tech S.L. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Cookies;
