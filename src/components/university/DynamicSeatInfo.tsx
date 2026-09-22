// =============================================================================
// DynamicSeatInfo — Subject table with search, review links (legacy match)
// =============================================================================

import { useState } from "react";
import { useParams } from "react-router-dom";
import type { UnitWithDetails } from "@/lib/university-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SquareArrowOutUpRight } from "lucide-react";

interface Props {
  units: UnitWithDetails[];
  totalSeats: number;
}

export default function DynamicSeatInfo({ units, totalSeats }: Props) {
  const { slug: universitySlug } = useParams<{ slug: string }>();

  if (units.length === 0) return null;

  const isSingleDefaultUnit = units.length === 1 && units[0].unit_slug === universitySlug;

  return (
    <div className="w-full border border-border bg-card rounded-2xl p-4 sm:p-6 shadow-lg text-center relative">
      <div className="flex justify-center">
        <div className="gradient-background inline-block px-6 py-2 text-primary-foreground rounded-full text-lg mb-4 font-bold shadow-md font-bengali">
          সাবজেক্ট প্রতি সিট সংখ্যা ও রিভিউ
        </div>
      </div>

      <Tabs defaultValue={units[0]?.id} className="w-full">
        {!isSingleDefaultUnit && (
          <TabsList className="flex flex-wrap w-full h-auto bg-transparent gap-2">
            {units.map((unit) => (
              <TabsTrigger
                key={unit.id}
                value={unit.id}
                className="flex-grow border border-primary text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:border-transparent font-bengali text-sm"
              >
                {unit.unit_name_bn}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {units.map((unit) => (
          <TabsContent key={unit.id} value={unit.id} className="mt-4">
            <UnitSubjectTable unit={unit} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function UnitSubjectTable({ unit }: { unit: UnitWithDetails }) {
  const [search, setSearch] = useState("");

  const filtered = unit.subjects.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.degree_program?.full_name_en?.toLowerCase().includes(q) ?? false) ||
      (s.degree_program?.full_name_bn?.toLowerCase().includes(q) ?? false) ||
      (s.degree_program?.short_name?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <input
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full pl-8 font-bengali"
          placeholder="🔎 বিষয় খুঁজুন..."
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Table className="w-full border rounded-md">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-[30%]">Short</TableHead>
            <TableHead className="text-center w-[40%]">Full Form</TableHead>
            <TableHead className="text-center w-[15%]">Seat</TableHead>
            <TableHead className="text-center w-[15%]">Review</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((subj) => {
            const seatTotal = subj.seats.reduce((s, seat) => s + seat.seat_count, 0);
            const ms = subj.degree_program;
            // Try to get custom review url first, then dynamic subject review slug
            const reviewUrl =
              (subj as any)?.custom_review_url || (ms?.review ? `/subjects/${ms.slug}` : null);

            return (
              <TableRow key={subj.id} className="text-center">
                <TableCell className="p-1 font-bold whitespace-pre-wrap break-words">
                  {ms?.short_name || "—"}
                </TableCell>
                <TableCell className="p-1 text-center whitespace-pre-wrap break-words">
                  {ms?.full_name_bn || ms?.full_name_en || "—"}
                </TableCell>
                <TableCell className="p-1 whitespace-pre-wrap break-words">
                  {seatTotal > 0 ? seatTotal : "—"}
                </TableCell>
                <TableCell className="p-1 whitespace-pre-wrap break-words">
                  {reviewUrl ? (
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                      href={reviewUrl}
                    >
                      <span>[লিংক]</span>
                      <SquareArrowOutUpRight className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center py-8 text-muted-foreground font-bengali"
              >
                কোনো বিষয় পাওয়া যায়নি।
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
