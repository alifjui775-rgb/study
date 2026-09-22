// =============================================================================
// DynamicAdmissionInfo — Full admission info card matching legacy layout
// Has sub-sections: আবেদন, প্রবেশপত্র, পরীক্ষার সময়কাল, কেন্দ্র, মানবণ্টন, ফলাফল
// =============================================================================

import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import type {
  UnitWithDetails,
  UniversityGeneralInfo,
  University,
  ApplicationDetail,
  AdmitCardDetail,
  UnitRequirement,
  Batch,
  DynamicNote,
} from "@/lib/university-types";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { UnitMarksDistribution } from "@/components/university/UnitMarksDistribution";
import {
  FilePenLine,
  CalendarClock,
  Banknote,
  Link2,
  PackageCheck,
  CircleAlert,
  CircleCheck,
  Monitor,
  Timer,
  MapPinned,
  ChevronRight,
  ListChecks,
  BarChart3,
  CircleHelp,
  SquareArrowOutUpRight,
  MapPin,
  Info,
  Map as LucideMap,
} from "lucide-react";

interface Props {
  units: UnitWithDetails[];
  generalInfo: UniversityGeneralInfo[];
  university?: University | null;
  dynamicNotes?: DynamicNote[];
  availableBatches?: Batch[];
  selectedBatchFilter?: string;
}

const formatUnitName = (name: string): string => {
  let clean = name.trim();
  // Strip outer quotes if doubled/extra (e.g. ""ক" ইউনিট" -> "ক" legacy)
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.slice(1, -1);
  }

  // Lowercase representation for checks
  const lower = clean.toLowerCase();
  const isInstitute =
    lower.includes("আইবিএ") ||
    lower.includes("iba") ||
    lower.includes("আইআইটি") ||
    lower.includes("iit") ||
    lower.includes("আইইআর") ||
    lower.includes("ier") ||
    lower.includes("ইনস্টিটিউট") ||
    lower.includes("institute");

  if (isInstitute) {
    return `"${clean}"`;
  }

  if (clean.includes("ইউনিট")) {
    return clean;
  }
  return `"${clean}"  ইউনিট`;
};

const joinUnitNames = (names: string[]): string => {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];

  const allEndWithUnit = names.every((n) => /\s*ইউনিট\s*$/.test(n));
  if (allEndWithUnit) {
    const stripped = names.map((n) => n.replace(/\s*ইউনিট\s*$/, "").trim());
    if (stripped.length === 2) {
      return `${stripped[0]} ও ${stripped[1]}  ইউনিট`;
    }
    return `${stripped.slice(0, -1).join(", ")} ও ${stripped[stripped.length - 1]}  ইউনিট`;
  }

  if (names.length === 2) {
    return `${names[0]} ও ${names[1]}`;
  }
  return `${names.slice(0, -1).join(", ")} ও ${names[names.length - 1]}`;
};

const getUnitHeaderName = (unitName: string): string => {
  const clean = unitName.replace(/["'”]/g, "").trim();
  const base = clean.replace(/(unit|ইউনিট)$/i, "").trim();
  return `"${base}"  ইউনিট`;
};

const getRequirementKey = (req: any): string => {
  return JSON.stringify({
    ssc_year_min: req.ssc_year_min,
    ssc_year_max: req.ssc_year_max,
    hsc_year_min: req.hsc_year_min,
    hsc_year_max: req.hsc_year_max,
    ssc_min_gpa: req.ssc_min_gpa,
    hsc_min_gpa: req.hsc_min_gpa,
    total_min_gpa: req.total_min_gpa,
    ssc_min_gpa_without_4th: req.ssc_min_gpa_without_4th,
    hsc_min_gpa_without_4th: req.hsc_min_gpa_without_4th,
    total_min_gpa_without_4th: req.total_min_gpa_without_4th,
    subject_requirements: req.subject_requirements,
    custom_checks: req.custom_checks,
    requirement_text: req.requirement_text || req.notes || "",
  });
};

const joinGroupNames = (names: string[]): string => {
  const cleanNames = names.map((n) => n.replace(/বিভাগ$/i, "").trim());
  if (cleanNames.length === 0) return "যেকোনো";
  if (cleanNames.length === 1) return cleanNames[0];
  if (cleanNames.length === 2) return `${cleanNames[0]} ও ${cleanNames[1]}`;
  return `${cleanNames.slice(0, -1).join(", ")} ও ${cleanNames[cleanNames.length - 1]}`;
};

const toBnDigits = (v: string | number): string =>
  String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

const formatYearLabel = (
  min: number | null | undefined,
  max: number | null | undefined,
): string => {
  if (min != null && max != null) {
    return min === max ? toBnDigits(min) : `${toBnDigits(min)}-${toBnDigits(max)}`;
  }
  if (min != null) return toBnDigits(min);
  if (max != null) return toBnDigits(max);
  return "";
};

const getGpaText = (req: any): string => {
  const hasWith4th =
    req.ssc_min_gpa != null || req.hsc_min_gpa != null || req.total_min_gpa != null;
  const sscVal = hasWith4th ? req.ssc_min_gpa : req.ssc_min_gpa_without_4th;
  const hscVal = hasWith4th ? req.hsc_min_gpa : req.hsc_min_gpa_without_4th;
  const totalVal = hasWith4th ? req.total_min_gpa : req.total_min_gpa_without_4th;

  if (sscVal == null && hscVal == null && totalVal == null) {
    return "";
  }

  const suffix = hasWith4th ? "চতুর্থ বিষয় সহ" : "চতুর্থ বিষয় ছাড়া";
  const sscYear = formatYearLabel(req.ssc_year_min, req.ssc_year_max);
  const hscYear = formatYearLabel(req.hsc_year_min, req.hsc_year_max);
  const sscPrefix = sscYear ? `${sscYear} সালে ` : "";
  const hscPrefix = hscYear ? `${hscYear} সালে ` : "";
  const parts: string[] = [];

  if (sscVal != null && hscVal != null) {
    if (Number(sscVal) === Number(hscVal)) {
      if (sscYear && sscYear === hscYear) {
        parts.push(`${sscPrefix}SSC ও HSC তে ${suffix} ন্যূনতম GPA-${sscVal}`);
      } else {
        parts.push(`${sscPrefix}SSC ও ${hscPrefix}HSC তে ${suffix} ন্যূনতম GPA-${sscVal}`);
      }
    } else {
      parts.push(
        `${sscPrefix}SSC তে ${suffix} ন্যূনতম GPA-${sscVal} এবং ${hscPrefix}HSC তে ${suffix} ন্যূনতম GPA-${hscVal}`,
      );
    }
  } else {
    if (sscVal != null) {
      parts.push(`${sscPrefix}SSC তে ${suffix} ন্যূনতম GPA-${sscVal}`);
    }
    if (hscVal != null) {
      parts.push(`${hscPrefix}HSC তে ${suffix} ন্যূনতম GPA-${hscVal}`);
    }
  }

  if (totalVal != null) {
    parts.push(`SSC ও HSC মিলে মোট ন্যূনতম GPA-${totalVal}`);
  }

  return parts.join(" এবং ");
};

const renderBatchBadges = (batchNames: (string | undefined | null)[]) => {
  const uniqueNames = Array.from(
    new Set(batchNames.filter((n): n is string => Boolean(n && n.trim()))),
  );
  if (uniqueNames.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 ml-1 align-middle">
      {uniqueNames.map((name) => (
        <Badge
          key={name}
          variant="outline"
          className="font-sans text-[10px] leading-none bg-primary/10 text-primary border-primary/20 font-medium px-1.5 py-0.5 h-4 inline-flex items-center rounded-md"
        >
          {name}
        </Badge>
      ))}
    </span>
  );
};

export default function DynamicAdmissionInfo({
  units,
  generalInfo,
  university,
  dynamicNotes = [],
  availableBatches = [],
  selectedBatchFilter = "all",
}: Props) {
  const { slug: universitySlug } = useParams<{ slug: string }>();
  const [activeUnitId, setActiveUnitId] = useState<string>(units[0]?.id || "");
  const activeUnit = units.find((u) => u.id === activeUnitId);

  // Render helper for Dynamic Notes
  const renderDynamicNotes = (section: string, unitId?: string | null) => {
    const notes = dynamicNotes.filter((note) => {
      const sectionMatch = note.display_section.toLowerCase() === section.toLowerCase();
      if (!sectionMatch) return false;
      if (unitId === null) {
        return !note.unit_id;
      }
      if (unitId) {
        return note.unit_id === unitId;
      }
      return true; // if undefined, return all
    });

    if (notes.length === 0) return null;

    return (
      <div className="space-y-4 my-4">
        {notes.map((note) => {
          const unitObj = units.find((u) => u.id === note.unit_id);
          return (
            <Accordion
              key={note.id}
              type="single"
              collapsible
              defaultValue={note.is_active ? "item" : undefined}
              className="w-full"
            >
              <AccordionItem
                value="item"
                className="border border-border rounded-lg bg-card hover:bg-accent/50"
              >
                <AccordionTrigger className="p-3 text-base font-bold hover:no-underline">
                  <div className="flex items-center font-bengali">
                    <CircleAlert className="inline-block mr-2 h-5 w-5" />
                    <span className="text-left flex items-center gap-2">
                      {note.title}
                      {unitObj && (
                        <Badge
                          variant="outline"
                          className="font-bengali text-[10px] py-0 px-1.5 font-normal"
                        >
                          {unitObj.unit_name_bn}
                        </Badge>
                      )}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 text-base font-bengali whitespace-pre-line text-left leading-relaxed font-normal text-muted-foreground">
                  {note.content}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        })}
      </div>
    );
  };

  const isFiltered = Boolean(selectedBatchFilter && selectedBatchFilter !== "all");

  const selectedBatchObj = useMemo(() => {
    if (!isFiltered) return null;
    if (availableBatches && availableBatches.length > 0) {
      const found = availableBatches.find(
        (b) => b.id === selectedBatchFilter || b.name === selectedBatchFilter,
      );
      if (found) return found;
    }
    const allBatches = units
      .flatMap((u) => [
        ...(u.application_details || []).map((a) => a.batch),
        ...(u.admit_card_details || []).map((a) => a.batch),
        ...(u.result_details || []).map((r) => r.batch),
        ...(u.requirements || []).flatMap((r) =>
          (r.unit_requirement_batches || []).map((b) => b.batch),
        ),
      ])
      .filter((b): b is NonNullable<typeof b> => Boolean(b));
    return (
      allBatches.find((b) => b.id === selectedBatchFilter || b.name === selectedBatchFilter) || null
    );
  }, [units, availableBatches, selectedBatchFilter, isFiltered]);

  const targetYear = useMemo(() => {
    if (!isFiltered) return null;
    if (selectedBatchObj?.year) return selectedBatchObj.year;
    if (selectedBatchFilter.startsWith("batch-")) {
      const parsed = parseInt(selectedBatchFilter.replace("batch-", ""), 10);
      if (!isNaN(parsed)) return parsed;
    }
    if (selectedBatchFilter.includes("26")) return 2026;
    if (selectedBatchFilter.includes("25")) return 2025;
    if (selectedBatchFilter.includes("24")) return 2024;
    return null;
  }, [selectedBatchObj, selectedBatchFilter, isFiltered]);

  const targetId =
    selectedBatchObj?.id || (selectedBatchFilter !== "all" ? selectedBatchFilter : null);
  const targetName =
    selectedBatchObj?.name || (targetYear ? `HSC-${String(targetYear).slice(-2)}` : null);

  const activeBatchBadge =
    targetName || (targetYear ? `HSC-${String(targetYear).slice(-2)}` : null);

  const isMatchBatch = (
    itemBatch?: { id?: string; name?: string; year?: number } | null,
    itemBatchId?: string | null,
  ) => {
    if (!isFiltered) return true;
    if (itemBatchId && targetId && itemBatchId === targetId) return true;
    if (itemBatch?.id && targetId && itemBatch.id === targetId) return true;
    if (itemBatch?.year && targetYear && itemBatch.year === targetYear) return true;
    if (itemBatch?.name && targetName && itemBatch.name.toLowerCase() === targetName.toLowerCase())
      return true;
    return false;
  };

  const filterRequirementsForBatch = (reqs: UnitRequirement[]) => {
    if (!reqs || reqs.length === 0) return [];

    if (isFiltered) {
      return reqs.filter((req) => {
        if (req.unit_requirement_batches && req.unit_requirement_batches.length > 0) {
          return req.unit_requirement_batches.some((b: any) => isMatchBatch(b.batch, b.batch_id));
        }

        if (targetYear) {
          if (req.hsc_year_min != null && req.hsc_year_max != null) {
            return req.hsc_year_min <= targetYear && targetYear <= req.hsc_year_max;
          }
          if (req.hsc_year_min != null) {
            return targetYear >= req.hsc_year_min;
          }
          if (req.hsc_year_max != null) {
            return targetYear <= req.hsc_year_max;
          }
        }

        return false;
      });
    }

    const reqsWithBatches = reqs.filter(
      (r) => r.unit_requirement_batches && r.unit_requirement_batches.length > 0,
    );

    if (reqsWithBatches.length > 0) {
      const hasCurrent = reqsWithBatches.some((r) =>
        r.unit_requirement_batches?.some((b) => b.batch?.is_current === true),
      );
      if (hasCurrent) {
        return reqs.filter((r) => {
          if (!r.unit_requirement_batches || r.unit_requirement_batches.length === 0) return true;
          return r.unit_requirement_batches.some((b) => b.batch?.is_current === true);
        });
      }

      const allYears = reqsWithBatches.flatMap((r) =>
        (r.unit_requirement_batches || []).map((b) => b.batch?.year || 0),
      );
      const maxYear = Math.max(...allYears, 0);
      if (maxYear > 0) {
        return reqs.filter((r) => {
          if (!r.unit_requirement_batches || r.unit_requirement_batches.length === 0) return true;
          return r.unit_requirement_batches.some((b) => (b.batch?.year || 0) === maxYear);
        });
      }
    }

    return reqs;
  };

  // Helper to get unique SSC ranges for a unit
  const getUnitSscRanges = (unit: UnitWithDetails) => {
    const reqs = filterRequirementsForBatch(unit.requirements);
    const ranges = reqs
      .map((r) => {
        if (!r.ssc_year_min && !r.ssc_year_max) return null;
        if (r.ssc_year_min === r.ssc_year_max) return `${r.ssc_year_min}`;
        return `${r.ssc_year_min || ""}-${r.ssc_year_max || ""}`;
      })
      .filter(Boolean) as string[];
    return Array.from(new Set(ranges)).sort();
  };

  // Helper to get unique HSC ranges for a unit
  const getUnitHscRanges = (unit: UnitWithDetails) => {
    const reqs = filterRequirementsForBatch(unit.requirements);
    const ranges = reqs
      .map((r) => {
        if (!r.hsc_year_min && !r.hsc_year_max) return null;
        if (r.hsc_year_min === r.hsc_year_max) return `${r.hsc_year_min}`;
        return `${r.hsc_year_min || ""}-${r.hsc_year_max || ""}`;
      })
      .filter(Boolean) as string[];
    return Array.from(new Set(ranges)).sort();
  };

  // Gather SSC/HSC years for each unit
  const unitBatchInfo = units
    .filter((u) => filterRequirementsForBatch(u.requirements).length > 0)
    .map((unit) => {
      const ssc = getUnitSscRanges(unit);
      const hsc = getUnitHscRanges(unit);
      return {
        unitId: unit.id,
        unitName: formatUnitName(unit.unit_name_bn),
        ssc,
        hsc,
        key: `${ssc.join(",")}|${hsc.join(",")}`,
      };
    })
    .filter((info) => info.ssc.length > 0 || info.hsc.length > 0);

  const allSameBatches =
    unitBatchInfo.length > 0 && new Set(unitBatchInfo.map((info) => info.key)).size === 1;

  // Group unitBatchInfo by key
  const groupedBatchInfoMap = new Map<
    string,
    { ssc: string[]; hsc: string[]; unitNames: string[] }
  >();
  unitBatchInfo.forEach((info) => {
    if (!groupedBatchInfoMap.has(info.key)) {
      groupedBatchInfoMap.set(info.key, { ssc: info.ssc, hsc: info.hsc, unitNames: [] });
    }
    groupedBatchInfoMap.get(info.key)!.unitNames.push(info.unitName);
  });

  const groupedBatchInfoList = Array.from(groupedBatchInfoMap.values()).map((g) => ({
    displayUnitName: joinUnitNames(g.unitNames),
    ssc: g.ssc,
    hsc: g.hsc,
  }));

  // Gather all units and their application details
  const unitApps = units
    .filter((u) => u.application_details && u.application_details.length > 0)
    .map((u) => {
      let app = null;
      if (isFiltered) {
        app = u.application_details.find((a) => isMatchBatch(a.batch, a.batch_id));
      } else {
        app = u.application_details.find((a) => a.batch?.is_current) || u.application_details[0];
      }
      return { unit: u, app };
    })
    .filter((item): item is { unit: UnitWithDetails; app: ApplicationDetail } => Boolean(item.app));

  // Gather application details specifically for fees (with fallback to previous batches if fee is null)
  const unitFeeApps = units
    .filter((u) => u.application_details && u.application_details.length > 0)
    .map((u) => {
      let app = null;
      if (isFiltered) {
        app = u.application_details.find((a) => isMatchBatch(a.batch, a.batch_id) && a.fee != null);
      } else {
        const currentAppWithFee = u.application_details.find(
          (a) => a.batch?.is_current && a.fee != null,
        );
        app =
          currentAppWithFee ||
          u.application_details.find((a) => a.fee != null) ||
          u.application_details[0];
      }
      return { unit: u, app };
    })
    .filter((item): item is { unit: UnitWithDetails; app: ApplicationDetail } =>
      Boolean(item.app && item.app.fee != null),
    );

  // Single active requirement batch name for eligibility badge
  const activeReqBatches = units
    .flatMap((u) => filterRequirementsForBatch(u.requirements))
    .flatMap((r) => r.unit_requirement_batches || [])
    .map((b) => b.batch)
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  const currentReqBatch = activeReqBatches.find((b) => b.is_current === true);
  const fallbackReqBatch =
    !currentReqBatch && activeReqBatches.length > 0
      ? [...activeReqBatches].sort((a, b) => (b.year || 0) - (a.year || 0))[0]
      : null;

  const requirementBatchName = isFiltered
    ? activeBatchBadge
    : currentReqBatch?.name ||
      currentReqBatch?.name_bn ||
      fallbackReqBatch?.name ||
      fallbackReqBatch?.name_bn ||
      unitApps[0]?.app?.batch?.name ||
      unitApps[0]?.app?.batch?.name_bn;

  const activeResultBatches = units
    .flatMap((u) => u.result_details || [])
    .map((r) => r.batch)
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  const currentResultBatch = activeResultBatches.find((b) => b.is_current === true);
  const fallbackResultBatch =
    !currentResultBatch && activeResultBatches.length > 0
      ? [...activeResultBatches].sort((a, b) => (b.year || 0) - (a.year || 0))[0]
      : null;

  const resultBatchName = isFiltered
    ? activeBatchBadge
    : currentResultBatch?.name ||
      currentResultBatch?.name_bn ||
      fallbackResultBatch?.name ||
      fallbackResultBatch?.name_bn ||
      unitApps[0]?.app?.batch?.name ||
      unitApps[0]?.app?.batch?.name_bn;

  // 1. Group dates
  const datesMap = new Map<
    string,
    { start: string | null; end: string | null; units: UnitWithDetails[] }
  >();
  unitApps.forEach(({ unit, app }) => {
    const start = app.start_datetime || null;
    const end = app.end_datetime || null;
    const key = `${start || ""}|${end || ""}`;
    if (!datesMap.has(key)) {
      datesMap.set(key, { start, end, units: [] });
    }
    datesMap.get(key)!.units.push(unit);
  });

  // 2. Fees & payment method
  const feePaymentMethods = Array.from(
    new Set(unitFeeApps.map(({ app }) => app.fee_payment_method?.trim()).filter(Boolean)),
  );
  const hasCommonFeePaymentMethod = feePaymentMethods.length === 1;
  const commonFeePaymentMethod = hasCommonFeePaymentMethod ? feePaymentMethods[0] : null;

  // 3. Group helpful links
  const linksMap = new Map<
    string,
    { links: { label: string; url: string }[]; units: UnitWithDetails[] }
  >();
  unitApps.forEach(({ unit, app }) => {
    const links = app.helpful_links || [];
    if (links.length > 0) {
      const key = JSON.stringify(links);
      if (!linksMap.has(key)) {
        linksMap.set(key, { links, units: [] });
      }
      linksMap.get(key)!.units.push(unit);
    }
  });

  // 4. Group apply URLs
  const applyUrlsMap = new Map<string, UnitWithDetails[]>();
  unitApps.forEach(({ unit, app }) => {
    const url = app.apply_url?.trim() || "";
    if (url) {
      if (!applyUrlsMap.has(url)) {
        applyUrlsMap.set(url, []);
      }
      applyUrlsMap.get(url)!.push(unit);
    }
  });

  // Gather all units and their admit card details
  const admitDetailsList: { admit: AdmitCardDetail; unit: UnitWithDetails }[] = [];
  units.forEach((unit) => {
    if (unit.admit_card_details) {
      unit.admit_card_details.forEach((admit) => {
        if (isMatchBatch(admit.batch, admit.batch_id)) {
          admitDetailsList.push({ admit, unit });
        }
      });
    }
  });

  // 1. Group download periods
  const admitDatesMap = new Map<
    string,
    { start: string | null; end: string | null; units: UnitWithDetails[] }
  >();
  admitDetailsList.forEach(({ admit, unit }) => {
    const start = admit.download_start_datetime || null;
    const end = admit.download_end_datetime || null;
    if (start || end) {
      const key = `${start || ""}|${end || ""}`;
      if (!admitDatesMap.has(key)) {
        admitDatesMap.set(key, { start, end, units: [] });
      }
      admitDatesMap.get(key)!.units.push(unit);
    }
  });

  // 2. Group download URLs
  const admitUrlsMap = new Map<string, { url: string; units: UnitWithDetails[] }>();
  admitDetailsList.forEach(({ admit, unit }) => {
    const url = admit.admit_card_url?.trim() || "";
    if (url) {
      if (!admitUrlsMap.has(url)) {
        admitUrlsMap.set(url, { url, units: [] });
      }
      admitUrlsMap.get(url)!.units.push(unit);
    }
  });

  // 3. Collect unique notes
  const uniqueAdmitNotes = Array.from(
    new Set(admitDetailsList.map(({ admit }) => admit.note?.trim()).filter(Boolean)),
  );

  // Booleans to check if data is present for each sub-section
  const hasApplyNotes = dynamicNotes.some((n) => n.display_section === "Apply");
  const hasAdmitNotes = dynamicNotes.some((n) => n.display_section === "AdmitCard");
  const hasExamNotes = dynamicNotes.some((n) => n.display_section === "ExamDate");
  const hasCenterNotes = dynamicNotes.some((n) => n.display_section === "Location");

  // Group units by identical exam_center_note
  const examCenterGroups = useMemo(() => {
    const map = new Map<string, UnitWithDetails[]>();
    units.forEach((unit) => {
      const note = unit.exam_center_note?.trim() || "";
      if (!note) return;
      if (!map.has(note)) {
        map.set(note, []);
      }
      map.get(note)!.push(unit);
    });
    return Array.from(map.entries()).map(([note, groupUnits]) => ({
      note,
      units: groupUnits,
    }));
  }, [units]);

  const hasMarkNotes = dynamicNotes.some((n) => n.display_section === "MarkDistribution");
  const hasResultNotes = dynamicNotes.some((n) => n.display_section === "Result");

  const unitsWithExams = isFiltered
    ? units.filter((u) => {
        const hasMatchingApp = u.application_details?.some((a) =>
          isMatchBatch(a.batch, a.batch_id),
        );
        return hasMatchingApp && u.exam_schedule;
      })
    : units.filter((u) => u.exam_schedule);

  const hasApplyData =
    unitApps.length > 0 ||
    unitFeeApps.length > 0 ||
    groupedBatchInfoList.length > 0 ||
    units.some((u) => filterRequirementsForBatch(u.requirements).length > 0) ||
    (isFiltered ? false : hasApplyNotes);
  const hasAdmitData =
    admitDatesMap.size > 0 ||
    admitUrlsMap.size > 0 ||
    uniqueAdmitNotes.length > 0 ||
    (isFiltered ? false : hasAdmitNotes);
  const hasExamData = unitsWithExams.length > 0 || (isFiltered ? false : hasExamNotes);
  const hasCenterData =
    examCenterGroups.length > 0 ||
    generalInfo.some((i) => i && i.key === "exam_centers") ||
    hasCenterNotes;
  const hasMarkData =
    units.length > 0 ||
    generalInfo.some(
      (i) =>
        i &&
        i.key &&
        (i.key.startsWith("mark_") || i.key.startsWith("faq_") || i.key.startsWith("general_")),
    ) ||
    hasMarkNotes;
  const getUnitResult = (unit: UnitWithDetails) => {
    if (isFiltered) {
      return unit.result_details?.find((r) => isMatchBatch(r.batch, r.batch_id));
    }
    return unit.result_details?.find((r) => r.batch?.is_current) || unit.result_details?.[0];
  };

  const hasResultData =
    units.some((u) => getUnitResult(u) != null) ||
    (isFiltered ? false : generalInfo.some((i) => i && i.key === "result_info") || hasResultNotes);

  const hasAnyData =
    hasApplyData || hasAdmitData || hasExamData || hasCenterData || hasMarkData || hasResultData;

  if (!hasAnyData) {
    return null;
  }

  return (
    <div className="w-full border border-border bg-card rounded-2xl p-4 sm:p-6 shadow-lg relative text-left">
      <div className="flex justify-center">
        <div className="gradient-background inline-block px-6 py-2 text-primary-foreground rounded-full text-base sm:text-lg mb-4 font-bold shadow-md font-bengali">
          ভর্তি তথ্য
        </div>
      </div>

      {/* ─── আবেদন ─── */}
      {hasApplyData && (
        <>
          <h2
            id="Apply"
            className="bg-[#e8edfb] dark:bg-[#0d1117] text-[#3b5998] dark:text-primary rounded-xl p-3 mt-4 mb-4 text-center text-lg font-bold flex items-center justify-center font-bengali"
          >
            <FilePenLine className="mr-2 h-4 w-4" /> আবেদন
          </h2>

          <div className="text-base font-bengali space-y-5 mb-6">
            {/* 1. Timeline */}
            {datesMap.size > 0 && (
              <div className="space-y-0.25">
                <div className="font-bold flex items-center gap-2 text-foreground">
                  <CalendarClock className="h-5 w-5 text-black dark:text-white shrink-0" />
                  <span>আবেদনের সময়কাল:</span>
                  {renderBatchBadges(
                    unitApps.map(({ app }) => app.batch?.name || app.batch?.name_bn),
                  )}
                </div>
                {datesMap.size === 1 ? (
                  (() => {
                    const { start, end } = Array.from(datesMap.values())[0];
                    return (
                      <ul className="list-none pl-6 space-y-0.25 text-muted-foreground">
                        {start && (
                          <li className="flex items-start gap-1.5">
                            <span className="font-extrabold text-foreground">• শুরু:</span>
                            <span>{formatDateTimeBn(start, "DD MMM YYYY (hh:mm A)")}</span>
                          </li>
                        )}
                        {end && (
                          <li className="flex items-start gap-1.5">
                            <span className="font-extrabold text-foreground">• শেষ:</span>
                            <span>{formatDateTimeBn(end, "DD MMM YYYY (hh:mm A)")}</span>
                          </li>
                        )}
                      </ul>
                    );
                  })()
                ) : (
                  <div className="pl-6 space-y-2">
                    {Array.from(datesMap.entries()).map(
                      ([key, { start, end, units: groupUnits }]) => {
                        if (!start && !end) return null;
                        const unitNames = groupUnits
                          .map((u) => formatUnitName(u.unit_name_bn))
                          .join(", ");
                        return (
                          <div key={key} className="space-y-1">
                            <div className="font-semibold text-foreground text-sm">
                              {unitNames}:
                            </div>
                            <ul className="list-none pl-4 space-y-0.5 text-muted-foreground text-sm">
                              {start && (
                                <li className="flex items-start gap-1.5">
                                  <span className="font-bold text-foreground">• শুরু:</span>
                                  <span>{formatDateTimeBn(start, "DD MMM YYYY (hh:mm A)")}</span>
                                </li>
                              )}
                              {end && (
                                <li className="flex items-start gap-1.5">
                                  <span className="font-bold text-foreground">• শেষ:</span>
                                  <span>{formatDateTimeBn(end, "DD MMM YYYY (hh:mm A)")}</span>
                                </li>
                              )}
                            </ul>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Fees */}
            {unitFeeApps.length > 0 && (
              <div className="space-y-0.25 mt-2">
                <div className="font-bold flex items-center gap-2 text-foreground">
                  <Banknote className="h-5 w-5 text-black dark:text-white shrink-0" />
                  <span>আবেদন ফি:</span>
                  {renderBatchBadges(
                    unitFeeApps.map(({ app }) => app.batch?.name || app.batch?.name_bn),
                  )}
                </div>
                <ul className="list-none pl-6 space-y-0.25 text-muted-foreground">
                  {unitFeeApps.map(({ unit, app }) => {
                    if (app.fee == null) return null;
                    const displayName =
                      unit.unit_slug === universitySlug ? "" : formatUnitName(unit.unit_name_bn);
                    const paymentSuffix =
                      !hasCommonFeePaymentMethod && app.fee_payment_method
                        ? ` (${app.fee_payment_method})`
                        : "";
                    return (
                      <li key={unit.id} className="flex items-center gap-1.5">
                        <span className="text-black dark:text-white font-bold">✓</span>
                        <span>
                          {displayName && (
                            <span className="text-black dark:text-white font-bold">
                              {displayName}:{" "}
                            </span>
                          )}
                          {toBanglaNumber(app.fee)}৳{paymentSuffix}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {hasCommonFeePaymentMethod && commonFeePaymentMethod && (
                  <div className="text-sm text-muted-foreground pl-6 mt-1">
                    ({commonFeePaymentMethod})
                  </div>
                )}
              </div>
            )}

            {/* 5. Notes */}
            {(() => {
              const notes = Array.from(
                new Set(unitApps.map(({ app }) => app.note?.trim()).filter(Boolean)),
              );
              if (notes.length === 0) return null;
              return (
                <div className="space-y-1 mt-3 pl-6 border-l-2 border-primary/20 text-sm text-muted-foreground">
                  {notes.map((note, idx) => (
                    <p key={idx}>{note}</p>
                  ))}
                </div>
              );
            })()}

            {/* 3. Helpful Links & 4. Apply URLs wrapped to control spacing between them */}
            {(linksMap.size > 0 || applyUrlsMap.size > 0) && (
              <div className="space-y-1">
                {/* 3. Helpful Links */}
                {linksMap.size > 0 &&
                  (linksMap.size === 1 ? (
                    (() => {
                      const { links } = Array.from(linksMap.values())[0];
                      return (
                        <div className="flex items-center gap-2 text-sm text-primary font-semibold mt-1">
                          <CircleCheck className="text-green-500 h-5 w-5 shrink-0" />
                          <div className="flex flex-wrap items-center gap-x-2">
                            {links.map((link, idx) => (
                              <span key={idx} className="flex items-center">
                                {idx > 0 && (
                                  <span className="text-muted-foreground/50 mx-2">|</span>
                                )}
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline text-primary"
                                >
                                  {link.label}
                                </a>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-2 mt-1">
                      {Array.from(linksMap.entries()).map(([key, { links, units: groupUnits }]) => {
                        const unitNames = groupUnits
                          .map((u) => formatUnitName(u.unit_name_bn))
                          .join(", ");
                        return (
                          <div
                            key={key}
                            className="flex items-start gap-2 text-sm text-primary font-semibold"
                          >
                            <CircleCheck className="text-green-500 h-5 w-5 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-foreground font-semibold mr-1">
                                {unitNames}:
                              </span>
                              <span className="inline-flex flex-wrap items-center gap-x-2">
                                {links.map((link, idx) => (
                                  <span key={idx} className="flex items-center">
                                    {idx > 0 && (
                                      <span className="text-muted-foreground/50 mx-2">|</span>
                                    )}
                                    <a
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline text-primary"
                                    >
                                      {link.label}
                                    </a>
                                  </span>
                                ))}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                {/* 4. Apply URLs */}
                {applyUrlsMap.size > 0 &&
                  (applyUrlsMap.size === 1 ? (
                    (() => {
                      const url = Array.from(applyUrlsMap.keys())[0];
                      const cleanUrlDisplay = (urlStr: string): string => {
                        try {
                          const uObj = new URL(urlStr);
                          let display = uObj.hostname;
                          if (uObj.pathname && uObj.pathname !== "/") {
                            display += uObj.pathname;
                          }
                          if (display.endsWith("/")) {
                            display = display.slice(0, -1);
                          }
                          return display;
                        } catch {
                          return urlStr;
                        }
                      };
                      return (
                        <div className="flex items-center gap-2 font-bold mt-1">
                          <Link2 className="h-5 w-5 text-black dark:text-white shrink-0" />
                          <span className="text-foreground">লিংকঃ</span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <span>{cleanUrlDisplay(url)}</span>
                            <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-1.5 mt-1">
                      <div className="font-bold flex items-center gap-2 text-foreground">
                        <Link2 className="h-5 w-5 text-black dark:text-white shrink-0" />
                        <span>লিংকঃ</span>
                      </div>
                      <ul className="list-none pl-6 space-y-0.25 text-muted-foreground text-sm">
                        {Array.from(applyUrlsMap.entries()).map(([url, groupUnits]) => {
                          const unitNames = groupUnits
                            .map((u) => formatUnitName(u.unit_name_bn))
                            .join(", ");
                          const cleanUrlDisplay = (urlStr: string): string => {
                            try {
                              const uObj = new URL(urlStr);
                              let display = uObj.hostname;
                              if (uObj.pathname && uObj.pathname !== "/") {
                                display += uObj.pathname;
                              }
                              if (display.endsWith("/")) {
                                display = display.slice(0, -1);
                              }
                              return display;
                            } catch {
                              return urlStr;
                            }
                          };
                          return (
                            <li key={url} className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-foreground">{unitNames}:</span>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                              >
                                <span>{cleanUrlDisplay(url)}</span>
                                <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
              </div>
            )}

            {/* Eligibility (Batches) */}
            {unitBatchInfo.length > 0 && (
              <div className="space-y-1 mt-3">
                <div className="font-bold flex items-center gap-2 text-foreground font-bengali">
                  <PackageCheck className="h-5 w-5 text-black dark:text-white shrink-0" />
                  <span>আবেদনের যোগ্যতা:</span>
                  {renderBatchBadges(requirementBatchName ? [requirementBatchName] : [])}
                </div>
                {allSameBatches ? (
                  (() => {
                    const info = unitBatchInfo[0];
                    return (
                      <ul className="list-none pl-7 space-y-0.5 text-muted-foreground text-sm font-bengali">
                        {info.ssc.length > 0 && (
                          <li className="flex items-center gap-1">
                            <span className="font-bold text-foreground">- SSC ব্যাচ:</span>
                            <span>{info.ssc.join(", ")}</span>
                          </li>
                        )}
                        {info.hsc.length > 0 && (
                          <li className="flex items-center gap-1">
                            <span className="font-bold text-foreground">- HSC ব্যাচ:</span>
                            <span>{info.hsc.join(", ")}</span>
                          </li>
                        )}
                      </ul>
                    );
                  })()
                ) : (
                  <div className="pl-7 space-y-2 text-sm font-bengali">
                    {groupedBatchInfoList.map((info, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-semibold text-foreground">{info.displayUnitName}:</div>
                        <ul className="list-none pl-4 space-y-0.5 text-muted-foreground">
                          {info.ssc.length > 0 && (
                            <li className="flex items-center gap-1">
                              <span className="font-bold text-foreground">- SSC ব্যাচ:</span>
                              <span>{info.ssc.join(", ")}</span>
                            </li>
                          )}
                          {info.hsc.length > 0 && (
                            <li className="flex items-center gap-1">
                              <span className="font-bold text-foreground">- HSC ব্যাচ:</span>
                              <span>{info.hsc.join(", ")}</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Second Time */}
            {university && (
              <div className="mt-3">
                {university.second_time ? (
                  <div className="flex items-center gap-2 font-bold text-green-600 dark:text-green-400 text-sm font-bengali">
                    <CircleCheck className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    <span>সেকেন্ড টাইম: আছে</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 font-bold text-red-500 dark:text-red-400 text-sm font-bengali">
                    <CircleAlert className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
                    <span>সেকেন্ড টাইম: নেই</span>
                  </div>
                )}
              </div>
            )}

            {/* Requirements accordion */}
            {units.some((u) => filterRequirementsForBatch(u.requirements).length > 0) && (
              <Accordion type="single" collapsible className="mt-3 space-y-2">
                <AccordionItem
                  value="requirements"
                  className="border border-border rounded-lg bg-card hover:bg-accent/50"
                >
                  <AccordionTrigger className="p-3 text-base font-bold hover:no-underline">
                    <div className="flex items-center font-bengali flex-wrap gap-1">
                      <CircleAlert className="inline-block mr-2 h-5 w-5" />
                      <span>ইউনিট ও বিভাগ ভিত্তিক শর্ত</span>
                      {renderBatchBadges(requirementBatchName ? [requirementBatchName] : [])}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 text-base font-bengali">
                    {units
                      .filter((u) => filterRequirementsForBatch(u.requirements).length > 0)
                      .map((unit) => {
                        const unitReqs = filterRequirementsForBatch(unit.requirements);

                        // Group unit requirements by their configuration key
                        const groupsByKey: { [key: string]: { groupNames: string[]; req: any } } =
                          {};
                        unitReqs.forEach((req) => {
                          const key = getRequirementKey(req);
                          if (!groupsByKey[key]) {
                            groupsByKey[key] = { groupNames: [], req };
                          }
                          if (req.group_name) {
                            groupsByKey[key].groupNames.push(req.group_name);
                          }
                        });

                        const groupedReqs = Object.values(groupsByKey);

                        return (
                          <div key={unit.id} className="mb-4 last:mb-0">
                            {/* Unit header */}
                            <div className="font-bold text-foreground text-sm mb-1.5 flex items-center gap-1.5 font-bengali">
                              <span className="text-muted-foreground/80 font-normal">❐</span>
                              <span>{getUnitHeaderName(unit.unit_name_bn)}:</span>
                            </div>

                            {/* Requirements list */}
                            <ul className="space-y-1.5 pl-4">
                              {groupedReqs.map(({ groupNames, req }, reqIdx) => {
                                const gpaText = getGpaText(req);

                                // Parse subject requirements
                                let subjectRequirementsArray: { subject: string; gpa: number }[] =
                                  [];
                                if (req.subject_requirements) {
                                  if (typeof req.subject_requirements === "object") {
                                    subjectRequirementsArray = Object.entries(
                                      req.subject_requirements,
                                    ).map(([subject, gpa]) => ({
                                      subject,
                                      gpa: Number(gpa),
                                    }));
                                  } else if (typeof req.subject_requirements === "string") {
                                    try {
                                      const parsed = JSON.parse(req.subject_requirements);
                                      if (typeof parsed === "object" && parsed !== null) {
                                        subjectRequirementsArray = Object.entries(parsed).map(
                                          ([subject, gpa]) => ({
                                            subject,
                                            gpa: Number(gpa),
                                          }),
                                        );
                                      }
                                    } catch (e) {}
                                  }
                                }

                                // Parse custom rules
                                let customRulesArray: any[] = [];
                                if (req.custom_checks) {
                                  if (Array.isArray(req.custom_checks)) {
                                    customRulesArray = req.custom_checks;
                                  } else if (typeof req.custom_checks === "string") {
                                    try {
                                      customRulesArray = JSON.parse(req.custom_checks);
                                    } catch (e) {}
                                  }
                                }

                                // Format subject requirements text
                                let subjectText = "";
                                if (subjectRequirementsArray.length > 0) {
                                  const reqStrings = subjectRequirementsArray.map(
                                    (item) => `${item.subject}-এ ন্যূনতম GPA-${item.gpa}`,
                                  );
                                  subjectText = `বিষয়ভিত্তিক যোগ্যতা: ${reqStrings.join(", ")}`;
                                }

                                // Format custom rules text
                                let customText = "";
                                if (customRulesArray.length > 0) {
                                  const ruleStrings = customRulesArray.map((item) => {
                                    const subjList = item.subjects?.join(", ");
                                    if (item.type === "atLeastNSubjectsWithMinGPA") {
                                      return `${subjList}-এর মধ্যে কমপক্ষে ${item.count}টি বিষয়ে GPA ${item.gpa} থাকতে হবে`;
                                    } else if (item.type === "remainingSubjectsWithMinGPA") {
                                      return `বাকি বিষয়সমূহে (${subjList}) GPA ${item.gpa} থাকতে হবে`;
                                    } else {
                                      return `নির্দিষ্ট বিষয়সমূহের (${subjList}) মোট জিপিএ কমপক্ষে ${item.minTotalGPA} হতে হবে`;
                                    }
                                  });
                                  customText = `বিশেষ শর্তাবলী: ${ruleStrings.join("; ")}`;
                                }

                                const noteText = req.requirement_text ?? req.notes;

                                return (
                                  <li
                                    key={reqIdx}
                                    className="list-none text-xs text-muted-foreground font-bengali"
                                  >
                                    <div className="flex items-start gap-2">
                                      <span className="text-black dark:text-white shrink-0">●</span>
                                      <div>
                                        <span className="font-bold text-foreground font-semibold">
                                          {joinGroupNames(groupNames)} বিভাগ:
                                        </span>{" "}
                                        <span>{gpaText}</span>
                                        {/* Sub requirements */}
                                        {(subjectText || customText || noteText) && (
                                          <div className="pl-4 mt-1 text-[11px] text-muted-foreground/80 space-y-0.5 border-l border-border/80">
                                            {subjectText && <div>{subjectText}</div>}
                                            {customText && <div>{customText}</div>}
                                            {noteText && <div className="italic">* {noteText}</div>}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                            {renderDynamicNotes("Apply", unit.id)}
                          </div>
                        );
                      })}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            {renderDynamicNotes("Apply", null)}
          </div>
        </>
      )}

      {/* ─── প্রবেশপত্র ─── */}
      {hasAdmitData && (
        <>
          <h2
            id="AdmitCard"
            className="bg-primary/10 text-primary rounded-xl p-3 mt-6 mb-4 text-center text-lg font-bold flex items-center justify-center font-bengali"
          >
            <Monitor className="mr-2 h-4 w-4" /> প্রবেশপত্র
          </h2>

          <div className="text-base font-bengali mb-6 space-y-4">
            {/* 1. Download Period */}
            {admitDatesMap.size > 0 && (
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-2 text-foreground">
                  <CalendarClock className="h-5 w-5 text-black dark:text-white shrink-0" />
                  <span>ডাউনলোডের সময়কাল:</span>
                  {renderBatchBadges(
                    admitDetailsList.map(({ admit }) => admit.batch?.name || admit.batch?.name_bn),
                  )}
                </div>

                {admitDatesMap.size === 1 ? (
                  (() => {
                    const { start, end } = Array.from(admitDatesMap.values())[0];
                    return (
                      <ul className="list-none pl-6 space-y-0.25 text-muted-foreground">
                        {start && (
                          <li className="flex items-start gap-1.5">
                            <span className="font-extrabold text-foreground">• শুরু:</span>
                            <span>{formatDateBn(start, "DD MMMM, YYYY (hh:mm A)")}</span>
                          </li>
                        )}
                        <li className="flex items-start gap-1.5">
                          <span className="font-extrabold text-foreground">• শেষ:</span>
                          <span>
                            {end
                              ? formatDateBn(end, "DD MMMM, YYYY (hh:mm A)")
                              : "পরীক্ষা শুরুর ১ ঘণ্টা পূর্ব পর্যন্ত"}
                          </span>
                        </li>
                      </ul>
                    );
                  })()
                ) : (
                  <div className="pl-6 space-y-3">
                    {Array.from(admitDatesMap.entries()).map(
                      ([key, { start, end, units: groupUnits }]) => {
                        const unitNames = groupUnits
                          .map((u) => formatUnitName(u.unit_name_bn))
                          .join(", ");
                        return (
                          <div key={key} className="space-y-1">
                            <div className="font-bold text-foreground">❐ {unitNames}:</div>
                            <ul className="list-none pl-6 space-y-0.25 text-muted-foreground">
                              {start && (
                                <li className="flex items-start gap-1.5">
                                  <span className="font-extrabold text-foreground">• শুরু:</span>
                                  <span>{formatDateBn(start, "DD MMMM, YYYY (hh:mm A)")}</span>
                                </li>
                              )}
                              <li className="flex items-start gap-1.5">
                                <span className="font-extrabold text-foreground">• শেষ:</span>
                                <span>
                                  {end
                                    ? formatDateBn(end, "DD MMMM, YYYY (hh:mm A)")
                                    : "পরীক্ষা শুরুর ১ ঘণ্টা পূর্ব পর্যন্ত"}
                                </span>
                              </li>
                            </ul>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Download Link */}
            {admitUrlsMap.size > 0 && (
              <div className="space-y-1">
                {admitUrlsMap.size === 1 ? (
                  (() => {
                    const { url } = Array.from(admitUrlsMap.values())[0];
                    const cleanUrlDisplay = (urlStr: string): string => {
                      try {
                        return new URL(urlStr).hostname;
                      } catch {
                        return urlStr;
                      }
                    };
                    return (
                      <div>
                        <b>
                          <Link2 className="inline-block mr-2 h-4 w-4" />
                          লিংকঃ
                        </b>{" "}
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                          href={url}
                        >
                          <span>{cleanUrlDisplay(url)}</span>
                          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-1.5">
                    <div>
                      <b>
                        <Link2 className="inline-block mr-2 h-4 w-4" />
                        লিংকঃ
                      </b>
                    </div>
                    <ul className="list-none pl-6 space-y-0.25 text-muted-foreground text-sm">
                      {Array.from(admitUrlsMap.entries()).map(([url, { units: groupUnits }]) => {
                        const unitNames = groupUnits
                          .map((u) => formatUnitName(u.unit_name_bn))
                          .join(", ");
                        const cleanUrlDisplay = (urlStr: string): string => {
                          try {
                            return new URL(urlStr).hostname;
                          } catch {
                            return urlStr;
                          }
                        };
                        return (
                          <li key={url} className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground">❐ {unitNames}:</span>
                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                              href={url}
                            >
                              <span>{cleanUrlDisplay(url)}</span>
                              <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 3. Notes */}
            {uniqueAdmitNotes.length > 0 && (
              <div className="space-y-1">
                <div>
                  <b>
                    <div className="text-orange-500 dark:text-orange-400 flex items-center">
                      <CircleAlert className="inline-block mr-1 h-4 w-4" />
                      নোটঃ
                    </div>
                  </b>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {uniqueAdmitNotes.map((note, idx) => (
                    <p key={idx}>{note}</p>
                  ))}
                </div>
              </div>
            )}
            {renderDynamicNotes("AdmitCard")}
          </div>
        </>
      )}

      {/* ─── পরীক্ষার সময়কাল ─── */}
      {hasExamData && (
        <>
          <h2
            id="ExamDate"
            className="bg-primary/10 text-primary rounded-xl p-3 mt-6 mb-4 text-center text-lg font-bold flex items-center justify-center gap-2 font-bengali"
          >
            <Timer className="h-4 w-4" />
            <span>পরীক্ষার সময়কাল</span>
            {renderBatchBadges([
              ...new Set(
                unitsWithExams
                  .map((u) => u.exam_schedule?.batch?.name || u.exam_schedule?.batch?.name_bn)
                  .filter(Boolean),
              ),
            ])}
          </h2>

          <div className="text-base font-bengali mb-6">
            {unitsWithExams.map((unit) => (
              <span key={unit.id} className="block mb-2">
                ❐{" "}
                {unit.unit_slug !== universitySlug ? (
                  <>
                    <b>{formatUnitName(unit.unit_name_bn)}:</b>{" "}
                  </>
                ) : null}
                {formatDateBn(unit.exam_schedule!.exam_datetime, "DD MMMM, YYYY (hh:mm A)")}
                {unit.exam_schedule!.venue && ` (${unit.exam_schedule!.venue})`}
              </span>
            ))}

            <hr className="my-3 border-border/50" />
            <div className="border border-border/80 p-3 text-center rounded-md font-bengali text-sm">
              সব বিশ্ববিদ্যালয়ের <b>পরীক্ষার তারিখ ও কাউন্টডাউন</b> জানতে ভিজিট করুন আমাদের{" "}
              <b>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                  href="/calendar"
                >
                  <span>অ্যাডমিশন ক্যালেন্ডার</span>
                  <SquareArrowOutUpRight className="h-3 w-3" />
                </a>
              </b>
            </div>
            {renderDynamicNotes("ExamDate")}
          </div>
        </>
      )}

      {/* ─── ভর্তি পরীক্ষার কেন্দ্র ─── */}
      {hasCenterData && (
        <>
          <h2
            id="Location"
            className="bg-primary/10 text-primary rounded-xl p-3 mt-6 mb-4 text-center text-lg font-bold flex items-center justify-center font-bengali"
          >
            <MapPinned className="mr-2 h-4 w-4" /> ভর্তি পরীক্ষার কেন্দ্র
          </h2>

          <div className="text-base font-bengali mb-6">
            {examCenterGroups.length > 0 ? (
              (() => {
                const gridColsClass =
                  examCenterGroups.length === 1
                    ? "grid-cols-1"
                    : examCenterGroups.length === 2
                      ? "grid-cols-1 sm:grid-cols-2"
                      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

                return (
                  <div className={cn("grid gap-3 sm:gap-4", gridColsClass)}>
                    {examCenterGroups.map((group) => {
                      const unitNames = group.units.map((u) => formatUnitName(u.unit_name_bn));
                      const title = unitNames.length > 0 ? joinUnitNames(unitNames) : group.note;
                      const subtitle = unitNames.length > 0 ? group.note : "";
                      const link = group.units.find((u) => u.exam_center_link)?.exam_center_link;

                      const cardInner = (
                        <>
                          <div className="flex items-center gap-3 font-bengali min-w-0">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                              <MapPinned className="h-6 w-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                                {title}
                              </h3>
                              {subtitle && (
                                <p className="text-xs text-muted-foreground font-bengali mt-0.5">
                                  {subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          {link ? (
                            <div className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2">
                              <ChevronRight className="h-5 w-5" />
                            </div>
                          ) : null}
                        </>
                      );

                      if (link) {
                        return (
                          <a
                            key={group.note}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary hover:bg-accent/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group text-left"
                          >
                            {cardInner}
                          </a>
                        );
                      }

                      return (
                        <div
                          key={group.note}
                          className="flex items-center justify-between p-4 rounded-xl border border-border bg-card text-left group"
                        >
                          {cardInner}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div className="border border-border rounded-xl p-4 sm:p-5 bg-card text-foreground whitespace-pre-line">
                {generalInfo
                  .filter((i) => i && i.key === "exam_centers")
                  .map((i) => (
                    <span key={i.id} className="block">
                      {i.value}
                    </span>
                  ))}
              </div>
            )}
            {renderDynamicNotes("Location")}
          </div>
        </>
      )}

      {/* ─── মানবণ্টন ─── */}
      {hasMarkData && (
        <div className="space-y-2.5">
          <div id="MarkDistribution" />
          <h2 className="bg-primary/10 text-primary rounded-xl p-3 mt-6 mb-4 text-center text-lg font-bold flex items-center justify-center font-bengali">
            <ListChecks className="mr-2 h-4 w-4" /> মানবণ্টন ও অন্যান্য তথ্য
          </h2>

          {units.length > 0 && (
            <div className="space-y-2.5">
              {!(units.length === 1 && units[0].unit_slug === universitySlug) && (
                <div className="flex flex-wrap bg-transparent gap-2">
                  {units.map((unit) => (
                    <button
                      type="button"
                      key={unit.id}
                      onClick={() => setActiveUnitId(unit.id)}
                      className={cn(
                        "flex-grow border border-primary text-primary px-4 py-2 text-sm font-medium font-bengali rounded-sm transition-all",
                        activeUnitId === unit.id
                          ? "bg-primary border-transparent text-primary-foreground shadow-sm"
                          : "bg-transparent hover:bg-primary/5",
                      )}
                    >
                      {unit.unit_name_bn}
                    </button>
                  ))}
                </div>
              )}

              {(() => {
                const activeUnit = units.find((u) => u.id === activeUnitId);
                if (!activeUnit) return null;

                const markInfo = generalInfo.filter(
                  (i) =>
                    i &&
                    i.key &&
                    i.key.startsWith("mark_") &&
                    (i.key.includes(activeUnit.unit_slug.toLowerCase()) ||
                      i.key.includes(activeUnit.unit_name_bn.toLowerCase()) ||
                      (activeUnit.unit_name_en &&
                        i.key.includes(activeUnit.unit_name_en.toLowerCase())) ||
                      i.key.includes("all")),
                );

                const faqs = generalInfo.filter(
                  (i) =>
                    i &&
                    i.key &&
                    i.key.startsWith("faq_") &&
                    (i.key.includes(activeUnit.unit_slug.toLowerCase()) ||
                      i.key.includes(activeUnit.unit_name_bn.toLowerCase()) ||
                      (activeUnit.unit_name_en &&
                        i.key.includes(activeUnit.unit_name_en.toLowerCase())) ||
                      i.key.includes("all")),
                );

                return (
                  <div key={activeUnit.id} className="space-y-2.5">
                    {/* Public marks distribution component */}
                    <UnitMarksDistribution unitId={activeUnit.id} />

                    {/* Fallback legacy mark info if any text notes exist in DB */}
                    {markInfo.length > 0 && (
                      <div className="border border-slate-200 rounded-xl p-4 text-base leading-relaxed font-bengali whitespace-pre-line bg-white shadow-sm">
                        {markInfo.map((m) => (
                          <span key={m.id}>{m.value}</span>
                        ))}
                      </div>
                    )}

                    {/* FAQ-style accordions */}
                    {faqs.length > 0 && (
                      <Accordion type="single" collapsible className="space-y-2">
                        {faqs.map((faq) => (
                          <AccordionItem
                            key={faq.id}
                            value={faq.id}
                            className="border border-slate-200 rounded-lg bg-white hover:bg-slate-50/50"
                          >
                            <AccordionTrigger className="p-3 text-base font-medium hover:no-underline">
                              <div className="flex items-center font-bengali">
                                <CircleHelp className="mr-2 h-5 w-5 text-indigo-500" />
                                <span>{faq.label_bn || faq.label_en}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0 text-base font-bengali whitespace-pre-line text-slate-600">
                              {faq.value}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                    {renderDynamicNotes("MarkDistribution", activeUnit.id)}
                  </div>
                );
              })()}
            </div>
          )}

          {/* General info items (syllabus, negative marking, etc.) */}
          {(generalInfo.filter((i) => i && i.key && i.key.startsWith("general_")).length > 0 ||
            university) && (
            <div className="border border-border/80 rounded-xl p-4 text-base font-bengali mb-6">
              {generalInfo
                .filter((i) => i && i.key && i.key.startsWith("general_"))
                .map((item) => (
                  <div key={item.id}>
                    ● <b>{item.label_bn || item.label_en || item.key}:</b> {item.value}
                    <hr className="my-1 border-border/50" />
                  </div>
                ))}

              {university && (
                <>
                  <div>
                    ● <b>সেকেন্ড টাইম:</b>{" "}
                    {university.second_time ? (
                      <span>
                        আছে{" "}
                        {university.second_time_condition
                          ? `(${university.second_time_condition})`
                          : ""}
                      </span>
                    ) : (
                      <span>নেই</span>
                    )}
                    <hr className="my-1 border-border/50" />
                  </div>

                  <div>
                    ● <b>নেগেটিভ মার্কিং:</b>{" "}
                    {university.negative_mark && Number(university.negative_mark) > 0 ? (
                      <span>
                        প্রতি ভুলের জন্য {toBanglaNumber(university.negative_mark)} নম্বর কাটা যাবে
                      </span>
                    ) : (
                      <span>নেই</span>
                    )}
                    <hr className="my-1 border-border/50" />
                  </div>

                  <div>
                    ● <b>ক্যালকুলেটর:</b>{" "}
                    {(() => {
                      const isAllowed =
                        activeUnit?.calculator_allowed ?? university?.calculator_allowed ?? false;
                      const calcLink =
                        activeUnit?.calculator_link?.trim() ||
                        university?.calculator_link?.trim() ||
                        null;
                      return (
                        <span>
                          {isAllowed ? "ব্যবহার করা যাবে" : "ব্যবহার করা যাবে না"}
                          {calcLink && (
                            <a
                              href={calcLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors font-bengali align-middle"
                            >
                              <span>অনুমোদিত ক্যালকুলেটরের তালিকা</span>
                              <SquareArrowOutUpRight className="h-3 w-3" />
                            </a>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}
          {renderDynamicNotes("MarkDistribution", null)}
        </div>
      )}

      {/* ─── ফলাফল ─── */}
      {hasResultData && (
        <>
          <h2
            id="Result"
            className="bg-primary/10 text-primary rounded-xl p-3 mt-6 mb-4 text-center text-lg font-bold flex items-center justify-center gap-2 font-bengali"
          >
            <BarChart3 className="h-4 w-4" />
            <span>ভর্তি পরীক্ষার ফলাফল</span>
            {renderBatchBadges(resultBatchName ? [resultBatchName] : [])}
          </h2>

          <div className="text-base font-bengali space-y-3">
            {units.length > 0 && units.some((u) => getUnitResult(u) != null) ? (
              <div className="space-y-2">
                {units.map((unit) => {
                  const res = getUnitResult(unit);
                  if (!res) return null;

                  const isSingleUnit = units.length === 1 && unit.unit_slug === universitySlug;
                  const unitTitle = isSingleUnit ? "" : `❐ ${formatUnitName(unit.unit_name_bn)}: `;
                  const dateStr = res.result_datetime
                    ? formatDateBn(res.result_datetime, "DD MMMM, YYYY")
                    : "";

                  return (
                    <div
                      key={unit.id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-foreground"
                    >
                      {unitTitle && <span className="font-bold">{unitTitle}</span>}
                      {dateStr && (
                        <span className="text-muted-foreground font-medium">{dateStr}</span>
                      )}

                      {res.result_url && (
                        <a
                          href={res.result_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <span>ফলাফল দেখুন</span>
                          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}

                      {res.others_links?.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <span>{link.label}</span>
                          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                        </a>
                      ))}

                      {res.note && (
                        <span className="text-xs text-muted-foreground w-full pl-4 pt-0.5 whitespace-pre-line">
                          * {res.note}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {generalInfo
              .filter((i) => i && i.key === "result_info")
              .map((i) => (
                <span key={i.id} className="block whitespace-pre-line text-muted-foreground pl-1">
                  {i.value}
                </span>
              ))}

            {renderDynamicNotes("Result")}
          </div>
        </>
      )}
    </div>
  );
}

import { formatDateBn, formatDateTimeBn, toBanglaNumber } from "@/lib/date-utils";
