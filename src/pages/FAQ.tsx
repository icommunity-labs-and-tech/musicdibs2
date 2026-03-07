import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "Are unspent subscription credits cumulative when renewed annually?",
    answer: "Unspent credits from annual subscriptions and special offers do not accumulate when the next billing period is renewed.",
  },
  {
    question: "Can an underage register their productions?",
    answer: "Underages can request the registration of their copyright through their parents or legal representatives, who must prove their relationship with the minor through the appropriate document (family book or legal document that proves the guardianship or legal representation of the minor).",
  },
  {
    question: "Can I check in Musicdibs songs that have been registered with other platforms?",
    answer: "No, we can only verify registrations of works made with Musicdibs. This is because we register and certify, not only the uploaded file with the content, but also the identity of the registrant. Also you should know that you can't really do this with any other property registration system, since none of them is interconnected with the rest.",
  },
  {
    question: "Can I register musical creations on behalf of other people with my account?",
    answer: "Unfortunately, registration in the name of third parties is ONLY allowed and legally recognized in the exceptional case of minors. Musicdibs' user accounts are unipersonal and non-transferable, and may belong to persons or entities (commercial, associations, etc.).\n\nYou must bear in mind that for the registration of a creation, the identity of the person or entity to whom the ownership of those rights will be granted must first be verified, and this is only possible if that same person or entity is the one that has opened the account on Musicdibs and verified it with your official identity document.\n\nWe recommend that you propose to those people that they each open a Musicdibs account with their data. It is very simple!",
  },
  {
    question: "Can I register partial creations before registering the final one?",
    answer: "Yes, you can do it with Musicdibs and in fact it is recommended, to avoid someone plagiarizing you during your creation process before your work is finished. Thanks to our reduced cost, especially that of the annual subscription, you can make as many partial registrations of your work as you want, which will also allow you to share your creation with whoever you want with full guarantee that it is protected and in your name.",
  },
  {
    question: "Can I register works that were created using AI? What does Musicdibs protect in these cases?",
    answer: "Yes, you can register your works on Musicdibs even if you used AI for the musical composition, as long as:\n\n1. You are the original author of the lyrics, the idea, or the structure of the song.\n2. There was creative direction from you in the use of AI (for example, you chose the prompts, edited the result, adapted the melody, etc.).\n3. The AI tool you used legally allows you to use and commercially exploit the generated results.\n\nThe registration grants you a certificate of authorship with international legal validity, backed by a timestamp and blockchain technology. This allows you to prove that you created the work on a specific date and to defend your rights in case of plagiarism or disputes.\n\nMusicdibs does not validate or supervise AI-generated content, but it does allow you to register the final result if you were the creator or responsible party in the process. It is recommended that you indicate in the description that AI was used as a tool, and that the creative authorship is yours.",
  },
  {
    question: "Could anyone register a work as theirs even if it has been registered before?",
    answer: "Yes, but no problem! The important thing is who did it first and when (and that is just what appears in our registration certificates). Each time we register something (even if repeated) a different time stamp is generated associated with the identity of who made the certification, the certified content and the time at which it is done.\n\nMusicdibs being a tool with validity and worldwide scope can not know if someone has already registered something before someone else in another registration system or another part of the world. But that is not what is relevant, but WHO DID IT BEFORE in a reliable way? And that is what you are guaranteed using Musicdibs.",
  },
  {
    question: "Does registering my work in the blockchain have legal validity?",
    answer: "Registering your script or short video in the blockchain has legal validity in the 179 signatory countries of the Berne Convention. It is an alternative, fast and reliable way to avoid plagiarism when you share it on social networks or with your friends. It is a commitment to the future, and facilitates the process of comparing different pieces and verifying the identity of their original creator.",
  },
  {
    question: "Does the registration of my piece have renewal costs?",
    answer: "No, you will only pay for the initial registration.",
  },
  {
    question: "From what type of content can the NFTs of the subscriptions be generated?",
    answer: "At the moment to generate NFTs we are accepting only audios and in the formats: mp3, wav and ogg. This is so because these are the formats supported by the Opensea marketplace, which is where we generate them and where we will send them to you (you will therefore need to have an Opensea wallet to receive them).\n\nThe possibility of also generating NFTs for videos will be opened shortly (the supported formats will be: mp4 and webm).",
  },
  {
    question: "How do I cancel my subscription?",
    answer: 'For your cancellation, you just have to go within your account profile to "settings" → "subscription" → "cancel subscription". At least 24 hours before the renewal of the new cycle.',
  },
  {
    question: "How do monthly and annual subscriptions work?",
    answer: "Both monthly and annual subscriptions are automatically renewed at the end of each contracted cycle. For example, if you sign up on November 15, the next billing cycle will be activated on December 15.\n\nTo cancel it, just go in your account profile to \"settings\" → \"subscription\" → \"Cancel subscription\". At least 24h before the renewal of the new cycle.\n\nIf a subscription is not renewed, you will lose access to your list of certificates and you will not be able to download them, but the records are not deleted and are always saved in your user account. To access your account again and manage your list of certificates, you will have to renew your subscription.",
  },
  {
    question: "How long does the registration of my piece last?",
    answer: "Blockchain registers are permanent, and the duration of copyright protection is subject to the legislation of each country.",
  },
  {
    question: "How to reduce the size of my file to be able to upload it?",
    answer: "We only accept files with a weight of less than 30MB. Therefore, in case your file is larger, you will have to compress it.\n\nWe remind you that for the registration of copyright property the important thing is the content and not its audiovisual quality, so there is no problem if the content is inferior when compressed.",
  },
  {
    question: "How would a creation be registered when it belongs to two or more authors?",
    answer: 'The best way to register the co-authorship or multiple-ownership of a creation with Musicdibs is by making two records in the blockchain: one of the song (lyrics, sound recording…) and one with all the information of the authors (name and document of identity of each co-author), any information on the distribution of each co-author\'s rights and the information of the song registration made previously (transaction identifier, file\'s digital trace and blockchain network). Additionally, you must select the option "I want this certification to be public" in both registers.\n\nBy doing it in this way you can verify the registration of both the song and the co-authorship document and the timestamp of the records guarantees its legal validity.',
  },
  {
    question: "If I don't renew my subscription, will I lose my records?",
    answer: "Registrations (certificates) are permanent and never expire, but if a subscription is not renewed, you will lose access to the platform and will not be able to manage and download your list of certificates. To access your account again and manage your list of certificates, you will need to renew your subscription.\n\nAt Musicdibs we recommend that you KEEP your subscription as much as possible, as the price is currently very attractive thanks to the effort we have made to offer a low and affordable price for everyone. In the future we plan to add new features to the subscriptions. If you keep your current subscription now you are sure to keep your current price as well.",
  },
  {
    question: "Once registered, how can I prove the authorship of my work to a third party?",
    answer: "The registration of the file generates a hash and a time stamp, where the identification data that automatically link the author with his creation is encrypted. In the event of a legal dispute, anyone can validate said code and verify that you are the original author.\n\nOnce certified, it is important not to make any changes to the original file, so as not to modify its digital trace.",
  },
  {
    question: "What are valid identity documents to verify my identity?",
    answer: "For your records to have legal validity, it is necessary to verify your identity with an official identification document valid in your country that contains a photo of you and your personal information, or your passport. In Spain and all other countries of the European Union you can use your National Identification Card or passport.\n\nIf your country is not on the accepted list or you have any questions, please contact us.",
  },
  {
    question: "What file types can you register?",
    answer: "You can register all kinds of files, the format is irrelevant. They can be either finished works or partial ones (in the process of creation). In the latter case, you will have to make successive records of each of the milestones you achieve: chapters, partial assemblies, sketches, etc. We will create a record of each delivery, which will also provide you with traceability in your creative process.\n\nJust remember that the maximum allowed file size is 30Mb. If your work is larger, you will have to compress it.",
  },
  {
    question: "What happens if one day Musicdibs \"disappears\"? Would certificates lose its validity?",
    answer: "Nothing would happen to your registered works thanks to the decentralized and public technology we use, formed by a network with thousands of nodes in the cloud that would have to disappear completely (which is something completely impossible).",
  },
  {
    question: "What happens if someone registers my song in another registry? Can I use my Musicdibs certificate to claim my authorship?",
    answer: "You should know that intellectual property is not like industrial property. In the European Union it is not mandatory to carry out an administrative act to be considered the author of a piece and it is enough to demonstrate its previous creation. The intellectual property of a literary, artistic or scientific work corresponds to the author by the sole fact of its creation.\n\nIf someone copies a song previously registered on the Blockchain, you can provide your registration as valid proof in a plagiarism complaint, since a receipt is generated in every Musicdibs registry that contains all the necessary information, both to identify the work in your name and to prove the registration with its time stamp. With the Musicdibs certificate you will be able to demonstrate that you were its creator and that therefore have the right of ownership over it.",
  },
  {
    question: "What happens to my certifications if I unsubscribe from the service?",
    answer: "Musicdibs ONLY uses robust public and decentralized blockchains (e.g. Ethereum, Polygon and Solana) that are not dependent on iCommunity Labs and are supported by a large community of users. This ensures that certifications made through Musicdibs will always be accessible and persist, even if the user terminates or iCommunity Labs disappears in the future. This makes the certifications issued by Musicdibs digital evidence fully available for audits or technical expertise and with evidentiary effects in dispute proceedings or similar.\n\nHowever, you must remember that to check the certification of a document you must be in possession of the original document.",
  },
  {
    question: "What type of works and files can I register?",
    answer: "With Musicdibs you can register the copyright of any creative and artistic work:\n\n– Music: songs, lyrics, sheet music, sound recordings.\n– Audiovisual: scripts, treatments, ideas/synopsis, video pieces, storyboards.\n– Literary work: manuscripts and drafts, titles and names, translations, adaptations and derivatives.\n\nAnd you can register all kinds of files, both finished works in any digital audio or video format (mp3, WAV, AIFF, WMA, mp4, etc.) and text files (PDF, DOC) if they are scores, lyrics or scripts. Just remember that the maximum allowed file size is 30Mb.",
  },
].sort((a, b) => a.question.localeCompare(b.question));

const FAQ = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16082a] to-[#0d0618] text-white">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-white/60 text-center mb-12 text-lg">
            Find answers to the most common questions about Musicdibs
          </p>

          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white/5 border border-white/10 rounded-xl px-6 data-[state=open]:bg-white/10 transition-colors"
              >
                <AccordionTrigger className="text-left text-white/90 hover:text-white py-5 text-base font-medium hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-white/70 leading-relaxed pb-5 whitespace-pre-line">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FAQ;
