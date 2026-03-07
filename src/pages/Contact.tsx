import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Mail, User, MessageSquare, Send, HelpCircle } from "lucide-react";
import { z } from "zod";
import { SEO } from "@/components/SEO";

const REASON_KEYS = ["inquiry", "distribution_error", "marketing_interest", "other", "partner_proposal", "registration_error"] as const;

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  reason: z.string().min(1, "Reason is required"),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

const Contact = () => {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    reason: "",
    subject: "",
    message: "",
    website: "", // honeypot
  });

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason && REASON_KEYS.includes(reason as any)) {
      setForm((prev) => ({ ...prev, reason }));
    }
  }, [searchParams]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const reasonLabel = t(`contact.reasons.${form.reason}`);
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: result.data.name,
          email: result.data.email,
          phone: "",
          subject: `[${reasonLabel}] ${result.data.subject}`,
          message: result.data.message,
          website: form.website,
        },
      });

      if (error) throw error;

      toast({
        title: t("contact.success_title", "Message sent!"),
        description: t("contact.success_desc", "We'll get back to you soon."),
      });
      setForm({ name: "", email: "", reason: "", subject: "", message: "", website: "" });
    } catch {
      toast({
        title: t("contact.error_title", "Error"),
        description: t("contact.error_desc", "Something went wrong. Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO title="Contacto" description="¿Tienes preguntas? Contáctanos y nuestro equipo te responderá lo antes posible." path="/contact" />
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t("contact.heading", "Contact Us")}
            </h1>
            <p className="text-white/80 text-lg">
              {t("contact.subheading", "Have a question? We'd love to hear from you.")}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8"
          >
            {/* Honeypot — hidden from real users, bots will fill it */}
            <div className="absolute opacity-0 -z-10 h-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                value={form.website}
                onChange={(e) => handleChange("website", e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white flex items-center gap-2">
                <User className="w-4 h-4" />
                {t("contact.name", "Name")} *
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                placeholder={t("contact.name_placeholder", "Your name")}
              />
              {errors.name && <p className="text-red-300 text-sm">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t("contact.email", "Email")} *
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                placeholder={t("contact.email_placeholder", "you@example.com")}
              />
              {errors.email && <p className="text-red-300 text-sm">{errors.email}</p>}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                {t("contact.reason", "Reason for inquiry")} *
              </Label>
              <Select value={form.reason} onValueChange={(val) => handleChange("reason", val)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder={t("contact.reason_placeholder", "Select a reason")} />
                </SelectTrigger>
                <SelectContent>
                  {REASON_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`contact.reasons.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.reason && <p className="text-red-300 text-sm">{errors.reason}</p>}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t("contact.subject", "Subject")} *
              </Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                placeholder={t("contact.subject_placeholder", "How can we help?")}
              />
              {errors.subject && <p className="text-red-300 text-sm">{errors.subject}</p>}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t("contact.message", "Message")} *
              </Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => handleChange("message", e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[140px]"
                placeholder={t("contact.message_placeholder", "Tell us more...")}
              />
              {errors.message && <p className="text-red-300 text-sm">{errors.message}</p>}
            </div>

            <Button
              type="submit"
              variant="hero"
              size="xl"
              className="w-full font-semibold"
              disabled={loading}
            >
              {loading ? (
                t("contact.sending", "Sending...")
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <Send className="w-5 h-5" />
                  {t("contact.send", "Send Message")}
                </span>
              )}
            </Button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
