import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  name: string;
  tagline: string;
  description: string;
  logo?: string;
  favicon?: string;
}

const defaultSiteSettings: SiteSettings = {
  name: "Cloud Phone Store",
  tagline: "Cloud Phone Services",
  description: "Premium cloud phone and app automation services",
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("web_settings")
          .select("value")
          .eq("key", "site")
          .maybeSingle();
        
        if (error) throw error;
        
        if (data?.value) {
          const siteValue = data.value as Record<string, unknown>;
          setSettings({
            name: (siteValue.name as string) || defaultSiteSettings.name,
            tagline: (siteValue.tagline as string) || defaultSiteSettings.tagline,
            description: (siteValue.description as string) || defaultSiteSettings.description,
            logo: siteValue.logo as string | undefined,
            favicon: siteValue.favicon as string | undefined,
          });
        }
      } catch (error) {
        console.error("Error fetching site settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}
