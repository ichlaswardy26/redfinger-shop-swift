import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Eye, EyeOff, CheckCircle, XCircle, Lock } from "lucide-react";
import { t } from "@/lib/translations";
import { z } from "zod";

const passwordSchema = z.string()
  .min(6, "Password must be at least 6 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings: siteSettings } = useSiteSettings();

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 6) strength += 25;
    if (pwd.length >= 8) strength += 15;
    if (/[A-Z]/.test(pwd)) strength += 20;
    if (/[a-z]/.test(pwd)) strength += 20;
    if (/[0-9]/.test(pwd)) strength += 10;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 10;
    return Math.min(100, strength);
  };

  const passwordStrength = getPasswordStrength(password);
  const getStrengthColor = () => {
    if (passwordStrength < 40) return "bg-destructive";
    if (passwordStrength < 70) return "bg-yellow-500";
    return "bg-green-500";
  };
  const getStrengthLabel = () => {
    if (passwordStrength < 40) return t.auth.weak;
    if (passwordStrength < 70) return t.auth.medium;
    return t.auth.strong;
  };

  // Password requirements checks
  const requirements = [
    { label: t.auth.passwordRequirements.length, met: password.length >= 6 },
    { label: t.auth.passwordRequirements.uppercase, met: /[A-Z]/.test(password) },
    { label: t.auth.passwordRequirements.lowercase, met: /[a-z]/.test(password) },
    { label: t.auth.passwordRequirements.number, met: /[0-9]/.test(password) },
  ];

  useEffect(() => {
    // Check if user has a valid reset session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL for recovery token (Supabase sends this)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const type = hashParams.get("type");
      
      if (type === "recovery" && accessToken) {
        setIsValidSession(true);
      } else if (session) {
        // User might have clicked the link while already logged in
        setIsValidSession(true);
      } else {
        toast({
          title: t.auth.invalidResetLink,
          description: t.auth.invalidResetLinkDesc,
          variant: "destructive",
        });
      }
      setCheckingSession(false);
    };

    checkSession();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: t.auth.errors.passwordMismatch,
        description: t.auth.errors.passwordMismatch,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      passwordSchema.parse(password);
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast({
        title: t.auth.passwordUpdated,
        description: t.auth.passwordUpdatedDesc,
      });
      
      await supabase.auth.signOut();
      navigate("/auth/signin");
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
          description: error instanceof Error ? error.message : "Gagal mengatur ulang kata sandi",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t.auth.verifyingLink}</p>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 border-2 border-destructive/20 flex items-center justify-center mx-auto rounded-lg">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">{t.auth.invalidResetLink}</h2>
            <p className="text-muted-foreground">
              {t.auth.invalidResetLinkDesc}
            </p>
            <Link to="/auth/forgot-password">
              <Button variant="hero" className="w-full">
                {t.auth.requestNewLink}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SEOHead title="Reset Password" siteName={siteSettings.name} noIndex />
      
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
              {t.auth.newPassword}
            </span>
          </CardTitle>
          <CardDescription className="text-center pt-4 font-medium">
            {t.auth.chooseStrongPassword}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold">{t.auth.newPassword}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Password strength indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.auth.passwordStrength}</span>
                    <span className={`font-medium ${passwordStrength >= 70 ? 'text-green-600' : passwordStrength >= 40 ? 'text-yellow-600' : 'text-destructive'}`}>
                      {getStrengthLabel()}
                    </span>
                  </div>
                  <Progress value={passwordStrength} className={`h-2 ${getStrengthColor()}`} />
                </div>
              )}
              
              {/* Requirements list */}
              <div className="space-y-1 pt-2">
                {requirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={req.met ? "text-green-600" : "text-muted-foreground"}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-bold">{t.auth.confirmPassword}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">{t.auth.errors.passwordMismatch}</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> {t.auth.passwordsMatch}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || password !== confirmPassword || passwordStrength < 40} 
              variant="hero"
            >
              {loading ? t.auth.updating : t.auth.updatePassword}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
