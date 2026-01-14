'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts'

interface JointDeviationChartProps {
  jointName: string
  frameDeviations: {
    frame: number
    idealAngle: number
    userAngle: number
    deviation: number
  }[]
}

export function JointDeviationChart({
  jointName,
  frameDeviations,
}: JointDeviationChartProps) {
  // Sample data if there are too many frames (for performance)
  const maxPoints = 100
  const sampleRate = Math.max(1, Math.floor(frameDeviations.length / maxPoints))
  const sampledData = frameDeviations.filter((_, i) => i % sampleRate === 0)

  // Transform data for the chart
  const chartData = sampledData.map((d) => ({
    frame: d.frame,
    reference: Math.round(d.idealAngle * 10) / 10,
    user: Math.round(d.userAngle * 10) / 10,
    deviation: Math.round(d.deviation * 10) / 10,
  }))

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Angle Over Time</p>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="frame"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              label={{
                value: 'Frame',
                position: 'bottom',
                offset: -5,
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              label={{
                value: 'Angle (°)',
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number, name: string) => [
                `${value}°`,
                name === 'reference' ? 'Reference' : name === 'user' ? 'Your Form' : 'Deviation',
              ]}
              labelFormatter={(label) => `Frame ${label}`}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px' }}
              formatter={(value) =>
                value === 'reference' ? 'Reference' : value === 'user' ? 'Your Form' : 'Deviation'
              }
            />
            <Line
              type="monotone"
              dataKey="reference"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              dot={false}
              name="reference"
            />
            <Line
              type="monotone"
              dataKey="user"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              dot={false}
              name="user"
            />
            <Area
              type="monotone"
              dataKey="deviation"
              fill="hsl(0, 84%, 60%)"
              fillOpacity={0.1}
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={1}
              strokeDasharray="3 3"
              name="deviation"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-green-500" />
          <span className="text-muted-foreground">Reference</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500" />
          <span className="text-muted-foreground">Your Form</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-500/50 border-dashed" />
          <span className="text-muted-foreground">Deviation</span>
        </div>
      </div>
    </div>
  )
}
