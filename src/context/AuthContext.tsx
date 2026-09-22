import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { supabase, setSupabaseUserHeader } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import type { User } from "@/lib/types";

// MNR ID OAuth2 Configuration
const MNR_CLIENT_ID = import.meta.env.VITE_MNR_CLIENT_ID as string;
const MNR_REDIRECT_URI = import.meta.env.VITE_MNR_REDIRECT_URI as string;
const MNR_AUTHORIZE_URL = "https://id.mnr.bd/auth/authorize";
const MNR_CALLBACK_URL = "/api/auth/callback";

type MnrCallbackUser = {
  uid: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  mnr_id?: string;
  is_admin?: boolean;
  is_instructor?: boolean;
  is_qb_user?: boolean;
  created_at?: string;
};

// Safely reduce any error payload (string, object, nested) to a readable string.
const extractErrorMessage = (payload: unknown, fallback: string): string => {
  if (typeof payload === "string" && payload.trim()) return payload.trim();

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const rawError = record.error;

    if (typeof rawError === "string" && rawError.trim()) return rawError.trim();

    if (rawError && typeof rawError === "object") {
      const nestedMessage = (rawError as Record<string, unknown>).message;
      if (typeof nestedMessage === "string" && nestedMessage.trim()) return nestedMessage.trim();
      try {
        return JSON.stringify(rawError);
      } catch {
        return fallback;
      }
    }

    if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
  }

  return fallback;
};

type AuthContextType = {
  user: User | null;
  signOut: () => void;
  loginWithMnrId: () => void;
  handleMnrCallback: (code: string) => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setSupabaseUserHeader(parsed.uid ?? null);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch roll from study_student if missing
  useEffect(() => {
    if (!user || user.roll) return;

    const fetchRoll = async () => {
      const { data } = await supabase
        .from("study_student")
        .select("roll")
        .eq("id", user.uid)
        .single();

      if (data?.roll) {
        const updatedUser = { ...user, roll: String(data.roll) };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    };

    fetchRoll();
  }, [user]);

  // Stable reference -- no external deps, only uses module-level constants.
  const loginWithMnrId = React.useCallback(() => {
    if (!MNR_CLIENT_ID) {
      console.error("MNR Client ID কনফিগার করা হয়নি। .env.local ফাইল চেক করুন।");
      return;
    }
    const redirectUri = new URL(MNR_REDIRECT_URI, window.location.origin).toString();
    const params = new URLSearchParams({
      client_id: MNR_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
    });
    window.location.href = `${MNR_AUTHORIZE_URL}?${params.toString()}`;
  }, []);

  // Stable reference -- only calls setUser/setSupabaseUserHeader which are stable setState refs.
  const handleMnrCallback = React.useCallback(async (code: string) => {
    // 1. Exchange the authorization code through our serverless endpoint. It owns
    // the client secret and performs the database sync with the service role.
    const callbackResponse = await fetch(MNR_CALLBACK_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const responseText = await callbackResponse.text();
    let payload: { user?: MnrCallbackUser } | null = null;
    try {
      payload = responseText ? (JSON.parse(responseText) as { user?: MnrCallbackUser }) : null;
    } catch {
      payload = null;
    }

    if (!callbackResponse.ok) {
      const message = extractErrorMessage(
        payload,
        responseText || `MNR ID সার্ভার ত্রুটি (${callbackResponse.status})`,
      );
      throw new Error(`লগইন ব্যর্থ হয়েছে: ${message}`);
    }

    if (!payload) {
      throw new Error(
        `MNR ID সার্ভার থেকে অবৈধ রেসপন্স পাওয়া গেছে (${callbackResponse.status})`,
      );
    }

    const apiUser = payload.user;
    if (!apiUser || !apiUser.uid) {
      throw new Error("SSO response did not contain a valid user object");
    }

    const sessionUser: User = {
      uid: apiUser.uid,
      name: apiUser.name,
      email: apiUser.email,
      avatar_url: apiUser.avatar_url ?? null,
      mnr_id: apiUser.mnr_id,
      is_admin: apiUser.is_admin,
      is_instructor: apiUser.is_instructor,
      is_qb_user: apiUser.is_qb_user,
      loginMethod: "mnr_id",
      enrolled_batches: [],
      created_at: apiUser.created_at || new Date().toISOString(),
    };

    // 2. Fetch roll if available
    const { data: studentData } = await supabase
      .from("study_student")
      .select("roll")
      .eq("id", sessionUser.uid)
      .single();
    if (studentData?.roll) sessionUser.roll = String(studentData.roll);

    localStorage.setItem("user", JSON.stringify(sessionUser));
    setUser(sessionUser);
    setSupabaseUserHeader(sessionUser.uid);

    if (sessionUser.is_admin) {
      const adminData = {
        uid: sessionUser.uid,
        username: sessionUser.name,
        role: "admin" as const,
        created_at: sessionUser.created_at || new Date().toISOString(),
      };
      localStorage.setItem("admin-user", JSON.stringify(adminData));
    }
  }, []);

  const signOut = React.useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("admin-user");
    setSupabaseUserHeader(null);
    navigate("/");
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      signOut,
      loginWithMnrId,
      handleMnrCallback,
      loading,
    }),
    [user, loading, signOut, loginWithMnrId, handleMnrCallback],
  );

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth অবশ্যই একটি AuthProvider এর মধ্যে ব্যবহার করতে হবে");
  }
  return context;
};
