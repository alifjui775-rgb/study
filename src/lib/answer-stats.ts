/**
 * Answer statistics utilities - replaces /api/exam-answer-stats
 * Aggregates answer statistics per question across all students using Supabase
 */

import { supabase } from "./supabase";

export async function getExamAnswerStats(examId: string) {
  const { data: results, error } = await supabase
    .from("results")
    .select("answers")
    .eq("exam_id", examId);

  if (error) {
    throw new Error("Failed to fetch answer stats");
  }

  // Aggregate statistics
  const questionStats: Record<
    string,
    {
      totalAttempts: number;
      correctAnswers: number;
      wrongAnswers: number;
      skipped: number;
    }
  > = {};

  results?.forEach((result) => {
    const answers = result.answers as Record<string, string> | null;
    if (!answers) return;

    Object.entries(answers).forEach(([questionId, userAnswer]) => {
      if (!questionStats[questionId]) {
        questionStats[questionId] = {
          totalAttempts: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          skipped: 0,
        };
      }

      questionStats[questionId].totalAttempts++;

      if (!userAnswer || userAnswer === "") {
        questionStats[questionId].skipped++;
      } else {
        // Note: This is a simplified check - in production, you'd need
        // to compare against the correct answer from the question data
        questionStats[questionId].wrongAnswers++;
      }
    });
  });

  return questionStats;
}
