import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Headphones, Target, RefreshCw, Pencil, Sliders, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "ai_knowledge_guide_seen_v1";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showDontShowAgain?: boolean;
}

export const AIKnowledgeGuideModal = ({ open, onOpenChange, showDontShowAgain }: Props) => {
  const { t } = useTranslation();

  const items = [
    { icon: Target, key: "notExact", color: "text-rose-500" },
    { icon: RefreshCw, key: "iterate", color: "text-blue-500" },
    { icon: Pencil, key: "clearer", color: "text-emerald-500" },
    { icon: Sliders, key: "tweak", color: "text-violet-500" },
    { icon: AlertTriangle, key: "important", color: "text-amber-500" },
  ];

  const handleClose = (dontShowAgain = false) => {
    if (dontShowAgain) localStorage.setItem(STORAGE_KEY, "1");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Headphones className="w-6 h-6 text-primary" />
            {t("aiStudio.aiGuide.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {items.map(({ icon: Icon, key, color }) => (
            <div key={key} className="flex gap-3 p-3 rounded-lg bg-muted/40">
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} />
              <div>
                <h4 className="font-semibold text-sm mb-1">
                  {t(`aiStudio.aiGuide.items.${key}.title`)}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t(`aiStudio.aiGuide.items.${key}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-end mt-4">
          {showDontShowAgain && (
            <Button variant="ghost" size="sm" onClick={() => handleClose(true)}>
              {t("aiStudio.aiGuide.dontShowAgain")}
            </Button>
          )}
          <Button onClick={() => handleClose(true)}>
            {t("aiStudio.aiGuide.gotIt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const useAIGuideAutoShow = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);
  return { open, setOpen };
};
