import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { ratingSchema } from "@/lib/validations";
import { t } from "@/lib/translations";

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
      toast.error(t.additional.pleaseSelectRating);
      return;
    }

    if (existingRating) {
      toast.info(t.additional.alreadyRated);
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
        toast.error(t.additional.mustBeLoggedIn);
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

      toast.success(t.ratings.thankYou);
      onOpenChange(false);
      onSuccess?.();
      setRating(0);
      setReview("");
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error(t.additional.failedSubmitRating);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existingRating ? t.ratings.yourRating : `${t.ratings.rateProduct} ${productName}`}</DialogTitle>
          <DialogDescription>
            {existingRating 
              ? t.additional.ratingAlreadySubmitted
              : t.additional.shareExperience}
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
            <Label htmlFor="review">{t.ratings.review} ({t.ui.optional})</Label>
            <Textarea
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={t.additional.tellExperience}
              rows={4}
              maxLength={2000}
              disabled={!!existingRating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {review.length}/2000 {t.additional.characters}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t.actions.close}
            </Button>
            {!existingRating && (
              <Button type="submit" disabled={rating === 0 || isSubmitting} className="flex-1">
                {isSubmitting ? t.additional.submitting : t.ratings.submitRating}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
