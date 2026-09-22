import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { handleMnrCallback } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const callbackProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (callbackProcessed.current) return;

    const code = searchParams.get("code");
    if (!code) {
      setError("অনুমোদন কোড পাওয়া যায়নি।");
      return;
    }

    callbackProcessed.current = true;

    const exchangeCode = async () => {
      try {
        await handleMnrCallback(code);

        // Fetch stored user to check role and redirect
        const stored = localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.is_admin) {
            navigate("/admin/dashboard");
            return;
          }
        }
        navigate("/dashboard");
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "লগইন সফল করা সম্ভব হয়নি। আবার চেষ্টা করুন।");
      }
    };

    exchangeCode();
  }, [searchParams, handleMnrCallback, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md border-destructive/30 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-destructive/10 rounded-full text-destructive">
                <AlertCircle className="h-10 w-10" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">লগইন ব্যর্থ হয়েছে</CardTitle>
            <CardDescription>লগইন প্রক্রিয়াকরণের সময় একটি সমস্যা হয়েছে।</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 text-center">
            <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg break-words">
              {error}
            </p>
            <Button className="w-full gap-2 cursor-pointer" onClick={() => navigate("/login")}>
              <ArrowLeft className="h-4 w-4" />
              লগইন পেজে ফিরে যান
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-72 h-72 bg-primary-shift/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center space-y-6 max-w-sm text-center px-6">
        <div className="relative flex items-center justify-center">
          {/* Custom animated loader */}
          <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <img
            src="/mnr.svg"
            className="absolute h-8 w-8 rounded-full shadow-inner animate-pulse"
            alt="MNR ID"
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            আপনার MNR ID যাচাই করা হচ্ছে
          </h2>
          <p className="text-sm text-muted-foreground">
            অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন। আমরা আপনাকে নিরাপদে লগইন করাচ্ছি...
          </p>
        </div>
      </div>
    </div>
  );
}
