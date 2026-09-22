import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

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
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const {
    student_id,
    topic_ids,
    chapter_ids,
    paper_ids,
    standard_ids,
    limit,
    time_minutes,
    negative_mark,
  } = req.body || {};

  if (!student_id) {
    return res.status(400).json({ error: "student_id is required" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res
      .status(500)
      .json({ error: "Supabase configuration environment variables are missing" });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          "x-user-id": student_id,
        },
      },
    });

    const { data: questions, error } = await supabaseAdmin.rpc("start_practice_exam", {
      p_topic_ids: topic_ids || [],
      p_chapter_ids: chapter_ids || [],
      p_paper_ids: paper_ids || [],
      p_standard_ids: standard_ids || null,
      p_limit: limit || 25,
      p_time_minutes: time_minutes || 30,
      p_negative_mark: negative_mark || 0.25,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ questions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
