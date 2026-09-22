import { useQuery } from "@tanstack/react-query";
import { CircleHelp, Check } from "lucide-react";
import { fetchMarkDistributionsByUnit } from "@/lib/unit-marks-queries";
import { toBanglaNumber } from "@/lib/date-utils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { SubjectFormValues, TargetGroupFormValues } from "@/lib/unit-marks-types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface UnitMarksDistributionProps {
  unitId: string;
}

export function UnitMarksDistribution({ unitId }: UnitMarksDistributionProps) {
  const {
    data: distributions,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["unit-marks-distribution", unitId],
    queryFn: () => fetchMarkDistributionsByUnit(unitId),
    enabled: !!unitId,
  });

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !distributions || distributions.length === 0) {
    return (
      <div className="border border-slate-200/80 rounded-xl p-6 mt-2.5 text-base text-slate-500 text-center font-bengali bg-slate-50/50">
        এই ইউনিটের মানবণ্টন তথ্য পাওয়া যায়নি।
      </div>
    );
  }

  const renderSubjectMarks = (sub: SubjectFormValues) => {
    const parts: string[] = [];
    if (sub.mcq != null) parts.push(`MCQ: ${toBanglaNumber(sub.mcq)}`);
    if (sub.written != null) {
      parts.push(`লিখিত: ${toBanglaNumber(sub.written)}`);
    }
    if (sub.total_marks != null) {
      parts.push(`মোট: ${toBanglaNumber(sub.total_marks)}`);
    }
    if (sub.pass_marks != null) {
      parts.push(`পাস: ${toBanglaNumber(sub.pass_marks)}`);
    }
    if (parts.length === 0) return null;
    return <span className="text-xs text-slate-400 font-normal ml-1">({parts.join(", ")})</span>;
  };

  return (
    <div className="space-y-6 mt-4">
      {distributions.map((dist) => {
        const marksDetails: string[] = [];
        if (dist.mcq_marks != null && dist.mcq_marks > 0) {
          marksDetails.push(`MCQ: ${toBanglaNumber(dist.mcq_marks)}`);
        }
        if (dist.written_marks != null && dist.written_marks > 0) {
          marksDetails.push(`লিখিত: ${toBanglaNumber(dist.written_marks)}`);
        }
        if (dist.other_marks != null && dist.other_marks > 0) {
          const type = dist.other_marks_type || "অন্যান্য";
          marksDetails.push(`${type}: ${toBanglaNumber(dist.other_marks)}`);
        }

        const rulesList = (dist.subject_selection_rules || []) as TargetGroupFormValues[];

        return (
          <div key={dist.id} className="space-y-2.5">
            {/* Section 1: Summary Box */}
            <div className="border border-border rounded-xl p-4 text-base font-bengali bg-card text-foreground">
              {dist.total_marks != null && (
                <div>
                  ● <b>মোট নাম্বার:</b> {toBanglaNumber(dist.total_marks)} নাম্বার
                  {(marksDetails.length > 0 || dist.total_time) && (
                    <hr className="my-1 border-border/50" />
                  )}
                </div>
              )}

              {marksDetails.length > 0 && (
                <div>
                  ● <b>মান বণ্টন:</b> {marksDetails.join(", ")}
                  {dist.total_time && <hr className="my-1 border-border/50" />}
                </div>
              )}

              {dist.total_time != null && (
                <div>
                  ● <b>মোট সময়:</b> {toBanglaNumber(dist.total_time)} ঘণ্টা
                </div>
              )}

              {dist.general_note && (
                <div className="text-xs sm:text-sm text-muted-foreground border-t border-border pt-3 mt-3 leading-relaxed whitespace-pre-line">
                  {dist.general_note}
                </div>
              )}
            </div>

            {/* Section 2: Dynamic Subject Selection Rules */}
            {rulesList.length > 0 && (
              <div className="space-y-2.5">
                {rulesList.map((group, groupIdx) => (
                  <Accordion key={groupIdx} type="single" collapsible className="w-full">
                    <AccordionItem
                      value={`group-${groupIdx}`}
                      className="border border-border rounded-lg bg-card hover:bg-accent/50"
                    >
                      <AccordionTrigger className="p-3 text-base font-bold hover:no-underline">
                        <div className="flex items-center font-bengali text-foreground text-left">
                          <CircleHelp className="inline-block mr-2 h-5 w-5 text-muted-foreground shrink-0" />
                          <span>{group.target_group} বিভাগে কোন কোন বিষয় দাগাতে হবে?</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 text-base font-bengali text-left leading-relaxed font-normal text-slate-700 dark:text-slate-300 space-y-4">
                        <div>
                          <strong>
                            =&gt; মোট {toBanglaNumber(group.total_subjects_to_answer)}টি বিষয় দাগাতে
                            হবে।
                          </strong>
                        </div>

                        {group.rules && group.rules.length > 0 && (
                          <div className="space-y-4">
                            {group.rules.map((rule, ruleIdx) => (
                              <div key={ruleIdx} className="space-y-2">
                                {/* Rule title & note */}
                                <div className="font-bold text-foreground text-sm sm:text-base font-bengali flex items-start gap-1">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    ✓
                                  </span>
                                  <span>{rule.title} -</span>
                                </div>

                                {/* Subjects list */}
                                {rule.subjects && rule.subjects.length > 0 && (
                                  <ul className="pl-6 space-y-1 text-sm sm:text-base text-slate-600 dark:text-slate-400 font-bengali">
                                    {rule.subjects.map((sub, subIdx) => (
                                      <li key={subIdx} className="flex items-center gap-2">
                                        <span className="text-muted-foreground/60 text-xs font-normal">
                                          ○
                                        </span>
                                        <span>
                                          {sub.name}
                                          {renderSubjectMarks(sub)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {rule.note && (
                                  <p className="text-xs sm:text-sm text-muted-foreground font-bengali leading-normal">
                                    ({rule.note})
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
