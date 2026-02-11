import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { t } from "@/lib/translations";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings: siteSettings } = useSiteSettings();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = signInSchema.parse({ email, password });
      
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) throw error;

      toast({
        title: t.auth.welcomeBack,
        description: t.auth.signInSuccess,
      });
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t.auth.errors.validationError,
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t.toasts.error,
          description: error instanceof Error ? error.message : t.auth.errors.invalidCredentials,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SEOHead title="Sign In" noIndex />
      
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 border-2 border-border rotate-12" />
        <div className="absolute top-40 right-20 w-24 h-24 bg-accent/30 border-2 border-border -rotate-6" />
        <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-primary/10 border-2 border-border rotate-45" />
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-accent/20 border-2 border-border -rotate-12" />
      </div>

      <Card className="w-full max-w-md relative">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl sm:text-3xl font-black text-center">
            <span className="bg-primary text-primary-foreground px-3 py-1 inline-block border-2 border-border shadow-brutal-sm">
              {siteSettings.name}
            </span>
          </CardTitle>
          <CardDescription className="text-center pt-4 font-medium">
            {t.auth.signInDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold">{t.auth.password}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-end">
              <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline font-medium">
                {t.auth.forgotPassword}
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={loading} variant="hero">
              {loading ? t.auth.signingIn : t.auth.signIn}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              {t.auth.noAccount}{" "}
              <Link to="/auth/signup" className="text-primary hover:underline font-medium">
                {t.auth.signUp}
              </Link>
            </div>
            <div className="text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
                {t.auth.backToStore}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
