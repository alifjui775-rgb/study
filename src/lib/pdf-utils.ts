/**
 * PDF generation utilities - replaces /api/generate-results-pdf and /api/generate-reports-pdf
 * Uses browser's print-to-PDF functionality instead of server-side PDF generation
 */

import { supabase } from "./supabase";

export async function generateResultsPdfHtml(userId: string, batchId: string, examId: string) {
  // Fetch data from Supabase directly
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("uid", userId)
    .single();

  if (userError || !user) {
    throw new Error("User not found");
  }

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*")
    .is("deleted_at", null)
    .eq("id", examId)
    .single();

  if (examError || !exam) {
    throw new Error("Exam not found");
  }

  const { data: results, error: resultsError } = await supabase
    .from("results")
    .select("*")
    .eq("user_id", userId)
    .eq("exam_id", examId);

  if (resultsError) {
    throw new Error("Failed to fetch results");
  }

  // Generate HTML for printing
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ফলাফল - ${user.name}</title>
      <style>
        body { font-family: 'Solaiman Lipi', sans-serif; padding: 20px; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
      </style>
    </head>
    <body>
      <h1>পরীক্ষার ফলাফল</h1>
      <p><strong>নাম:</strong> ${user.name}</p>
      <p><strong>রোল:</strong> ${user.roll}</p>
      <p><strong>পরীক্ষা:</strong> ${exam.name}</p>
      <table>
        <tr><th>মেট্রিক</th><th>মান</th></tr>
        <tr><td>প্রাপ্ত নম্বর</td><td>${results?.[0]?.marks_obtained || 0}</td></tr>
      </table>
    </body>
    </html>
  `;

  return html;
}

export function printToPdf() {
  window.print();
}
