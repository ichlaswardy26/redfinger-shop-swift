import { useState, useEffect } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { getSignedUrl } from "@/hooks/useSignedUrl";

interface PaymentProofLinkProps {
  filePath: string;
  className?: string;
}

export const PaymentProofLink = ({ filePath, className = "" }: PaymentProofLinkProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!filePath) {
      setLoading(false);
      return;
    }

    getSignedUrl("payment-proofs", filePath).then((url) => {
      setSignedUrl(url);
      setLoading(false);
    });
  }, [filePath]);

  if (!filePath) return <span className="text-muted-foreground text-sm">-</span>;

  if (loading) {
    return <Loader2 className="h-3 w-3 animate-spin" />;
  }

  if (!signedUrl) {
    return <span className="text-muted-foreground text-sm">Unable to load</span>;
  }

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-primary hover:underline flex items-center gap-1 text-sm ${className}`}
    >
      <ExternalLink className="h-3 w-3" />
      View
    </a>
  );
};
