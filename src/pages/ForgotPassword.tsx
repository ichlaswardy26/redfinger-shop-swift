import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { t } from "@/lib/translations";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const { settings: siteSettings } = useSiteSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedEmail = emailSchema.parse(email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: t.auth.resetLinkSent,
        description: t.auth.checkEmail,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t.auth.errors.invalidEmail,
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t.toasts.error,
          description: error instanceof Error ? error.message : "Gagal mengirim link reset",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SEOHead title="Forgot Password" siteName={siteSettings.name} noIndex />
      
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 border-2 border-border rotate-12" />
        <div className="absolute top-40 right-20 w-24 h-24 bg-accent/30 border-2 border-border -rotate-6" />
        <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-primary/10 border-2 border-border rotate-45" />
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-accent/20 border-2 border-border -rotate-12" />
      </div>

      <Card className="w-full max-w-md relative">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-black text-center">
            <span className="bg-primary text-primary-foreground px-3 py-1 inline-block border-2 border-border shadow-brutal-sm">
              {t.auth.resetPassword}
            </span>
          </CardTitle>
          <CardDescription className="text-center pt-4 font-medium">
            {emailSent 
              ? t.auth.checkEmail 
              : "Masukkan email Anda untuk menerima link reset kata sandi"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-accent border-2 border-border shadow-brutal-sm flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-accent-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Kami telah mengirim link reset kata sandi ke:
                </p>
                <p className="font-bold">{email}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.auth.didntReceive}{" "}
                <button 
                  onClick={() => setEmailSent(false)} 
                  className="text-primary hover:underline font-medium"
                >
                  {t.auth.tryAgain}
                </button>
              </p>
              <Link to="/auth/signin">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t.actions.back} {t.auth.signIn}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold">{t.auth.email}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading} variant="hero">
                {loading ? t.auth.sending : t.auth.sendResetLink}
              </Button>
              <div className="text-center">
                <Link to="/auth/signin" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  {t.actions.back} {t.auth.signIn}
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
