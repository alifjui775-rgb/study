/**
 * API client for proxying requests to the external CSV API.
 * Replaces the Next.js API routes with direct client-side calls.
 */

const CSV_API_ENTRY =
  (import.meta.env.VITE_CSV_API_BASE_URL || "https://csv.mnr.world").replace(/\/$/, "") +
  "/api/index.php";
const API_KEY = import.meta.env.VITE_CSV_API_KEY || "";
if (!API_KEY) {
  throw new Error("Missing VITE_CSV_API_KEY in environment");
}

// Helper to make CSV API URLs with consistent parameter order
function buildCsvUrl(routeName: string, params: Record<string, string | undefined>) {
  let u = `${CSV_API_ENTRY}?route=${routeName}`;

  const order = ["id", "file_id"];
  for (const k of order) {
    const v = params[k];
    if (v) u += `&${k}=${encodeURIComponent(v)}`;
  }

  Object.keys(params)
    .filter((k) => !order.includes(k))
    .sort()
    .forEach((k) => {
      const v = params[k];
      if (v) u += `&${k}=${encodeURIComponent(v)}`;
    });

  u += `&token=${encodeURIComponent(API_KEY)}`;
  return u;
}

interface RawQuestion {
  id: string;
  file_id: string;
  question_text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  option5: string;
  answer: string;
  explanation: string;
  type: string;
  section: string;
  order_index: string;
  created_at: string;
  [key: string]: unknown;
}

export async function fetchQuestions(fileId: string) {
  try {
    const url = buildCsvUrl("questions", { file_id: fileId || undefined });

    console.log(`[FETCH-QUESTIONS] Fetching from: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Course-MNR-World-Backend/2.0",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[FETCH-QUESTIONS] Non-OK:", response.status, errorBody);
      return {
        success: false,
        message: `API fetch failed (${response.status})`,
      };
    }

    const raw = await response.json();
    if (!Array.isArray(raw)) {
      return { success: false, message: "Unexpected API response shape" };
    }

    const transformed = raw.map((q: RawQuestion) => ({
      id: q.id,
      file_id: q.file_id,
      question: q.question_text || "",
      question_text: q.question_text || "",
      options: [q.option1, q.option2, q.option3, q.option4, q.option5].filter(
        (o) => o && o.trim() !== "",
      ),
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      option5: q.option5,
      correct: q.answer,
      answer: q.answer,
      explanation: q.explanation || "",
      type: q.type,
      section: q.section,
      order_index: q.order_index,
      created_at: q.created_at,
    }));

    return {
      success: true,
      data: { questions: transformed, total: transformed.length },
    };
  } catch (error) {
    console.error("[FETCH-QUESTIONS] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
}

export async function fetchFileMetadata(fileId: string) {
  try {
    const url = buildCsvUrl("file", { id: fileId || undefined });

    console.log(`[FETCH-FILE] Fetching from: ${url}`);

    const response = await fetch(url, {
      headers: { "User-Agent": "Course-MNR-World-Backend/2.0" },
    });

    if (!response.ok) {
      return { success: false, message: `Failed (${response.status})` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[FETCH-FILE] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
}
