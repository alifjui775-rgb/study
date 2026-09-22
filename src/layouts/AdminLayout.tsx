import { Outlet, Navigate } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";
import NotFound from "@/app/not-found/NotFound";

/**
 * AdminGuard
 * - লগড-ইন না থাকলে: লগইন পেজে পাঠায় (AuthContext-এর signOut দিয়ে)
 * - লগড-ইন কিন্তু is_admin = false হলে: 404 দেখায় (পেজ exist করে না মনে হবে)
 * - is_admin = true হলে: child routes রেন্ডার করে
 */
function AdminGuard() {
  const { admin, isAdmin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // লগড-ইন নেই → লগইন পেজে পাঠাও
  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  // লগড-ইন আছে কিন্তু অ্যাডমিন নয় → 404 দেখাও
  if (!isAdmin) {
    return <NotFound />;
  }

  return <Outlet />;
}

export default function AdminLayoutWrapper() {
  return (
    <AdminAuthProvider>
      <AdminGuard />
    </AdminAuthProvider>
  );
}
