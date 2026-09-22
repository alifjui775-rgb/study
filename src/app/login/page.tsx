import { useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  AlertBox,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components";
import { GraduationCap, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";

function LoginPageContent() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginWithMnrId } = useAuth();
  const [searchParams] = useSearchParams();

  const handleMnrLogin = () => {
    setLoading(true);
    setError("");
    try {
      loginWithMnrId();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("MNR ID লগইন শুরু করতে ব্যর্থ হয়েছে।");
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 font-bengali">
      <Card className="w-full max-w-sm rounded-3xl border shadow-lg overflow-hidden">
        <CardHeader className="text-center space-y-2 pt-8 pb-4">
          <div className="size-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
            <GraduationCap className="size-8" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-black gradient-text pt-2">
            MNR Exam
          </CardTitle>
          <CardDescription className="text-sm font-bengali">
            ওয়েবসাইটে প্রবেশ করতে আপনার MNR ID ব্যবহার করুন
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-8 pt-2">
          <Button
            type="button"
            onClick={handleMnrLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-6 px-4 bg-linear-to-r from-primary to-primary-shift hover:from-primary-shift hover:to-primary transition-all duration-300 rounded-2xl text-primary-foreground font-bold text-base shadow-md hover:shadow-lg cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span>রিডাইরেক্ট হচ্ছে...</span>
              </>
            ) : (
              <>
                <img
                  src="/mnr.svg"
                  className="size-6 rounded-full overflow-hidden shrink-0"
                  alt="MNR ID"
                />
                <span className="font-sans tracking-wide text-sm font-semibold">
                  Continue with MNR ID
                </span>
              </>
            )}
          </Button>

          {error && <AlertBox type="error" title="লগইন ব্যর্থ" description={error} />}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
