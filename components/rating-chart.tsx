"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface RatingPoint {
  x: string;
  rating: number;
}

export function RatingChart({ data }: { data: RatingPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="x"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={{ stroke: "#27272a" }}
          tickLine={false}
        />
        <YAxis
          domain={["dataMin - 50", "dataMax + 50"]}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={{ stroke: "#27272a" }}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "#0a0a0a",
            border: "1px solid #27272a",
            borderRadius: "6px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#71717a" }}
          itemStyle={{ color: "#ededed" }}
        />
        <Line
          type="monotone"
          dataKey="rating"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: "#10b981", r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
