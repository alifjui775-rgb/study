import { Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  Users,
  LayoutDashboard,
  Settings,
  FileText,
  BarChart4,
  BookMarked,
  Building2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { ReactNode, useEffect, useState } from "react";
import { Header } from "@/components/landing/Header";
import { supabase } from "@/lib/supabase";

const baseSidebarNavItems = [
  { title: "ড্যাশবোর্ড", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "ব্যবহারকারীগণ", href: "/admin/dashboard/users", icon: Users },
  { title: "প্রশ্নব্যাংক", href: "/admin/dashboard/qb", icon: BookMarked },
  { title: "প্রতিষ্ঠান", href: "/admin/dashboard/institutions", icon: Building2 },
  { title: "সাবজেক্ট", href: "/admin/dashboard/subjects", icon: BookMarked },
  { title: "রিপোর্ট", href: "/admin/dashboard/reports", icon: BarChart4 },
  { title: "সেটিংস", href: "/admin/dashboard/settings", icon: Settings },
];

const auditLogNavItem = {
  title: "অডিট লগ",
  href: "/admin/dashboard/audit-logs",
  icon: ShieldAlert,
};
const recycleBinNavItem = {
  title: "রিসাইকেল বিন",
  href: "/admin/dashboard/recycle-bin",
  icon: Trash2,
};

export default function AdminDashboardLayout() {
  return (
    <AdminDashboardLayoutInner>
      <Outlet />
    </AdminDashboardLayoutInner>
  );
}

function AdminDashboardLayoutInner({ children }: { children: ReactNode }) {
  const { admin, signOut } = useAdminAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!admin) return;
    supabase
      .from("study_admin")
      .select("is_super_admin")
      .eq("id", admin.uid)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.is_super_admin) setIsSuperAdmin(true);
      });
  }, [admin]);

  const sidebarNavItems = isSuperAdmin
    ? [...baseSidebarNavItems, auditLogNavItem, recycleBinNavItem]
    : baseSidebarNavItems;

  const handleLogout = () => {
    signOut();
  };

  // AdminGuard (AdminLayout) handles the null/unauthorized case before
  // reaching here, but keep a safety fallback just in case.
  if (!admin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
      <DashboardSidebar
        items={sidebarNavItems}
        userInfo={{
          name: admin.name,
          role: "অ্যাডমিন",
        }}
        onLogout={handleLogout}
        panelType="admin"
        onExpandedChange={setSidebarExpanded}
      />

      <div
        className={`flex flex-1 flex-col pb-16 lg:pb-0 ${
          sidebarExpanded ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <Header />
        <main className="flex-1 p-2 pt-6 md:p-4 md:pt-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
