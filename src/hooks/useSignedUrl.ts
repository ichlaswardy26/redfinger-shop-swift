import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSignedUrl(
  bucket: string,
  filePath: string | null | undefined,
  expiresIn: number = 3600
) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!filePath) {
      setSignedUrl(null);
      return;
    }

    const getSignedUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, expiresIn);

        if (signError) {
          throw signError;
        }

        setSignedUrl(data?.signedUrl || null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to get signed URL"));
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [bucket, filePath, expiresIn]);

  return { signedUrl, loading, error };
}

// Helper function for one-off signed URL generation
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.error("Error getting signed URL:", err);
    return null;
  }
}
