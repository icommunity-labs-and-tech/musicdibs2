// FAQ page translations: ES, EN, PT-BR
// Separated to keep main i18n.ts manageable

export const faqTranslations: Record<string, Record<string, any>> = {
  es: {
    faq: {
      title: 'Preguntas Frecuentes',
      subtitle: 'Encuentra respuestas a las preguntas más comunes sobre Musicdibs',
      seo_description: 'Preguntas frecuentes sobre MusicDibs: registro blockchain, distribución musical, certificados y más.',
      items: [
        {
          q: '¿Los créditos de suscripción no utilizados son acumulativos al renovar anualmente?',
          a: 'Los créditos no utilizados de suscripciones anuales y ofertas especiales no se acumulan al renovar el siguiente periodo de facturación.',
        },
        {
          q: '¿Puede un menor registrar sus producciones?',
          a: 'Los menores pueden solicitar el registro de sus derechos de autor a través de sus padres o representantes legales, quienes deben acreditar su relación con el menor mediante el documento correspondiente (libro de familia o documento legal que acredite la tutela o representación legal del menor).',
        },
        {
          q: '¿Puedo verificar en Musicdibs canciones registradas en otras plataformas?',
          a: 'No, solo podemos verificar registros de obras realizados con Musicdibs. Esto se debe a que registramos y certificamos no solo el archivo subido con el contenido, sino también la identidad del registrante. Además, debes saber que tampoco puedes hacer esto con ningún otro sistema de registro de propiedad, ya que ninguno está interconectado con los demás.',
        },
        {
          q: '¿Puedo registrar creaciones musicales en nombre de otras personas con mi cuenta?',
          a: 'Lamentablemente, el registro a nombre de terceros SOLO está permitido y reconocido legalmente en el caso excepcional de menores. Las cuentas de usuario de Musicdibs son unipersonales e intransferibles, y pueden pertenecer a personas o entidades (comerciales, asociaciones, etc.).\n\nDebes tener en cuenta que para el registro de una creación, primero debe verificarse la identidad de la persona o entidad a la que se otorgarán los derechos de propiedad, y esto solo es posible si esa misma persona o entidad es la que ha abierto la cuenta en Musicdibs y la ha verificado con su documento de identidad oficial.\n\nTe recomendamos que propongas a esas personas que cada una abra una cuenta de Musicdibs con sus datos. ¡Es muy sencillo!',
        },
        {
          q: '¿Puedo registrar creaciones parciales antes de registrar la versión final?',
          a: 'Sí, puedes hacerlo con Musicdibs y de hecho es recomendable, para evitar que alguien te plagie durante tu proceso de creación antes de que tu obra esté terminada. Gracias a nuestro coste reducido, especialmente el de la suscripción anual, puedes hacer tantos registros parciales de tu obra como desees, lo que también te permitirá compartir tu creación con quien quieras con total garantía de que está protegida y a tu nombre.',
        },
        {
          q: '¿Puedo registrar obras creadas con IA? ¿Qué protege Musicdibs en estos casos?',
          a: 'Sí, puedes registrar tus obras en Musicdibs aunque hayas utilizado IA para la composición musical, siempre que:\n\n1. Seas el autor original de la letra, la idea o la estructura de la canción.\n2. Haya habido dirección creativa de tu parte en el uso de la IA (por ejemplo, elegiste los prompts, editaste el resultado, adaptaste la melodía, etc.).\n3. La herramienta de IA que utilizaste te permita legalmente usar y explotar comercialmente los resultados generados.\n\nEl registro te otorga un certificado de autoría con validez legal internacional, respaldado por un sello de tiempo y tecnología blockchain. Esto te permite demostrar que creaste la obra en una fecha específica y defender tus derechos en caso de plagio o disputas.\n\nMusicdibs no valida ni supervisa el contenido generado por IA, pero sí te permite registrar el resultado final si fuiste el creador o responsable del proceso. Se recomienda indicar en la descripción que se utilizó IA como herramienta, y que la autoría creativa es tuya.',
        },
        {
          q: '¿Podría alguien registrar una obra como suya aunque ya haya sido registrada antes?',
          a: 'Sí, ¡pero no hay problema! Lo importante es quién lo hizo primero y cuándo (y eso es justamente lo que aparece en nuestros certificados de registro). Cada vez que registramos algo (aunque sea repetido) se genera un sello de tiempo diferente asociado a la identidad de quien hizo la certificación, al contenido certificado y al momento en que se realizó.\n\nMusicdibs, al ser una herramienta con validez y alcance mundial, no puede saber si alguien ya registró algo antes en otro sistema de registro u otra parte del mundo. Pero eso no es lo relevante, sino ¿QUIÉN LO HIZO ANTES de forma fiable? Y eso es lo que te garantizas usando Musicdibs.',
        },
        {
          q: '¿El registro de mi obra en blockchain tiene validez legal?',
          a: 'Registrar tu guion o video corto en blockchain tiene validez legal en los 179 países signatarios del Convenio de Berna. Es una forma alternativa, rápida y fiable de evitar el plagio cuando compartes en redes sociales o con amigos. Es una apuesta por el futuro y facilita el proceso de comparar diferentes piezas y verificar la identidad de su creador original.',
        },
        {
          q: '¿El registro de mi pieza tiene costes de renovación?',
          a: 'No, solo pagarás por el registro inicial.',
        },
        {
          q: '¿De qué tipo de contenido se pueden generar los NFTs de las suscripciones?',
          a: 'Por el momento, para generar NFTs solo aceptamos audios en los formatos: mp3, wav y ogg. Esto se debe a que son los formatos soportados por el marketplace Opensea, que es donde los generamos y donde te los enviaremos (por tanto necesitarás tener una wallet de Opensea para recibirlos).\n\nLa posibilidad de generar NFTs también para vídeos se abrirá próximamente (los formatos soportados serán: mp4 y webm).',
        },
        {
          q: '¿Cómo cancelo mi suscripción?',
          a: 'Para cancelar, solo tienes que ir dentro de tu perfil de cuenta a "ajustes" → "suscripción" → "cancelar suscripción". Al menos 24 horas antes de la renovación del nuevo ciclo.',
        },
        {
          q: '¿Cómo funcionan las suscripciones mensuales y anuales?',
          a: 'Tanto las suscripciones mensuales como las anuales se renuevan automáticamente al final de cada ciclo contratado. Por ejemplo, si te suscribes el 15 de noviembre, el siguiente ciclo de facturación se activará el 15 de diciembre.\n\nPara cancelarla, solo tienes que ir en tu perfil de cuenta a "ajustes" → "suscripción" → "Cancelar suscripción". Al menos 24h antes de la renovación del nuevo ciclo.\n\nSi una suscripción no se renueva, perderás acceso a tu lista de certificados y no podrás descargarlos, pero los registros no se eliminan y siempre se guardan en tu cuenta de usuario. Para acceder de nuevo a tu cuenta y gestionar tu lista de certificados, tendrás que renovar tu suscripción.',
        },
        {
          q: '¿Cuánto dura el registro de mi pieza?',
          a: 'Los registros en blockchain son permanentes, y la duración de la protección de los derechos de autor está sujeta a la legislación de cada país.',
        },
        {
          q: '¿Cómo reduzco el tamaño de mi archivo para poder subirlo?',
          a: 'Solo aceptamos archivos con un peso inferior a 30MB. Por tanto, en caso de que tu archivo sea mayor, tendrás que comprimirlo.\n\nTe recordamos que para el registro de propiedad de derechos de autor lo importante es el contenido y no su calidad audiovisual, por lo que no hay problema si el contenido es inferior al comprimirlo.',
        },
        {
          q: '¿Cómo se registraría una creación cuando pertenece a dos o más autores?',
          a: 'La mejor manera de registrar la coautoría o propiedad múltiple de una creación con Musicdibs es haciendo dos registros en blockchain: uno de la canción (letra, grabación sonora…) y otro con toda la información de los autores (nombre y documento de identidad de cada coautor), cualquier información sobre la distribución de los derechos de cada coautor y la información del registro de la canción realizado previamente (identificador de transacción, huella digital del archivo y red blockchain). Además, debes seleccionar la opción "Quiero que esta certificación sea pública" en ambos registros.\n\nAl hacerlo de esta manera puedes verificar el registro tanto de la canción como del documento de coautoría y el sello de tiempo de los registros garantiza su validez legal.',
        },
        {
          q: '¿Si no renuevo mi suscripción, perderé mis registros?',
          a: 'Los registros (certificados) son permanentes y nunca expiran, pero si una suscripción no se renueva, perderás acceso a la plataforma y no podrás gestionar ni descargar tu lista de certificados. Para acceder de nuevo a tu cuenta y gestionar tu lista de certificados, necesitarás renovar tu suscripción.\n\nEn Musicdibs te recomendamos que MANTENGAS tu suscripción el mayor tiempo posible, ya que el precio actualmente es muy atractivo gracias al esfuerzo que hemos hecho para ofrecer un precio bajo y asequible para todos. En el futuro planeamos añadir nuevas funcionalidades a las suscripciones. Si mantienes tu suscripción actual ahora, te aseguras de mantener tu precio actual también.',
        },
        {
          q: 'Una vez registrada, ¿cómo puedo demostrar la autoría de mi obra a un tercero?',
          a: 'El registro del archivo genera un hash y un sello de tiempo, donde se cifran los datos de identificación que vinculan automáticamente al autor con su creación. En caso de una disputa legal, cualquiera puede validar dicho código y verificar que tú eres el autor original.\n\nUna vez certificado, es importante no realizar ningún cambio en el archivo original, para no modificar su huella digital.',
        },
        {
          q: '¿Cuáles son los documentos de identidad válidos para verificar mi identidad?',
          a: 'Para que tus registros tengan validez legal, es necesario verificar tu identidad con un documento de identificación oficial válido en tu país que contenga una foto tuya e información personal, o tu pasaporte. En España y todos los demás países de la Unión Europea puedes usar tu Documento Nacional de Identidad o pasaporte.\n\nSi tu país no está en la lista aceptada o tienes alguna duda, contáctanos.',
        },
        {
          q: '¿Qué tipos de archivo puedo registrar?',
          a: 'Puedes registrar todo tipo de archivos, el formato es irrelevante. Pueden ser obras terminadas o parciales (en proceso de creación). En este último caso, tendrás que hacer registros sucesivos de cada uno de los hitos que alcances: capítulos, montajes parciales, bocetos, etc. Crearemos un registro de cada entrega, lo que además te proporcionará trazabilidad en tu proceso creativo.\n\nSolo recuerda que el tamaño máximo permitido de archivo es 30Mb. Si tu obra es mayor, tendrás que comprimirla.',
        },
        {
          q: '¿Qué pasaría si un día Musicdibs "desaparece"? ¿Los certificados perderían su validez?',
          a: 'No pasaría nada con tus obras registradas gracias a la tecnología descentralizada y pública que utilizamos, formada por una red con miles de nodos en la nube que tendrían que desaparecer completamente (algo completamente imposible).',
        },
        {
          q: '¿Qué pasa si alguien registra mi canción en otro registro? ¿Puedo usar mi certificado de Musicdibs para reclamar mi autoría?',
          a: 'Debes saber que la propiedad intelectual no es como la propiedad industrial. En la Unión Europea no es obligatorio realizar un acto administrativo para ser considerado autor de una pieza y basta con demostrar su creación previa. La propiedad intelectual de una obra literaria, artística o científica corresponde al autor por el solo hecho de su creación.\n\nSi alguien copia una canción previamente registrada en Blockchain, puedes aportar tu registro como prueba válida en una denuncia por plagio, ya que en cada registro de Musicdibs se genera un recibo que contiene toda la información necesaria, tanto para identificar la obra a tu nombre como para demostrar el registro con su sello de tiempo. Con el certificado de Musicdibs podrás demostrar que fuiste su creador y que por tanto tienes el derecho de propiedad sobre ella.',
        },
        {
          q: '¿Qué pasa con mis certificaciones si me doy de baja del servicio?',
          a: 'Musicdibs SOLO utiliza blockchains públicas y descentralizadas robustas (por ejemplo, Ethereum, Polygon y Solana) que no dependen de iCommunity Labs y están respaldadas por una gran comunidad de usuarios. Esto asegura que las certificaciones realizadas a través de Musicdibs siempre serán accesibles y persistirán, incluso si el usuario se da de baja o iCommunity Labs desaparece en el futuro. Esto convierte las certificaciones emitidas por Musicdibs en evidencia digital plenamente disponible para auditorías o peritajes técnicos y con efectos probatorios en procedimientos de disputa o similares.\n\nSin embargo, debes recordar que para verificar la certificación de un documento debes estar en posesión del documento original.',
        },
        {
          q: '¿Qué tipo de obras y archivos puedo registrar?',
          a: 'Con Musicdibs puedes registrar los derechos de autor de cualquier obra creativa y artística:\n\n– Música: canciones, letras, partituras, grabaciones sonoras.\n– Audiovisual: guiones, tratamientos, ideas/sinopsis, piezas de vídeo, storyboards.\n– Obra literaria: manuscritos y borradores, títulos y nombres, traducciones, adaptaciones y derivados.\n\nY puedes registrar todo tipo de archivos, tanto obras terminadas en cualquier formato digital de audio o vídeo (mp3, WAV, AIFF, WMA, mp4, etc.) como archivos de texto (PDF, DOC) si son partituras, letras o guiones. Solo recuerda que el tamaño máximo permitido de archivo es 30Mb.',
        },
      ],
    },
  },
  en: {
    faq: {
      title: 'Frequently Asked Questions',
      subtitle: 'Find answers to the most common questions about Musicdibs',
      seo_description: 'Frequently asked questions about MusicDibs: blockchain registration, music distribution, certificates and more.',
      items: [
        {
          q: 'Are unspent subscription credits cumulative when renewed annually?',
          a: 'Unspent credits from annual subscriptions and special offers do not accumulate when the next billing period is renewed.',
        },
        {
          q: 'Can an underage register their productions?',
          a: 'Underages can request the registration of their copyright through their parents or legal representatives, who must prove their relationship with the minor through the appropriate document (family book or legal document that proves the guardianship or legal representation of the minor).',
        },
        {
          q: 'Can I check in Musicdibs songs that have been registered with other platforms?',
          a: "No, we can only verify registrations of works made with Musicdibs. This is because we register and certify, not only the uploaded file with the content, but also the identity of the registrant. Also you should know that you can't really do this with any other property registration system, since none of them is interconnected with the rest.",
        },
        {
          q: 'Can I register musical creations on behalf of other people with my account?',
          a: "Unfortunately, registration in the name of third parties is ONLY allowed and legally recognized in the exceptional case of minors. Musicdibs' user accounts are unipersonal and non-transferable, and may belong to persons or entities (commercial, associations, etc.).\n\nYou must bear in mind that for the registration of a creation, the identity of the person or entity to whom the ownership of those rights will be granted must first be verified, and this is only possible if that same person or entity is the one that has opened the account on Musicdibs and verified it with your official identity document.\n\nWe recommend that you propose to those people that they each open a Musicdibs account with their data. It is very simple!",
        },
        {
          q: 'Can I register partial creations before registering the final one?',
          a: 'Yes, you can do it with Musicdibs and in fact it is recommended, to avoid someone plagiarizing you during your creation process before your work is finished. Thanks to our reduced cost, especially that of the annual subscription, you can make as many partial registrations of your work as you want, which will also allow you to share your creation with whoever you want with full guarantee that it is protected and in your name.',
        },
        {
          q: 'Can I register works that were created using AI? What does Musicdibs protect in these cases?',
          a: "Yes, you can register your works on Musicdibs even if you used AI for the musical composition, as long as:\n\n1. You are the original author of the lyrics, the idea, or the structure of the song.\n2. There was creative direction from you in the use of AI (for example, you chose the prompts, edited the result, adapted the melody, etc.).\n3. The AI tool you used legally allows you to use and commercially exploit the generated results.\n\nThe registration grants you a certificate of authorship with international legal validity, backed by a timestamp and blockchain technology. This allows you to prove that you created the work on a specific date and to defend your rights in case of plagiarism or disputes.\n\nMusicdibs does not validate or supervise AI-generated content, but it does allow you to register the final result if you were the creator or responsible party in the process. It is recommended that you indicate in the description that AI was used as a tool, and that the creative authorship is yours.",
        },
        {
          q: 'Could anyone register a work as theirs even if it has been registered before?',
          a: "Yes, but no problem! The important thing is who did it first and when (and that is just what appears in our registration certificates). Each time we register something (even if repeated) a different time stamp is generated associated with the identity of who made the certification, the certified content and the time at which it is done.\n\nMusicdibs being a tool with validity and worldwide scope can not know if someone has already registered something before someone else in another registration system or another part of the world. But that is not what is relevant, but WHO DID IT BEFORE in a reliable way? And that is what you are guaranteed using Musicdibs.",
        },
        {
          q: 'Does registering my work in the blockchain have legal validity?',
          a: 'Registering your script or short video in the blockchain has legal validity in the 179 signatory countries of the Berne Convention. It is an alternative, fast and reliable way to avoid plagiarism when you share it on social networks or with your friends. It is a commitment to the future, and facilitates the process of comparing different pieces and verifying the identity of their original creator.',
        },
        {
          q: 'Does the registration of my piece have renewal costs?',
          a: 'No, you will only pay for the initial registration.',
        },
        {
          q: 'From what type of content can the NFTs of the subscriptions be generated?',
          a: "At the moment to generate NFTs we are accepting only audios and in the formats: mp3, wav and ogg. This is so because these are the formats supported by the Opensea marketplace, which is where we generate them and where we will send them to you (you will therefore need to have an Opensea wallet to receive them).\n\nThe possibility of also generating NFTs for videos will be opened shortly (the supported formats will be: mp4 and webm).",
        },
        {
          q: 'How do I cancel my subscription?',
          a: 'For your cancellation, you just have to go within your account profile to "settings" → "subscription" → "cancel subscription". At least 24 hours before the renewal of the new cycle.',
        },
        {
          q: 'How do monthly and annual subscriptions work?',
          a: 'Both monthly and annual subscriptions are automatically renewed at the end of each contracted cycle. For example, if you sign up on November 15, the next billing cycle will be activated on December 15.\n\nTo cancel it, just go in your account profile to "settings" → "subscription" → "Cancel subscription". At least 24h before the renewal of the new cycle.\n\nIf a subscription is not renewed, you will lose access to your list of certificates and you will not be able to download them, but the records are not deleted and are always saved in your user account. To access your account again and manage your list of certificates, you will have to renew your subscription.',
        },
        {
          q: 'How long does the registration of my piece last?',
          a: 'Blockchain registers are permanent, and the duration of copyright protection is subject to the legislation of each country.',
        },
        {
          q: 'How to reduce the size of my file to be able to upload it?',
          a: 'We only accept files with a weight of less than 30MB. Therefore, in case your file is larger, you will have to compress it.\n\nWe remind you that for the registration of copyright property the important thing is the content and not its audiovisual quality, so there is no problem if the content is inferior when compressed.',
        },
        {
          q: 'How would a creation be registered when it belongs to two or more authors?',
          a: 'The best way to register the co-authorship or multiple-ownership of a creation with Musicdibs is by making two records in the blockchain: one of the song (lyrics, sound recording…) and one with all the information of the authors (name and document of identity of each co-author), any information on the distribution of each co-author\'s rights and the information of the song registration made previously (transaction identifier, file\'s digital trace and blockchain network). Additionally, you must select the option "I want this certification to be public" in both registers.\n\nBy doing it in this way you can verify the registration of both the song and the co-authorship document and the timestamp of the records guarantees its legal validity.',
        },
        {
          q: "If I don't renew my subscription, will I lose my records?",
          a: "Registrations (certificates) are permanent and never expire, but if a subscription is not renewed, you will lose access to the platform and will not be able to manage and download your list of certificates. To access your account again and manage your list of certificates, you will need to renew your subscription.\n\nAt Musicdibs we recommend that you KEEP your subscription as much as possible, as the price is currently very attractive thanks to the effort we have made to offer a low and affordable price for everyone. In the future we plan to add new features to the subscriptions. If you keep your current subscription now you are sure to keep your current price as well.",
        },
        {
          q: 'Once registered, how can I prove the authorship of my work to a third party?',
          a: 'The registration of the file generates a hash and a time stamp, where the identification data that automatically link the author with his creation is encrypted. In the event of a legal dispute, anyone can validate said code and verify that you are the original author.\n\nOnce certified, it is important not to make any changes to the original file, so as not to modify its digital trace.',
        },
        {
          q: 'What are valid identity documents to verify my identity?',
          a: 'For your records to have legal validity, it is necessary to verify your identity with an official identification document valid in your country that contains a photo of you and your personal information, or your passport. In Spain and all other countries of the European Union you can use your National Identification Card or passport.\n\nIf your country is not on the accepted list or you have any questions, please contact us.',
        },
        {
          q: 'What file types can you register?',
          a: 'You can register all kinds of files, the format is irrelevant. They can be either finished works or partial ones (in the process of creation). In the latter case, you will have to make successive records of each of the milestones you achieve: chapters, partial assemblies, sketches, etc. We will create a record of each delivery, which will also provide you with traceability in your creative process.\n\nJust remember that the maximum allowed file size is 30Mb. If your work is larger, you will have to compress it.',
        },
        {
          q: 'What happens if one day Musicdibs "disappears"? Would certificates lose its validity?',
          a: 'Nothing would happen to your registered works thanks to the decentralized and public technology we use, formed by a network with thousands of nodes in the cloud that would have to disappear completely (which is something completely impossible).',
        },
        {
          q: 'What happens if someone registers my song in another registry? Can I use my Musicdibs certificate to claim my authorship?',
          a: "You should know that intellectual property is not like industrial property. In the European Union it is not mandatory to carry out an administrative act to be considered the author of a piece and it is enough to demonstrate its previous creation. The intellectual property of a literary, artistic or scientific work corresponds to the author by the sole fact of its creation.\n\nIf someone copies a song previously registered on the Blockchain, you can provide your registration as valid proof in a plagiarism complaint, since a receipt is generated in every Musicdibs registry that contains all the necessary information, both to identify the work in your name and to prove the registration with its time stamp. With the Musicdibs certificate you will be able to demonstrate that you were its creator and that therefore have the right of ownership over it.",
        },
        {
          q: 'What happens to my certifications if I unsubscribe from the service?',
          a: "Musicdibs ONLY uses robust public and decentralized blockchains (e.g. Ethereum, Polygon and Solana) that are not dependent on iCommunity Labs and are supported by a large community of users. This ensures that certifications made through Musicdibs will always be accessible and persist, even if the user terminates or iCommunity Labs disappears in the future. This makes the certifications issued by Musicdibs digital evidence fully available for audits or technical expertise and with evidentiary effects in dispute proceedings or similar.\n\nHowever, you must remember that to check the certification of a document you must be in possession of the original document.",
        },
        {
          q: 'What type of works and files can I register?',
          a: "With Musicdibs you can register the copyright of any creative and artistic work:\n\n– Music: songs, lyrics, sheet music, sound recordings.\n– Audiovisual: scripts, treatments, ideas/synopsis, video pieces, storyboards.\n– Literary work: manuscripts and drafts, titles and names, translations, adaptations and derivatives.\n\nAnd you can register all kinds of files, both finished works in any digital audio or video format (mp3, WAV, AIFF, WMA, mp4, etc.) and text files (PDF, DOC) if they are scores, lyrics or scripts. Just remember that the maximum allowed file size is 30Mb.",
        },
      ],
    },
  },
  'pt-BR': {
    faq: {
      title: 'Perguntas Frequentes',
      subtitle: 'Encontre respostas para as perguntas mais comuns sobre a Musicdibs',
      seo_description: 'Perguntas frequentes sobre MusicDibs: registro em blockchain, distribuição musical, certificados e mais.',
      items: [
        {
          q: 'Os créditos de assinatura não utilizados são cumulativos ao renovar anualmente?',
          a: 'Os créditos não utilizados de assinaturas anuais e ofertas especiais não se acumulam ao renovar o próximo período de faturamento.',
        },
        {
          q: 'Um menor pode registrar suas produções?',
          a: 'Os menores podem solicitar o registro de seus direitos autorais através de seus pais ou representantes legais, que devem comprovar sua relação com o menor através do documento apropriado (certidão de nascimento ou documento legal que comprove a tutela ou representação legal do menor).',
        },
        {
          q: 'Posso verificar na Musicdibs músicas registradas em outras plataformas?',
          a: 'Não, só podemos verificar registros de obras feitos com a Musicdibs. Isso porque registramos e certificamos não apenas o arquivo enviado com o conteúdo, mas também a identidade do registrante. Além disso, saiba que você também não pode fazer isso com nenhum outro sistema de registro de propriedade, já que nenhum deles está interconectado com os demais.',
        },
        {
          q: 'Posso registrar criações musicais em nome de outras pessoas com minha conta?',
          a: 'Infelizmente, o registro em nome de terceiros SÓ é permitido e legalmente reconhecido no caso excepcional de menores. As contas de usuário da Musicdibs são unipessoais e intransferíveis, e podem pertencer a pessoas ou entidades (comerciais, associações, etc.).\n\nVocê deve ter em mente que para o registro de uma criação, a identidade da pessoa ou entidade à qual será concedida a propriedade dos direitos deve ser verificada primeiro, e isso só é possível se essa mesma pessoa ou entidade for a que abriu a conta na Musicdibs e a verificou com seu documento de identidade oficial.\n\nRecomendamos que você proponha a essas pessoas que cada uma abra uma conta na Musicdibs com seus dados. É muito simples!',
        },
        {
          q: 'Posso registrar criações parciais antes de registrar a versão final?',
          a: 'Sim, você pode fazer isso com a Musicdibs e na verdade é recomendável, para evitar que alguém plagie você durante seu processo de criação antes que sua obra esteja finalizada. Graças ao nosso custo reduzido, especialmente o da assinatura anual, você pode fazer quantos registros parciais da sua obra quiser, o que também permitirá compartilhar sua criação com quem desejar com total garantia de que está protegida e em seu nome.',
        },
        {
          q: 'Posso registrar obras criadas com IA? O que a Musicdibs protege nesses casos?',
          a: 'Sim, você pode registrar suas obras na Musicdibs mesmo que tenha usado IA para a composição musical, desde que:\n\n1. Você seja o autor original da letra, da ideia ou da estrutura da música.\n2. Tenha havido direção criativa da sua parte no uso da IA (por exemplo, você escolheu os prompts, editou o resultado, adaptou a melodia, etc.).\n3. A ferramenta de IA que você usou permita legalmente o uso e exploração comercial dos resultados gerados.\n\nO registro concede a você um certificado de autoria com validade legal internacional, respaldado por carimbo de data/hora e tecnologia blockchain. Isso permite provar que você criou a obra em uma data específica e defender seus direitos em caso de plágio ou disputas.\n\nA Musicdibs não valida nem supervisiona conteúdo gerado por IA, mas permite registrar o resultado final se você foi o criador ou responsável no processo. Recomenda-se indicar na descrição que a IA foi usada como ferramenta e que a autoria criativa é sua.',
        },
        {
          q: 'Alguém poderia registrar uma obra como sua mesmo que já tenha sido registrada antes?',
          a: 'Sim, mas sem problema! O importante é quem fez primeiro e quando (e isso é justamente o que aparece em nossos certificados de registro). Cada vez que registramos algo (mesmo que repetido) um carimbo de data/hora diferente é gerado, associado à identidade de quem fez a certificação, ao conteúdo certificado e ao momento em que foi feito.\n\nA Musicdibs, sendo uma ferramenta com validade e alcance mundial, não pode saber se alguém já registrou algo antes em outro sistema de registro ou outra parte do mundo. Mas isso não é o relevante, e sim QUEM FEZ ANTES de forma confiável? E isso é o que você garante usando a Musicdibs.',
        },
        {
          q: 'O registro da minha obra na blockchain tem validade legal?',
          a: 'Registrar seu roteiro ou vídeo curto na blockchain tem validade legal nos 179 países signatários da Convenção de Berna. É uma forma alternativa, rápida e confiável de evitar plágio quando você compartilha nas redes sociais ou com amigos. É uma aposta no futuro e facilita o processo de comparar diferentes peças e verificar a identidade de seu criador original.',
        },
        {
          q: 'O registro da minha peça tem custos de renovação?',
          a: 'Não, você pagará apenas pelo registro inicial.',
        },
        {
          q: 'De que tipo de conteúdo os NFTs das assinaturas podem ser gerados?',
          a: 'No momento, para gerar NFTs estamos aceitando apenas áudios nos formatos: mp3, wav e ogg. Isso porque esses são os formatos suportados pelo marketplace Opensea, que é onde os geramos e para onde os enviaremos (você precisará ter uma wallet Opensea para recebê-los).\n\nA possibilidade de gerar NFTs também para vídeos será aberta em breve (os formatos suportados serão: mp4 e webm).',
        },
        {
          q: 'Como cancelo minha assinatura?',
          a: 'Para cancelar, basta ir no seu perfil de conta em "configurações" → "assinatura" → "cancelar assinatura". Pelo menos 24 horas antes da renovação do novo ciclo.',
        },
        {
          q: 'Como funcionam as assinaturas mensais e anuais?',
          a: 'Tanto as assinaturas mensais quanto as anuais são renovadas automaticamente ao final de cada ciclo contratado. Por exemplo, se você assinar em 15 de novembro, o próximo ciclo de faturamento será ativado em 15 de dezembro.\n\nPara cancelar, basta ir no seu perfil de conta em "configurações" → "assinatura" → "Cancelar assinatura". Pelo menos 24h antes da renovação do novo ciclo.\n\nSe uma assinatura não for renovada, você perderá acesso à sua lista de certificados e não poderá baixá-los, mas os registros não são excluídos e sempre ficam salvos na sua conta de usuário. Para acessar sua conta novamente e gerenciar sua lista de certificados, você precisará renovar sua assinatura.',
        },
        {
          q: 'Quanto tempo dura o registro da minha peça?',
          a: 'Os registros em blockchain são permanentes, e a duração da proteção dos direitos autorais está sujeita à legislação de cada país.',
        },
        {
          q: 'Como reduzir o tamanho do meu arquivo para poder enviá-lo?',
          a: 'Só aceitamos arquivos com tamanho inferior a 30MB. Portanto, caso seu arquivo seja maior, você precisará comprimi-lo.\n\nLembramos que para o registro de propriedade de direitos autorais o importante é o conteúdo e não sua qualidade audiovisual, então não há problema se o conteúdo for inferior ao ser comprimido.',
        },
        {
          q: 'Como registrar uma criação quando pertence a dois ou mais autores?',
          a: 'A melhor maneira de registrar a coautoria ou propriedade múltipla de uma criação com a Musicdibs é fazendo dois registros na blockchain: um da música (letra, gravação sonora…) e outro com todas as informações dos autores (nome e documento de identidade de cada coautor), qualquer informação sobre a distribuição dos direitos de cada coautor e as informações do registro da música feito anteriormente (identificador de transação, impressão digital do arquivo e rede blockchain). Além disso, você deve selecionar a opção "Quero que esta certificação seja pública" em ambos os registros.\n\nAo fazer dessa forma, você pode verificar o registro tanto da música quanto do documento de coautoria, e o carimbo de data/hora dos registros garante sua validade legal.',
        },
        {
          q: 'Se eu não renovar minha assinatura, perderei meus registros?',
          a: 'Os registros (certificados) são permanentes e nunca expiram, mas se uma assinatura não for renovada, você perderá acesso à plataforma e não poderá gerenciar nem baixar sua lista de certificados. Para acessar sua conta novamente e gerenciar sua lista de certificados, precisará renovar sua assinatura.\n\nNa Musicdibs recomendamos que você MANTENHA sua assinatura o maior tempo possível, já que o preço atualmente é muito atrativo graças ao esforço que fizemos para oferecer um preço baixo e acessível para todos. No futuro planejamos adicionar novas funcionalidades às assinaturas. Se mantiver sua assinatura atual agora, você garante manter seu preço atual também.',
        },
        {
          q: 'Uma vez registrada, como posso provar a autoria da minha obra para terceiros?',
          a: 'O registro do arquivo gera um hash e um carimbo de data/hora, onde os dados de identificação que vinculam automaticamente o autor à sua criação são criptografados. Em caso de disputa legal, qualquer pessoa pode validar esse código e verificar que você é o autor original.\n\nUma vez certificado, é importante não fazer nenhuma alteração no arquivo original, para não modificar sua impressão digital.',
        },
        {
          q: 'Quais são os documentos de identidade válidos para verificar minha identidade?',
          a: 'Para que seus registros tenham validade legal, é necessário verificar sua identidade com um documento de identificação oficial válido em seu país que contenha uma foto sua e suas informações pessoais, ou seu passaporte. Na Espanha e em todos os demais países da União Europeia, você pode usar seu Documento Nacional de Identidade ou passaporte.\n\nSe seu país não está na lista aceita ou você tem alguma dúvida, entre em contato conosco.',
        },
        {
          q: 'Que tipos de arquivo posso registrar?',
          a: 'Você pode registrar todo tipo de arquivos, o formato é irrelevante. Podem ser obras finalizadas ou parciais (em processo de criação). Neste último caso, você precisará fazer registros sucessivos de cada marco alcançado: capítulos, montagens parciais, esboços, etc. Criaremos um registro de cada entrega, o que também proporcionará rastreabilidade no seu processo criativo.\n\nApenas lembre que o tamanho máximo permitido de arquivo é 30Mb. Se sua obra for maior, precisará comprimi-la.',
        },
        {
          q: 'O que acontece se um dia a Musicdibs "desaparecer"? Os certificados perderiam sua validade?',
          a: 'Nada aconteceria com suas obras registradas graças à tecnologia descentralizada e pública que utilizamos, formada por uma rede com milhares de nós na nuvem que teriam que desaparecer completamente (algo completamente impossível).',
        },
        {
          q: 'O que acontece se alguém registrar minha música em outro registro? Posso usar meu certificado da Musicdibs para reivindicar minha autoria?',
          a: 'Você deve saber que a propriedade intelectual não é como a propriedade industrial. Na União Europeia não é obrigatório realizar um ato administrativo para ser considerado autor de uma peça e basta demonstrar sua criação prévia. A propriedade intelectual de uma obra literária, artística ou científica corresponde ao autor pelo simples fato de sua criação.\n\nSe alguém copiar uma música previamente registrada na Blockchain, você pode apresentar seu registro como prova válida em uma denúncia de plágio, já que em cada registro da Musicdibs é gerado um recibo que contém todas as informações necessárias, tanto para identificar a obra em seu nome quanto para comprovar o registro com seu carimbo de data/hora. Com o certificado da Musicdibs você poderá demonstrar que foi seu criador e que portanto tem o direito de propriedade sobre ela.',
        },
        {
          q: 'O que acontece com minhas certificações se eu cancelar o serviço?',
          a: 'A Musicdibs SOMENTE utiliza blockchains públicas e descentralizadas robustas (por exemplo, Ethereum, Polygon e Solana) que não dependem da iCommunity Labs e são sustentadas por uma grande comunidade de usuários. Isso garante que as certificações feitas através da Musicdibs sempre serão acessíveis e persistirão, mesmo que o usuário cancele ou a iCommunity Labs desapareça no futuro. Isso torna as certificações emitidas pela Musicdibs evidência digital plenamente disponível para auditorias ou perícias técnicas e com efeitos probatórios em procedimentos de disputa ou similares.\n\nNo entanto, você deve lembrar que para verificar a certificação de um documento, deve estar de posse do documento original.',
        },
        {
          q: 'Que tipo de obras e arquivos posso registrar?',
          a: 'Com a Musicdibs você pode registrar os direitos autorais de qualquer obra criativa e artística:\n\n– Música: músicas, letras, partituras, gravações sonoras.\n– Audiovisual: roteiros, tratamentos, ideias/sinopse, peças de vídeo, storyboards.\n– Obra literária: manuscritos e rascunhos, títulos e nomes, traduções, adaptações e derivados.\n\nE você pode registrar todo tipo de arquivos, tanto obras finalizadas em qualquer formato digital de áudio ou vídeo (mp3, WAV, AIFF, WMA, mp4, etc.) quanto arquivos de texto (PDF, DOC) se forem partituras, letras ou roteiros. Apenas lembre que o tamanho máximo permitido de arquivo é 30Mb.',
        },
      ],
    },
  },
};
