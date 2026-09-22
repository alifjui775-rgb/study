// =============================================================================
// QuickLinks — 2-column table layout with gradient pill title (legacy match)
// =============================================================================

import type { UniversityLink } from "@/lib/university-types";
import { Link2 } from "lucide-react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

interface Props {
  links: UniversityLink[];
}

export default function QuickLinks({ links }: Props) {
  // Group links into pairs for 2-column table layout
  const pairs: (UniversityLink | null)[][] = [];
  for (let i = 0; i < links.length; i += 2) {
    pairs.push([links[i], links[i + 1] || null]);
  }

  return (
    <div className="w-full border border-border bg-card rounded-2xl p-4 sm:p-6 shadow-lg text-center relative">
      <div className="flex justify-center">
        <div className="gradient-background inline-flex items-center gap-2 px-6 py-2 text-primary-foreground rounded-full text-lg mb-4 font-bold shadow-md">
          <Link2 className="h-5 w-5" />
          গুরুত্বপূর্ণ লিঙ্ক
        </div>
      </div>

      <Table className="w-full border rounded-md">
        <TableBody>
          {pairs.map((pair, idx) => {
            const isFullRow = pair[1] === null && pair[0];
            return (
              <TableRow key={idx}>
                {isFullRow ? (
                  <TableCell className="text-center p-0" colSpan={2}>
                    <LinkCell link={pair[0]!} />
                  </TableCell>
                ) : (
                  <>
                    <TableCell className="text-center p-0">
                      {pair[0] && <LinkCell link={pair[0]} />}
                    </TableCell>
                    <TableCell className="text-center p-0">
                      {pair[1] && <LinkCell link={pair[1]} />}
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function LinkCell({ link }: { link: UniversityLink }) {
  const isExternal = link.url.startsWith("http");
  return (
    <a
      href={link.url}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer noopener" : undefined}
      className="block w-full hover:bg-accent rounded-md py-1 px-2"
    >
      <div className="text-sm font-bengali">{link.label_bn || link.label}</div>
    </a>
  );
}
