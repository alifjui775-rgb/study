export interface Question {
  id?: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  option5?: string;
  answer: string | number;
  explanation?: string;
  type: string;
  section: string;
  file_id?: string;
}

export interface RawQuestion {
  id?: string;
  uid?: string;
  question?: string;
  question_text?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  option5?: string;
  answer?: string | number;
  correct?: string | number;
  explanation?: string;
  type?: string;
  section?: string;
  file_id?: string;
  [key: string]: unknown;
}

export async function fetchQuestions(fileId?: string | number): Promise<RawQuestion[]> {
  // Use the new CSV API directly from the client
  const { fetchQuestions: apiFetchQuestions } = await import("./csv-api");

  const result = await apiFetchQuestions(String(fileId || ""));

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch questions");
  }

  return result.data.questions as RawQuestion[];
}
