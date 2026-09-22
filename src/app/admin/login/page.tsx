import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, LogIn } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * AdminLoginPage
 *
 * পুরনো username/password login সরিয়ে দেওয়া হয়েছে।
 * এখন অ্যাডমিন অ্যাক্সেসের জন্য MNR ID দিয়ে লগইন করতে হবে।
 * লগইনের পর `study_user.is_admin` চেক করে AdminLayout route-guard
 * স্বয়ংক্রিয়ভাবে access নির্ধারণ করবে।
 */
export default function AdminLoginPage() {
  const { user, loginWithMnrId, loading } = useAuth();
  const navigate = useNavigate();

  // ইতোমধ্যে লগড-ইন এবং অ্যাডমিন হলে সরাসরি dashboard-এ পাঠাও
  useEffect(() => {
    if (!loading && user?.is_admin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <Shield className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl">অ্যাডমিন প্যানেল</CardTitle>
          <CardDescription>
            অ্যাডমিন প্যানেলে প্রবেশ করতে MNR ID দিয়ে লগইন করুন। শুধুমাত্র অনুমোদিত অ্যাডমিন ব্যবহারকারীরা প্রবেশ করতে
            পারবেন।
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={loginWithMnrId} disabled={loading}>
            <LogIn className="mr-2 h-4 w-4" />
            MNR ID দিয়ে লগইন করুন
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
