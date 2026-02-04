import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessRules {
  order: {
    payment_proof_max_size_mb: number;
    allowed_file_types: string[];
    auto_cancel_hours: number;
  };
  stock: {
    low_threshold: number;
    out_of_stock_alert: boolean;
  };
  support: {
    attachment_max_size_mb: number;
    auto_close_resolved_days: number;
    max_tickets_per_hour: number;
  };
  display: {
    products_per_page: number;
    testimonials_count: number;
    best_seller_period: string;
  };
  payment_gateway: {
    enabled: boolean;
    provider: string;
    merchant_id: string;
    qris_enabled: boolean;
    auto_delivery: boolean;
  };
}

const defaultRules: BusinessRules = {
  order: {
    payment_proof_max_size_mb: 5,
    allowed_file_types: ["image/jpeg", "image/png"],
    auto_cancel_hours: 24,
  },
  stock: {
    low_threshold: 10,
    out_of_stock_alert: true,
  },
  support: {
    attachment_max_size_mb: 10,
    auto_close_resolved_days: 7,
    max_tickets_per_hour: 5,
  },
  display: {
    products_per_page: 12,
    testimonials_count: 6,
    best_seller_period: "month",
  },
  payment_gateway: {
    enabled: false,
    provider: "tokopay",
    merchant_id: "",
    qris_enabled: true,
    auto_delivery: true,
  },
};

export const useBusinessRules = () => {
  return useQuery({
    queryKey: ["business-rules"],
    queryFn: async (): Promise<BusinessRules> => {
      const { data, error } = await supabase
        .from("business_rules")
        .select("key, value");

      if (error) {
        console.error("Error fetching business rules:", error);
        return defaultRules;
      }

      const rules: BusinessRules = JSON.parse(JSON.stringify(defaultRules));
      data?.forEach((item) => {
        const key = item.key as keyof BusinessRules;
        if (key in rules && typeof item.value === 'object' && item.value !== null) {
          Object.assign(rules[key], item.value);
        }
      });

      return rules;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};

export const useBusinessRule = <K extends keyof BusinessRules>(key: K) => {
  const { data: rules, isLoading, error } = useBusinessRules();
  return {
    data: rules?.[key] ?? defaultRules[key],
    isLoading,
    error,
  };
};

export { defaultRules };
