import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
 import { t } from "@/lib/translations";

interface CopyButtonProps {
  text: string;
  label?: string;
}

 const CopyButton = ({ text, label }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: t.toasts.copied,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: t.toasts.copyFailed,
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
        {t.actions.copied}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
        {label || t.actions.copy}
        </>
      )}
    </Button>
  );
};

export default CopyButton;
