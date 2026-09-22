import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Polyfill no-op WebSocket for Node.js < 22 where native WebSocket is unavailable.
// Each serverless invocation is isolated, so global mutation is safe.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as any).WebSocket = class {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 3;
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Get code from request body
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Authorization code is required" });
  }

  // Read configuration from environment variables
  const clientId = process.env.VITE_MNR_CLIENT_ID;
  const clientSecret = process.env.MNR_CLIENT_SECRET;
  const redirectPath = process.env.VITE_MNR_REDIRECT_URI;

  // Rebuild the absolute redirect URI from the incoming request so it always
  // matches the origin the browser actually used (production, preview or local dev)
  const pickHeader = (value?: string | string[]) =>
    (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim();
  const host = pickHeader(req.headers["x-forwarded-host"]) ?? pickHeader(req.headers.host);
  const isLocalHost =
    /^(localhost|127\.|::1|\[::1\]|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host ?? "");
  const proto = pickHeader(req.headers["x-forwarded-proto"]) ?? (isLocalHost ? "http" : "https");
  const tokenUrl = "https://id.mnr.bd/api/oauth/token";
  const userinfoUrl = "https://id.mnr.bd/api/oauth/userinfo";

  if (!clientId || !clientSecret || !redirectPath || !host) {
    return res.status(500).json({ error: "SSO configuration environment variables are missing" });
  }

  const redirectUri = new URL(redirectPath, `${proto}://${host}`).toString();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res
      .status(500)
      .json({ error: "Supabase configuration environment variables are missing" });
  }

  try {
    // 1. OAuth Code Exchange with MNR ID Server
    // Try application/x-www-form-urlencoded first (standard OAuth2 RFC 6749)
    let tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    let responseText = await tokenResponse.text();
    let tokenData: any = null;

    try {
      tokenData = JSON.parse(responseText);
    } catch {
      tokenData = null;
    }

    // Fallback to application/json if x-www-form-urlencoded didn't return a valid user payload
    if (!tokenResponse.ok || !tokenData || (!tokenData.user && !tokenData.access_token)) {
      const jsonResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const jsonResponseText = await jsonResponse.text();
      try {
        const jsonTokenData = JSON.parse(jsonResponseText);
        if (
          jsonResponse.ok &&
          jsonTokenData &&
          (jsonTokenData.user || jsonTokenData.access_token)
        ) {
          tokenResponse = jsonResponse;
          responseText = jsonResponseText;
          tokenData = jsonTokenData;
        }
      } catch {
        // Keep initial responseText if JSON attempt also fails
      }
    }

    if (!tokenData) {
      console.error("SSO Token Exchange returned non-JSON response:", responseText);
      return res.status(500).json({
        error: `MNR ID সার্ভার থেকে সার্ভিস ফিডব্যাক পাওয়া যায়নি (${tokenResponse.status}): ${responseText.slice(0, 150)}`,
      });
    }

    if (!tokenResponse.ok || tokenData.error) {
      const errMsg = tokenData.error_description || tokenData.error || responseText;
      return res.status(500).json({ error: `SSO Token exchange failed: ${errMsg}` });
    }

    // 1b. If the token response contains an access_token but no user object,
    //     fetch user info from the userinfo endpoint.
    let mnrUser = tokenData.user;
    if (!mnrUser && tokenData.access_token) {
      const userinfoResponse = await fetch(userinfoUrl, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
        },
      });
      if (userinfoResponse.ok) {
        try {
          mnrUser = await userinfoResponse.json();
        } catch {
          mnrUser = null;
        }
      }
    }

    if (!mnrUser) {
      return res.status(500).json({ error: "SSO response did not contain user object" });
    }

    const mnr_id = mnrUser.id || mnrUser.sub || mnrUser.mnr_id;
    const name = mnrUser.name;
    const email = mnrUser.email;
    const avatar_url = mnrUser.avatar || mnrUser.picture || mnrUser.avatar_url || null;

    if (!mnr_id || !name || !email) {
      return res
        .status(500)
        .json({ error: "SSO user payload is missing required fields (id/sub, name, email)" });
    }

    // 2. Database Sync using Service Role Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Check if user already exists
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from("study_user")
      .select("*")
      .eq("mnr_id", mnr_id)
      .maybeSingle();

    if (findError) {
      return res.status(500).json({ error: `Database query error: ${findError.message}` });
    }

    let dbUser;
    if (existingUser) {
      // Update name, email, avatar_url - preserve boolean flags
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from("study_user")
        .update({
          name,
          email,
          avatar_url,
        })
        .eq("mnr_id", mnr_id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: `Failed to update user: ${updateError.message}` });
      }
      dbUser = updatedUser;
    } else {
      // Insert new user
      const { data: insertedUser, error: insertError } = await supabaseAdmin
        .from("study_user")
        .insert({
          mnr_id,
          name,
          email,
          avatar_url,
          is_admin: false,
          is_instructor: false,
          is_qb_user: false,
        })
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ error: `Failed to insert user: ${insertError.message}` });
      }
      dbUser = insertedUser;
    }

    // 3. Auto-Student Creation (study_student)
    const { error: studentError } = await supabaseAdmin
      .from("study_student")
      .upsert({ id: dbUser.id }, { onConflict: "id", ignoreDuplicates: true });

    if (studentError) {
      return res
        .status(500)
        .json({ error: `Failed to ensure student record: ${studentError.message}` });
    }

    // 4. Return final user record
    return res.status(200).json({
      user: {
        uid: dbUser.id, // map id to uid for compatibility with frontend User type
        name: dbUser.name,
        email: dbUser.email,
        avatar_url: dbUser.avatar_url,
        mnr_id: dbUser.mnr_id,
        is_admin: dbUser.is_admin,
        is_instructor: dbUser.is_instructor,
        is_qb_user: dbUser.is_qb_user,
        created_at: dbUser.created_at || new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("SSO Callback Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
