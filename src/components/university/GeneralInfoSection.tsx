import type { UniversityGeneralInfo } from "@/lib/university-types";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

interface Props {
  info: UniversityGeneralInfo[];
}

export default function GeneralInfoSection({ info }: Props) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold font-bengali">সাধারণ তথ্য</h2>
        </div>

        <div className="space-y-2">
          {info.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-start gap-3"
            >
              <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5 font-bengali">
                {item.label_bn || item.label_en || item.key}
              </Badge>
              <p className="text-sm font-bengali text-muted-foreground leading-relaxed flex-1 whitespace-pre-line">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
