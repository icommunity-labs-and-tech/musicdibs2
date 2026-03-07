import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16082a] to-[#0d0618] text-white">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-12 text-center bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Términos y Condiciones
          </h1>

          <div className="prose prose-invert prose-pink max-w-none space-y-8">
            {/* General Terms */}
            <h2 className="text-2xl font-bold text-white">Condiciones generales de compra</h2>
            <h3 className="text-xl font-semibold text-pink-300">Condiciones Generales</h3>
            <p className="text-white/80 leading-relaxed">
              <strong>Musicdibs</strong> es un producto de iCommunity Labs Tech S.L. (en adelante "iCommunity Labs" o "iCommunity"), empresa regida por la legislación española, con domicilio social en Madrid, en C/Colmenares, nº3, Bajo-D, CP 28004, Madrid, con C.I.F. B88350897 e inscrita en el Registro Mercantil de Madrid en el tomo 39.161, Folio 40, Sección 8, Hoja M-695696.
            </p>

            {/* Refund and Withdrawal */}
            <h2 className="text-2xl font-bold text-white mt-10">Política de Reembolso y Desistimiento</h2>
            <p className="text-white/80">
              En cumplimiento del deber de información en contratos a distancia establecido en el Real Decreto Legislativo 1/2007, de 16 de noviembre, por el que se aprueba el texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios y otras leyes complementarias, en su última revisión, vigente desde el 29 de marzo de 2014, se informa al consumidor de la información que se refleja a continuación:
            </p>

            <h3 className="text-xl font-semibold text-pink-300">Proceso de compra online</h3>
            <p className="text-white/80">
              La validación de un pedido en nuestra web implica el conocimiento y la aceptación de las condiciones de uso y compra tal como se expresan en esta página. Tras completar la compra, el cliente recibirá un email con el registro de su pedido en un plazo inferior a 24 horas. Si no lo recibe, revise su carpeta de spam o la política de su servidor para correos SPAM.
            </p>

            <h3 className="text-xl font-semibold text-pink-300">Garantía</h3>
            <p className="text-white/80">
              Nuestro departamento de atención al cliente dispone de un servicio postventa para resolver cualquier problema con nuestro servicio de certificación y verificación, a través del cual tratamos de ofrecer una atención rápida y eficiente a nuestros clientes. Si tiene alguna duda sobre el uso de musicdibs, contacte con nosotros en{' '}
              <a href="mailto:info@musicdibs.com" className="text-pink-400 hover:text-pink-300 underline">info@musicdibs.com</a>{' '}
              y haremos lo posible por solucionarlo.
            </p>

            <h3 className="text-xl font-semibold text-pink-300">Cancelación de compra</h3>
            <p className="text-white/80">
              Dada la naturaleza personalizada e individualizada de los servicios ofrecidos, no será posible ejercer el derecho de cancelación de la compra, salvo en el caso de la compra de créditos para registros "sin suscripción". Para solicitar el desistimiento dentro de los 14 días posteriores a la compra, envíe un email a{' '}
              <a href="mailto:info@musicdibs.com" className="text-pink-400 hover:text-pink-300 underline">info@musicdibs.com</a>{' '}
              incluyendo: nombre completo, DNI del documento de identificación utilizado en el proceso de registro, nombre de usuario o email y número de pedido. Procederemos a reembolsar el importe abonado en un plazo de 14 días naturales, utilizando el mismo medio de pago utilizado por usted para la transacción inicial. Como consecuencia de la cancelación de la compra, deduciremos la cantidad respectiva de créditos de su cuenta.
            </p>
            <p className="text-white/80">
              <strong>Importante: si desea cancelar la renovación de una suscripción (mensual o anual), debe hacerlo antes de que se renueve automáticamente, desde su cuenta de usuario.</strong>
            </p>

            <h3 className="text-xl font-semibold text-pink-300">Reembolsos</h3>
            <p className="text-white/80">
              Dada la naturaleza personalizada e individualizada de los servicios ofrecidos, no serán posibles los reembolsos, salvo en el caso de la compra de créditos para registros "sin suscripción". De acuerdo con la normativa vigente, los clientes tienen hasta 30 días naturales para solicitar el reembolso de sus compras de créditos, siempre que no los hayan utilizado. Si han pasado más de 30 días desde su compra o si se ha utilizado parte de los créditos del paquete adquirido, no tendrá derecho a ningún tipo de reembolso (ni total ni parcial). <strong>Los créditos regalados a través de campañas promocionales o similares no son reembolsables en ningún caso.</strong> Para solicitar un reembolso dentro de los 30 días posteriores a la compra, envíe un email a{' '}
              <a href="mailto:info@musicdibs.com" className="text-pink-400 hover:text-pink-300 underline">info@musicdibs.com</a>{' '}
              incluyendo: nombre completo, DNI del documento de identificación utilizado en el proceso de registro, nombre de usuario o email y número de pedido. Procederemos a reembolsar el importe abonado en un plazo de 14 días naturales, utilizando el mismo medio de pago utilizado por usted para la transacción inicial.
            </p>

            {/* Subscription Conditions */}
            <h2 className="text-2xl font-bold text-white mt-10">Condiciones de suscripción</h2>
            <p className="text-white/80">
              Al confirmar su suscripción, autoriza a iCommunity Labs Tech S.L. a realizar futuros cargos en su tarjeta de acuerdo con estos términos y condiciones. Puede cancelarla en cualquier momento, pero con un mínimo de 24 horas antes de su renovación. Para cancelar su suscripción, acceda a la página de Configuración, en la pestaña "Suscripciones" y seleccione la suscripción que desea cancelar. Eliminar su cuenta no cancela automáticamente una suscripción.
            </p>
            <p className="text-white/80">
              <strong>Importante:</strong> 1. Si desea cancelar la renovación de una suscripción, debe hacerlo al menos 24 horas antes de que se renueve automáticamente, desde su cuenta de usuario. 2. El derecho de cancelación de compra NO aplica a las suscripciones. Una vez realizada la primera compra de suscripción, las siguientes renovaciones serán automáticas y deberá cancelarla antes de que se realice el cargo.
            </p>

            <h3 className="text-xl font-semibold text-pink-300">Uso abusivo</h3>
            <p className="text-white/80">
              Queda prohibida la reventa o el uso no autorizado de los créditos adquiridos por terceros que no sean el titular de la cuenta. En el caso de suscripciones ilimitadas y con el fin de eliminar posibles usos abusivos que puedan perjudicar el funcionamiento de la solución, se realizará un seguimiento mensual del consumo y se podrá restringir el uso si se detectan dichos usos abusivos. iCommunity considera como "usos abusivos" aquellas suscripciones que superen un uso lógico por parte del autor, sin causa justificada. Si esto ocurriera, la suscripción podrá ser cancelada, sin derecho a reembolso.
            </p>

            <h3 className="text-xl font-semibold text-pink-300">NFTs</h3>
            <p className="text-white/80">
              Los NFTs están limitados en función de lo indicado en cada suscripción, con un máximo de acuñación de hasta 1.000 unidades por NFT. Es responsabilidad exclusiva del usuario proporcionar la dirección de una <strong>wallet compatible con la red Polygon</strong>. El usuario es el único responsable de los costes relacionados con el envío de los NFTs a terceros, costes relacionados con la puesta a la venta de los NFTs, costes de registro de su cuenta de Opensea y cualquier otro coste relacionado con transacciones en la blockchain. El usuario se compromete a registrar y generar NFTs únicamente para obras de su propia autoría, o en su defecto, para las que cuente con los permisos adecuados.
            </p>

            {/* ICOM Tokens */}
            <h2 className="text-2xl font-bold text-white mt-10">Compra con tokens ICOM</h2>
            <p className="text-white/80">
              Los ICOMs son los tokens de utilidad de iCommunity (la empresa propietaria de Musicdibs) y pueden utilizarse para comprar créditos de musicdibs <strong>con un 20% de bonificación de descuento</strong> sobre el precio original del producto elegido. Para más información sobre los ICOMs y cómo obtenerlos, visite{' '}
              <a href="https://www.icommunity.io/icom/en/" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline">icommunity.io/icom</a>.
            </p>
            <p className="text-white/80">Para realizar una compra con tokens ICOM siga los siguientes pasos:</p>
            <ol className="list-decimal pl-6 text-white/80 space-y-2">
              <li>Transfiera la cantidad correspondiente de ICOMs a nuestra wallet: 0x78B576612b02086954342075245f2b8ebEDBDb60</li>
              <li>Envíe un email a <a href="mailto:hello@icommunity.io" className="text-pink-400 hover:text-pink-300 underline">hello@icommunity.io</a> con su número de pedido y hash de la transacción para facilitar la verificación del pago.</li>
            </ol>

            {/* Offers */}
            <h2 className="text-2xl font-bold text-white mt-10">Ofertas y promociones</h2>
            <p className="text-white/80">
              Las ofertas disponibles en la web están limitadas a las primeras 1000 compras que paguen el producto en oferta, salvo en situaciones excepcionales indicadas explícitamente en la promoción. Cualquier oferta finalizará cuando termine su tiempo definido, o los paquetes disponibles, lo que ocurra primero. Los descuentos aplicados son sobre la tarifa estándar del producto. En el caso de las suscripciones, las ofertas aplican solo al primer pago, salvo situaciones excepcionales indicadas explícitamente.
            </p>

            {/* Contact */}
            <h3 className="text-xl font-semibold text-pink-300 mt-10">Contacto</h3>
            <p className="text-white/80">
              Musicdibs es una marca registrada de iCommunity Labs Tech S.L. Gran Vía 26, 28005 Madrid. España.{' '}
              Email: <a href="mailto:info@musicdibs.com" className="text-pink-400 hover:text-pink-300 underline">info@musicdibs.com</a>
            </p>

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

export default Terms;
