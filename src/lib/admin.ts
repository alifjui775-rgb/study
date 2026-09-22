import { supabase } from "./supabase";

export async function verifyAdminPassword(adminUid: string, password: string) {
  try {
    const { data, error } = await supabase
      .from("admins")
      .select("password")
      .eq("uid", adminUid)
      .single();

    if (error || !data) return false;

    return data.password === password;
  } catch (err) {
    console.error("verifyAdminPassword error", err);
    return false;
  }
}
