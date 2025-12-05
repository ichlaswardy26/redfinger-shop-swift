import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, FileImage, FileVideo, FileText } from "lucide-react";
import { ticketSchema } from "@/lib/validations";
import { useFileValidation } from "@/hooks/useFileValidation";

interface TicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
  onSuccess?: () => void;
}

export const TicketDialog = ({ open, onOpenChange, orderId, onSuccess }: TicketDialogProps) => {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { validateTicketFile } = useFileValidation();

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = await validateTicketFile(file);
    if (validationError) {
      toast({
        title: "Invalid File",
        description: validationError,
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    setAttachedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate form data
      const validationResult = ticketSchema.safeParse({
        subject: subject.trim(),
        description: description.trim(),
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageProof: string | null = null;

      if (attachedFile) {
        const fileExt = attachedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, attachedFile);

        if (uploadError) throw uploadError;
        imageProof = fileName;
      }

      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          order_id: orderId || null,
          subject: validationResult.data.subject,
          description: validationResult.data.description,
          image_proof: imageProof,
        });

      if (error) throw error;

      toast({
        title: "Ticket created",
        description: "Your support ticket has been submitted successfully",
      });

      setSubject("");
      setDescription("");
      setAttachedFile(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create ticket";
      // Check for rate limit error
      if (errorMessage.includes("Rate limit exceeded")) {
        toast({
          title: "Rate Limit Exceeded",
          description: "You can only create 5 tickets per hour. Please try again later.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Describe your issue and we'll help you resolve it
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {subject.length}/200 characters
            </p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide detailed information about your issue"
              rows={5}
              maxLength={5000}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/5000 characters
            </p>
          </div>
          <div>
            <Label htmlFor="attachment">Attachment (optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Supported: JPG, PNG, MP4, WebM, MOV, PDF (max 10MB)
            </p>
            {attachedFile ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                {getFileIcon(attachedFile)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(attachedFile.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAttachedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('ticket-attachment')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose file
                </Button>
                <input
                  id="ticket-attachment"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,video/mp4,video/webm,video/quicktime,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
