import { memo } from "react";
import { ResponsiveContainer, AreaChart, XAxis, Tooltip, Area, CartesianGrid } from "recharts";

export interface ConsistencyPoint {
  date: string;
  name: string;
  score: number;
}

interface ConsistencyAreaChartProps {
  data: ConsistencyPoint[];
}

function ConsistencyAreaChart({ data }: ConsistencyAreaChartProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              borderColor: "hsl(var(--border))",
            }}
            labelStyle={{ fontWeight: "bold" }}
            formatter={(value) => [value as number, "স্কোর"]}
          />
          <Area
            type="monotone"
            dataKey="score"
            name="ধারাবাহিকতা স্কোর"
            stroke="hsl(var(--primary))"
            fillOpacity={1}
            fill="url(#colorScore)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(ConsistencyAreaChart);
