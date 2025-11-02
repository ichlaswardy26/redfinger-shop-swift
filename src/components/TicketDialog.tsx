import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

interface TicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
  onSuccess?: () => void;
}

export const TicketDialog = ({ open, onOpenChange, orderId, onSuccess }: TicketDialogProps) => {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageProof: string | null = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;
        imageProof = fileName;
      }

      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          order_id: orderId || null,
          subject,
          description,
          image_proof: imageProof,
        });

      if (error) throw error;

      toast({
        title: "Ticket created",
        description: "Your support ticket has been submitted successfully",
      });

      setSubject("");
      setDescription("");
      setImageFile(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ticket",
        variant: "destructive",
      });
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
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide detailed information about your issue"
              rows={5}
              required
            />
          </div>
          <div>
            <Label htmlFor="image">Attach Image (optional)</Label>
            <div className="flex gap-2 items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('ticket-image')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {imageFile ? imageFile.name : "Choose file"}
              </Button>
              <input
                id="ticket-image"
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
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
