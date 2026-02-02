import { FileImage, FileVideo, FileText, ExternalLink, Loader2 } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface FilePreviewProps {
  filePath: string;
  className?: string;
}

export const FilePreview = ({ filePath, className = "" }: FilePreviewProps) => {
  const { signedUrl, loading, error } = useSignedUrl("payment-proofs", filePath);

  if (!filePath) return null;

  if (loading) {
    return (
      <div className={`bg-muted rounded-lg p-4 flex items-center justify-center ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`bg-muted rounded-lg p-3 text-muted-foreground text-sm ${className}`}>
        Unable to load attachment
      </div>
    );
  }

  const ext = filePath.split('.').pop()?.toLowerCase();

  // Image preview
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
    return (
      <div className={`bg-muted rounded-lg p-2 ${className}`}>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <FileImage className="h-3 w-3" /> Image Attachment
        </p>
        <img 
          src={signedUrl} 
          alt="Attachment" 
          className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-contain"
          onClick={() => window.open(signedUrl, '_blank')}
        />
      </div>
    );
  }

  // Video preview
  if (['mp4', 'webm', 'mov'].includes(ext || '')) {
    return (
      <div className={`bg-muted rounded-lg p-2 ${className}`}>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <FileVideo className="h-3 w-3" /> Video Attachment
        </p>
        <video 
          src={signedUrl} 
          controls 
          className="max-w-full max-h-48 rounded-lg"
        />
      </div>
    );
  }

  // PDF preview
  if (ext === 'pdf') {
    return (
      <div className={`bg-muted rounded-lg p-3 ${className}`}>
        <a 
          href={signedUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <FileText className="h-4 w-4" />
          View PDF Document
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  // Generic file
  return (
    <div className={`bg-muted rounded-lg p-3 ${className}`}>
      <a 
        href={signedUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-primary hover:underline"
      >
        <FileText className="h-4 w-4" />
        View Attachment
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
};
