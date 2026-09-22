import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dayjs from "@/lib/date-utils";
import LatexRenderer from "@/components/LatexRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { markdownToSafeHtml } from "@/lib/markdown";
import katexCss from "katex/dist/katex.min.css?inline";

type QuestionData = {
  id?: string;
  question?: string;
  question_text?: string;
  question_image?: string[];
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  option5?: string;
  option1_image?: string[];
  option2_image?: string[];
  option3_image?: string[];
  option4_image?: string[];
  option5_image?: string[];
  answer?: string | number;
  explanation?: string;
  explanation_image?: string[];
  options?: string[];
  [key: string]: unknown;
};

type Props = {
  questions: QuestionData[] | null;
  examName?: string;
};

function renderImages(images: string[] | undefined | null, maxH = "max-h-48") {
  if (!images || images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {images.map((img, idx) => (
        <img
          key={idx}
          src={img}
          alt="Question"
          className={`${maxH} rounded-md border object-contain`}
        />
      ))}
    </div>
  );
}

function buildOptionHtml(optText: string, optImages: string[] | undefined, idx: number) {
  const letter = String.fromCharCode(65 + idx);
  let html = `<div style='margin-bottom:8px;'><strong>${letter}.</strong> ${optText || ""}</div>`;
  if (optImages && optImages.length > 0) {
    optImages.forEach((img) => {
      html += `<img src="${img}" style='max-height:180px; margin-top:6px; border-radius:4px; border:1px solid #e5e7eb;' />`;
    });
  }
  return html;
}

export default function BulkQuestionList({ questions, examName }: Props) {
  const [mode, setMode] = React.useState<"question" | "solution">("solution");

  const buildPrintableHtml = (printMode: "question" | "solution") => {
    if (!questions || questions.length === 0) return "";

    const questionsHtml = (questions || [])
      .map((q, idx) => {
        const qText = (q.question || q.question_text || "").replace(/<img/g, '<img class="qimg"');
        const qImages = (q as QuestionData).question_image || [];

        const optsCandidate = (q as Record<string, unknown>).options;
        const optsTexts: string[] = Array.isArray(optsCandidate)
          ? (optsCandidate as string[]).map(String)
          : [q.option1, q.option2, q.option3, q.option4, q.option5].filter((o): o is string =>
              Boolean(o),
            );
        const optsImages = [
          (q as QuestionData).option1_image,
          (q as QuestionData).option2_image,
          (q as QuestionData).option3_image,
          (q as QuestionData).option4_image,
          (q as QuestionData).option5_image,
        ];

        const answer =
          typeof q.answer === "number"
            ? String.fromCharCode(65 + Number(q.answer))
            : String(q.answer || "");
        const explanationHtml = markdownToSafeHtml(q.explanation);
        const explanationImages = (q as QuestionData).explanation_image || [];

        const questionImagesHtml =
          qImages.length > 0
            ? qImages
                .map(
                  (img) =>
                    `<img src="${img}" style='max-height:240px; margin-top:8px; border-radius:4px; border:1px solid #e5e7eb;' />`,
                )
                .join("")
            : "";

        const optionsHtml = optsTexts.map((o, i) => buildOptionHtml(o, optsImages[i], i)).join("");

        const answerHtml =
          printMode === "solution"
            ? `<div style='margin-top: 12px; padding: 8px; background-color: #f3f4f6; border-radius: 4px; border: 1px solid #e5e7eb;'><strong style='color: #374151'>উত্তর:</strong> <span style='font-weight: bold; color: #059669'>${answer}</span></div>`
            : "";

        const explanationImagesHtml =
          explanationImages.length > 0
            ? explanationImages
                .map(
                  (img) =>
                    `<img src="${img}" style='max-height:240px; margin-top:8px; border-radius:4px; border:1px solid #e5e7eb;' />`,
                )
                .join("")
            : "";

        const explanationBlock =
          printMode === "solution" && (explanationHtml || explanationImagesHtml)
            ? `<div style='margin-top: 8px; padding: 8px; background-color: #fffbeb; border-radius: 4px; border: 1px solid #fde68a;'><strong style='color: #78350f'>ব্যাখ্যা:</strong><div style='margin-top: 4px; color: #92400e'>${explanationHtml}${explanationImagesHtml}</div></div>`
            : "";

        return `
          <div style='page-break-inside: avoid; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #d1d5db'>
            <div style='margin-bottom: 8px'>
              <strong style='font-size: 16px'>প্রশ্ন ${idx + 1}.</strong>
              <div style='margin-top: 4px; font-size: 15px'>${qText}</div>
              ${questionImagesHtml}
            </div>
            <div style='margin-top: 12px; margin-left: 12px'>${optionsHtml}</div>
            ${answerHtml}
            ${explanationBlock}
          </div>
        `;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html lang="bn">
        <head>
          <meta charset='UTF-8' />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${examName || "সকল প্রশ্ন"}</title>
          <style>${katexCss}</style>
          <style>
            body {
              font-family: 'Solaiman Lipi', Arial, sans-serif; 
              padding: 40px; 
              color: #111827; 
              line-height: 1.6;
              position: relative;
              background-color: white;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              z-index: -1;
              opacity: 0.03;
              width: 70%;
            }
            .container { max-width: 850px; margin: 0 auto }
            .header-box { 
              text-align: center; 
              margin-bottom: 40px; 
              padding: 30px;
              border: 2px solid #1f2937;
              border-radius: 12px;
              background-color: #f9fafb;
            }
            .header-box h1 { margin: 0; font-size: 26px; color: #111827; font-weight: bold; }
            .header-info { 
              display: flex; 
              justify-content: center; 
              gap: 30px; 
              margin-top: 15px; 
              font-size: 14px; 
              color: #4b5563;
              font-weight: 500;
            }
            .footer { 
              text-align: center; 
              font-size: 11px; 
              color: #9ca3af; 
              margin-top: 40px; 
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .qimg {
              display: block;
              margin: 10px 0;
              max-width: 100%;
              height: auto;
              border-radius: 4px;
            }
            @media print { 
              body { padding: 20px } 
              .container { max-width: 100% } 
              .header-box { background-color: transparent !important; }
              .no-print { display: none; }
            }
          </style>
          <!-- KaTeX is rendered at parse time (local katex@0.18.4) into the HTML above; only the stylesheet is needed here. -->
        </head>
        <body>
          <div class="watermark">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 171.000002">
              <path fill="#f41212" d="M149.06 94.19 76.86 94.36l14.84 25.57 98.12-.22-68.58-118.16-19.41 11.26 47.23 81.38Z"/>
              <path fill="#009f0b" d="m2.14 50.25 68.58 118.16 19.42-11.26-47.23-81.41 72.2-0.16-14.84-25.57-98.12.22Z"/>
            </svg>
          </div>
          <div class="container">
            <div class="header-box">
              <h1>${examName || "পরীক্ষার প্রশ্ন ও সমাধান"}</h1>
              <div class="header-info">
                <span>মোট প্রশ্ন: <strong>${questions.length} টি</strong></span>
                <span>তারিখ: <strong>${dayjs().format("DD MMMM, YYYY")}</strong></span>
              </div>
            </div>
            ${questionsHtml}
            <div class="footer">
              <p style="font-weight: bold; margin-bottom: 4px;">MNR Exam — আপনার চূড়ান্ত পরীক্ষার প্রস্তুতি সঙ্গী</p>
              <p>Generated on: ${dayjs().format("DD MMMM, YYYY hh:mm A")}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintMode = (printMode: "question" | "solution") => {
    if (!questions || questions.length === 0) return;

    const html = buildPrintableHtml(printMode);
    try {
      const newWin = window.open("", "_blank");
      if (!newWin) {
        alert("Pop-up blocked! Please allow pop-ups to print.");
        return;
      }

      newWin.document.write(html);
      newWin.document.close();

      newWin.focus();
      setTimeout(() => {
        try {
          newWin.print();
        } catch (err) {
          console.error("Print failed:", err);
        }
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  };

  const getOptionImages = (q: QuestionData, idx: number): string[] | undefined => {
    const map: Record<number, string[] | undefined> = {
      0: q.option1_image,
      1: q.option2_image,
      2: q.option3_image,
      3: q.option4_image,
      4: q.option5_image,
    };
    return map[idx];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex gap-2 items-center">
          <Button
            variant={mode === "question" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("question")}
          >
            শুধু প্রশ্ন
          </Button>
          <Button
            variant={mode === "solution" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("solution")}
          >
            সমাধান
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePrintMode("question")}>
            প্রশ্ন প্রিন্ট
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePrintMode("solution")}>
            সমাধানসহ প্রিন্ট
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">({questions?.length || 0} টি প্রশ্ন)</div>
      </div>

      <div
        className={cn(
          "prose dark:prose-invert max-w-none p-4 rounded-md border space-y-6 bg-card text-card-foreground",
        )}
      >
        {questions && questions.length > 0 ? (
          questions.map((q, idx) => (
            <div key={q.id || idx} className="border-b pb-6 last:border-b-0">
              <div className="mb-3">
                <strong className="text-lg">প্রশ্ন {idx + 1}.</strong>
                <div className="mt-2">
                  <LatexRenderer
                    html={(q.question || q.question_text || "").replace(
                      /<img/g,
                      '<img class="qimg"',
                    )}
                  />
                </div>
                {renderImages(q.question_image)}
              </div>

              {(() => {
                const optsCandidate = (q as Record<string, unknown>).options;
                const optsArr: string[] = Array.isArray(optsCandidate)
                  ? (optsCandidate as string[]).map(String)
                  : [q.option1, q.option2, q.option3, q.option4, q.option5].filter(
                      (o): o is string => Boolean(o),
                    );
                if (!optsArr || optsArr.length === 0) return null;
                return (
                  <div className="mt-3 space-y-2 ml-4">
                    {optsArr.map((opt: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="font-semibold">{String.fromCharCode(65 + i)}.</div>
                        <div className="flex-1">
                          <LatexRenderer html={String(opt)} />
                          {renderImages(getOptionImages(q, i), "max-h-32")}
                        </div>
                      </div>
                    ))}

                    {mode === "solution" && (
                      <>
                        <div className="mt-3 pt-3 border-t text-sm">
                          <strong className="text-success">উত্তর:</strong>
                          <span className="ml-2 font-bold">
                            {typeof q.answer === "number"
                              ? String.fromCharCode(65 + Number(q.answer))
                              : String(q.answer)}
                          </span>
                        </div>

                        {(q.explanation ||
                          (q.explanation_image && q.explanation_image.length > 0)) && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-md">
                            <strong>ব্যাখ্যা:</strong>
                            <div className="mt-1 text-sm">
                              <MarkdownRenderer content={q.explanation} />
                              {renderImages(q.explanation_image)}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">কোনো প্রশ্ন নেই</p>
        )}
      </div>
    </div>
  );
}
