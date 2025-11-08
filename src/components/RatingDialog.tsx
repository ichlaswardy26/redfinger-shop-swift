import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { ratingSchema } from "@/lib/validations";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  productId: string;
  productName: string;
  onSuccess?: () => void;
}

export const RatingDialog = ({ open, onOpenChange, orderId, productId, productName, onSuccess }: RatingDialogProps) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [existingRating, setExistingRating] = useState<any>(null);

  useEffect(() => {
    if (open && orderId) {
      checkExistingRating();
    } else if (!open) {
      // Reset all states when dialog closes
      setRating(0);
      setReview("");
      setExistingRating(null);
      setHoveredStar(0);
    }
  }, [open, orderId]);

  const checkExistingRating = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has ever rated this product (not just for this order)
      const { data, error } = await supabase
        .from("product_ratings")
        .select("*")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setExistingRating(data);
        setRating(data.rating);
        setReview(data.review || "");
      } else {
        setExistingRating(null);
        setRating(0);
        setReview("");
      }
    } catch (error) {
      console.error("Error checking existing rating:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (existingRating) {
      toast.info("You have already rated this product. Ratings are not editable.");
      return;
    }

    // Validate review length
    const validationResult = ratingSchema.safeParse({
      rating,
      review: review.trim() || undefined,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to submit a rating");
        return;
      }

      const { error } = await supabase.from("product_ratings").insert({
        user_id: user.id,
        product_id: productId,
        order_id: orderId,
        rating: validationResult.data.rating,
        review: validationResult.data.review || null,
      });

      if (error) throw error;

      toast.success("Thank you for your rating!");
      onOpenChange(false);
      onSuccess?.();
      setRating(0);
      setReview("");
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existingRating ? "Your Rating" : `Rate ${productName}`}</DialogTitle>
          <DialogDescription>
            {existingRating 
              ? "You have already rated this product. Ratings cannot be edited."
              : "Share your experience with this product"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => !existingRating && setRating(star)}
                onMouseEnter={() => !existingRating && setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="transition-transform hover:scale-110"
                disabled={!!existingRating}
              >
                <Star
                  className={`h-10 w-10 ${
                    star <= (hoveredStar || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="review">Review (optional)</Label>
            <Textarea
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Tell us about your experience..."
              rows={4}
              maxLength={2000}
              disabled={!!existingRating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {review.length}/2000 characters
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Close
            </Button>
            {!existingRating && (
              <Button type="submit" disabled={rating === 0 || isSubmitting} className="flex-1">
                {isSubmitting ? "Submitting..." : "Submit Rating"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
