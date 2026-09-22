import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BulkQuestionList from "@/components/BulkQuestionList";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

export default function ExamQuestionsPage() {
  const params = useParams();
  const exam_id = params.exam_id as string;

  const [questions, setQuestions] = useState<any[]>([]);
  const [examName, setExamName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!exam_id) return;

    const load = async () => {
      try {
        // Fetch exam info
        const { data: examData, error: examErr } = await supabase
          .from("exams")
          .select("name")
          .is("deleted_at", null)
          .eq("id", exam_id)
          .single();

        if (!examErr && examData) {
          setExamName(examData.name || undefined);
        }

        // Fetch linked MCQ IDs
        const { data: linkedData, error: linkedErr } = await supabase
          .from("exam_questions")
          .select("mcq_id")
          .eq("exam_id", exam_id);

        if (linkedErr) throw linkedErr;

        const ids = (linkedData || []).map((d) => d.mcq_id).filter(Boolean) as string[];

        if (ids.length === 0) {
          setQuestions([]);
          return;
        }

        // Fetch full question data
        const { data: questionsData, error: qErr } = await supabase
          .from("questions_mcq")
          .select(`
            id, question, question_image, explanation, explanation_image, type_id,
            question_options (id, option_text, option_image, is_correct),
            curriculum_papers (name_bn),
            paper_chapters (name)
          `)
          .in("id", ids)
          .order("created_at", { ascending: false });

        if (qErr) throw qErr;

        // Transform to RawQuestion format for BulkQuestionList
        const transformed = (questionsData || []).map((q: any) => {
          const opts = Array.isArray(q.question_options)
            ? q.question_options.sort((a: any, b: any) => {
                const ai = a.option_image?.length ? 0 : 1;
                const bi = b.option_image?.length ? 0 : 1;
                return ai - bi;
              })
            : [];

          const correctIdx = opts.findIndex((o: any) => o.is_correct);
          const correctLetter = correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : "";

          return {
            id: q.id,
            question: q.question || "",
            question_text: q.question || "",
            question_image: q.question_image || [],
            option1: opts[0]?.option_text || "",
            option2: opts[1]?.option_text || "",
            option3: opts[2]?.option_text || "",
            option4: opts[3]?.option_text || "",
            option5: opts[4]?.option_text || "",
            option1_image: opts[0]?.option_image || [],
            option2_image: opts[1]?.option_image || [],
            option3_image: opts[2]?.option_image || [],
            option4_image: opts[3]?.option_image || [],
            option5_image: opts[4]?.option_image || [],
            answer: correctLetter,
            explanation: q.explanation || "",
            explanation_image: q.explanation_image || [],
            paper: q.curriculum_papers?.name_bn || "",
            chapter: q.paper_chapters?.name || "",
          };
        });

        setQuestions(transformed);
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, [exam_id]);

  return (
    <div className="container mx-auto p-2 md:p-4 space-y-6">
      <BulkQuestionList questions={questions} examName={examName} />
    </div>
  );
}
