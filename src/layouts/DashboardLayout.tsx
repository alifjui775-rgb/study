import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, ReactNode, useState } from "react";
import {
  BarChart4,
  LayoutDashboard,
  FileText,
  CalendarCheck,
  NotebookPen,
  BookMarked,
} from "lucide-react";
import { ListClock } from "@/components/icons/ListClock";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Header } from "@/components/landing/Header";

const sidebarNavItems = [
  { title: "ড্যাশবোর্ড", href: "/dashboard", icon: LayoutDashboard },
  { title: "টাস্ক", href: "/dashboard/daily", icon: CalendarCheck },
  { title: "পরীক্ষাসমূহ", href: "/dashboard/exams", icon: FileText },
  { title: "হিস্ট্রি", href: "/dashboard/history", icon: ListClock },
  { title: "রিপোর্ট", href: "/dashboard/reports", icon: BarChart4 },
  { title: "নোটস", href: "/dashboard/notes", icon: NotebookPen },
  { title: "সিলেবাস", href: "/syllabus-tracker", icon: BookMarked },
];

export default function DashboardLayoutWrapper() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const pathname = location.pathname;

  useEffect(() => {
    if (!loading && !user) {
      navigate(`/login?redirect=${pathname}`);
    }
  }, [user, loading, navigate, pathname]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>লোড হচ্ছে...</p>
      </div>
    );
  }

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <DashboardSidebar
        items={sidebarNavItems}
        userInfo={{
          name: user.name,
          role: `রোল: ${user.roll}`,
        }}
        onLogout={handleLogout}
        panelType="student"
        onExpandedChange={setSidebarExpanded}
        hideMobileNav
      />

      {/* Main Content */}
      <div
        className={`flex flex-1 flex-col min-w-0 max-w-full overflow-x-hidden ${sidebarExpanded ? "lg:ml-64" : "lg:ml-20"}`}
      >
        <Header />
        <main className="flex-1 p-2 md:p-4 overflow-y-auto min-w-0 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
