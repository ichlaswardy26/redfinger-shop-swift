import { FileImage, FileVideo, FileText, ExternalLink } from "lucide-react";

interface FilePreviewProps {
  filePath: string;
  className?: string;
}

export const FilePreview = ({ filePath, className = "" }: FilePreviewProps) => {
  if (!filePath) return null;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${filePath}`;
  const ext = filePath.split('.').pop()?.toLowerCase();

  // Image preview
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
    return (
      <div className={`bg-muted rounded-lg p-2 ${className}`}>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <FileImage className="h-3 w-3" /> Image Attachment
        </p>
        <img 
          src={url} 
          alt="Attachment" 
          className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-contain"
          onClick={() => window.open(url, '_blank')}
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
          src={url} 
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
          href={url} 
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
        href={url} 
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