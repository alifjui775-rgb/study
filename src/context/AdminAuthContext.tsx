/**
 * AdminAuthContext
 *
 * এই context পুরনো `admins` টেবিলের উপর নির্ভর করে না।
 * পরিবর্তে, AuthContext থেকে পাওয়া `user` অবজেক্টের
 * `is_admin` ফিল্ড চেক করে অ্যাডমিন অ্যাক্সেস নির্ধারণ করে।
 */
import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/lib/types";

type AdminAuthContextType = {
  admin: User | null;
  isAdmin: boolean;
  signOut: () => void;
  loading: boolean;
};

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, signOut, loading } = useAuth();

  const isAdmin = !!user?.is_admin;
  const admin = isAdmin ? user : null;

  const value: AdminAuthContextType = {
    admin,
    isAdmin,
    signOut,
    loading,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
