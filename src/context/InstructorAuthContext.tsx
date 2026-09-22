/**
 * InstructorAuthContext
 *
 * AuthContext থেকে পাওয়া `user` অবজেক্টের `is_instructor` ফিল্ড
 * চেক করে ইন্সট্রাক্টর অ্যাক্সেস নির্ধারণ করে।
 */
import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/lib/types";

type InstructorAuthContextType = {
  instructor: User | null;
  isInstructor: boolean;
  signOut: () => void;
  loading: boolean;
};

const InstructorAuthContext = createContext<InstructorAuthContextType | undefined>(undefined);

export const InstructorAuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, signOut, loading } = useAuth();

  const isInstructor = !!user?.is_instructor;
  const instructor = isInstructor ? user : null;

  const value: InstructorAuthContextType = {
    instructor,
    isInstructor,
    signOut,
    loading,
  };

  return <InstructorAuthContext.Provider value={value}>{children}</InstructorAuthContext.Provider>;
};

export const useInstructorAuth = () => {
  const context = useContext(InstructorAuthContext);
  if (context === undefined) {
    throw new Error("useInstructorAuth must be used within an InstructorAuthProvider");
  }
  return context;
};
