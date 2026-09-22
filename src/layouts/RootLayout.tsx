import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import QueryProvider from "@/components/QueryProvider";
import { RollWelcomeModal } from "@/components/RollWelcomeModal";
import { MobileBottomNav } from "@/components/landing/MobileBottomNav";
import BackToTop from "@/components/BackToTop";
import ScrollToTop from "@/components/ScrollToTop";

export default function RootLayout() {
  return (
    <div className={cn("min-h-screen bg-background antialiased")}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryProvider>
          <AuthProvider>
            <ScrollToTop />
            <div>
              <Outlet />
            </div>
            <MobileBottomNav />
            <BackToTop />
            <RollWelcomeModal />
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </div>
  );
}
