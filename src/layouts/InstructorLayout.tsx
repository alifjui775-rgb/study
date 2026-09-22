import { Outlet, Navigate } from "react-router-dom";
import { InstructorAuthProvider, useInstructorAuth } from "@/context/InstructorAuthContext";
import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Header } from "@/components/landing/Header";
import { LayoutDashboard, BookOpen, Users, BarChart4, Settings, CreditCard } from "lucide-react";

const sidebarNavItems = [
  { title: "ড্যাশবোর্ড", href: "/instructor/dashboard", icon: LayoutDashboard },
  { title: "কোর্স", href: "/instructor/courses", icon: BookOpen },
  { title: "পেমেন্টস", href: "/instructor/payments", icon: CreditCard },
  { title: "শিক্ষার্থী", href: "/instructor/dashboard/students", icon: Users },
  { title: "রিপোর্ট", href: "/instructor/dashboard/reports", icon: BarChart4 },
  { title: "সেটিংস", href: "/instructor/dashboard/settings", icon: Settings },
];

/**
 * InstructorGuard
 * - লগড-ইন না থাকলে: লগইন পেজে পাঠায়
 * - লগড-ইন কিন্তু is_instructor = false হলে: /dashboard এ পাঠায়
 * - is_instructor = true হলে: dashboard layout রেন্ডার করে
 */
function InstructorGuard() {
  const { instructor, isInstructor, loading, signOut } = useInstructorAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // লগড-ইন নেই → লগইন পেজে পাঠাও
  if (!instructor) {
    return <Navigate to="/login" replace />;
  }

  // লগড-ইন আছে কিন্তু ইন্সট্রাক্টর নয় → নর্মাল ড্যাসবোর্ডে পাঠাও
  if (!isInstructor) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
      <DashboardSidebar
        items={sidebarNavItems}
        userInfo={{
          name: instructor.name,
          role: "ইন্সট্রাক্টর",
        }}
        onLogout={signOut}
        panelType="admin"
        onExpandedChange={setSidebarExpanded}
      />

      <div
        className={`flex flex-1 flex-col pb-16 lg:pb-0 ${
          sidebarExpanded ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <Header />
        <main className="flex-1 p-2 md:p-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function InstructorLayoutWrapper() {
  return (
    <InstructorAuthProvider>
      <InstructorGuard />
    </InstructorAuthProvider>
  );
}
