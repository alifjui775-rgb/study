import { memo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Bar,
  CartesianGrid,
} from "recharts";

export interface ScoreChartPoint {
  name: string;
  score: number;
  examName: string;
  batchName: string;
}

interface TooltipCtx {
  active?: boolean;
  payload?: { payload: ScoreChartPoint }[];
  label?: string | number;
}

const CustomTooltip = ({ active, payload, label }: TooltipCtx) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm font-bold">{data.examName}</p>
          <p className="text-xs text-muted-foreground">{data.batchName}</p>
          <p className="text-sm font-semibold text-primary">স্কোর: {data.score.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">তারিখ: {label}</p>
        </div>
      </div>
    );
  }
  return null;
};

interface ScoreBarChartProps {
  data: ScoreChartPoint[];
}

function ScoreBarChart({ data }: ScoreBarChartProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <RechartsTooltip cursor={{ fill: "hsl(var(--accent))" }} content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="score"
            fill="hsl(var(--primary))"
            name="স্কোর"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(ScoreBarChart);
