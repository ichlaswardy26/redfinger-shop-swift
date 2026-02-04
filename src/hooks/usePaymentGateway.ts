import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PaymentGatewayConfig {
  enabled: boolean;
  provider: string;
  merchant_id: string;
  qris_enabled: boolean;
  auto_delivery: boolean;
}

export interface QRPaymentData {
  trx_id: string;
  qr_link: string;
  qr_string?: string;
  pay_url: string;
  nominal: number;
  expired_at: string;
}

const defaultConfig: PaymentGatewayConfig = {
  enabled: false,
  provider: "tokopay",
  merchant_id: "",
  qris_enabled: true,
  auto_delivery: true,
};

export const usePaymentGateway = () => {
  const { toast } = useToast();
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const { data: config, isLoading: isLoadingConfig, refetch: refetchConfig } = useQuery({
    queryKey: ["payment-gateway-config"],
    queryFn: async (): Promise<PaymentGatewayConfig> => {
      const { data, error } = await supabase
        .from("business_rules")
        .select("value")
        .eq("key", "payment_gateway")
        .maybeSingle();

      if (error) {
        console.error("Error fetching payment gateway config:", error);
        return defaultConfig;
      }

      if (!data?.value) {
        return defaultConfig;
      }

      return { ...defaultConfig, ...(data.value as Partial<PaymentGatewayConfig>) };
    },
    staleTime: 5 * 60 * 1000,
  });

  const isQRISEnabled = config?.enabled && config?.qris_enabled;

  const createPayment = async (orderId: string, amount: number): Promise<QRPaymentData | null> => {
    setIsCreatingPayment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to continue",
          variant: "destructive",
        });
        return null;
      }

      const response = await supabase.functions.invoke("create-tokopay-payment", {
        body: { order_id: orderId, amount },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create payment");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to create payment");
      }

      return response.data.data as QRPaymentData;
    } catch (error) {
      console.error("Create payment error:", error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to create payment",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const checkPaymentStatus = async (orderId: string): Promise<{ status: string; message: string } | null> => {
    setIsCheckingStatus(true);
    try {
      const response = await supabase.functions.invoke("check-payment-status", {
        body: { order_id: orderId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to check status");
      }

      return {
        status: response.data?.status || "pending",
        message: response.data?.message || "Status checked",
      };
    } catch (error) {
      console.error("Check status error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check payment status",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const saveConfig = async (newConfig: PaymentGatewayConfig): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // First try to update existing record
      const { data: existing } = await supabase
        .from("business_rules")
        .select("id")
        .eq("key", "payment_gateway")
        .maybeSingle();

      // Cast to any to avoid Json type issues with Supabase types
      const valueToSave = JSON.parse(JSON.stringify(newConfig));

      if (existing) {
        const { error } = await supabase
          .from("business_rules")
          .update({
            value: valueToSave,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq("key", "payment_gateway");

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_rules")
          .insert([{
            key: "payment_gateway",
            value: valueToSave,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          }]);

        if (error) throw error;
      }

      await refetchConfig();
      toast({ title: "Payment gateway settings saved" });
      return true;
    } catch (error) {
      console.error("Save config error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    config: config || defaultConfig,
    isLoadingConfig,
    isQRISEnabled,
    isCreatingPayment,
    isCheckingStatus,
    createPayment,
    checkPaymentStatus,
    saveConfig,
    refetchConfig,
  };
};
