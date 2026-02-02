import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export const PasswordStrengthIndicator = ({ 
  password, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) => {
  // Calculate password strength
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

  const strength = getPasswordStrength(password);
  
  const getStrengthColor = () => {
    if (strength < 40) return "bg-destructive";
    if (strength < 70) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  const getStrengthLabel = () => {
    if (strength < 40) return "Weak";
    if (strength < 70) return "Medium";
    return "Strong";
  };

  const requirements = [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className={`font-medium ${
          strength >= 70 ? 'text-green-600' : 
          strength >= 40 ? 'text-yellow-600' : 
          'text-destructive'
        }`}>
          {getStrengthLabel()}
        </span>
      </div>
      <Progress value={strength} className={`h-2 ${getStrengthColor()}`} />
      
      {showRequirements && (
        <div className="space-y-1 pt-1">
          {requirements.map((req, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              {req.met ? (
                <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <span className={req.met ? "text-green-600" : "text-muted-foreground"}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
