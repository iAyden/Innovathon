"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CashFlowEntry } from "@/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function monthLabel(value: string) {
  // If it's just YYYY-MM
  if (/^\d{4}-\d{2}$/.test(value)) {
    const date = new Date(`${value}-01T12:00:00`);
    return new Intl.DateTimeFormat("es-MX", { month: "short" }).format(date);
  }
  // If it's YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat("es-MX", { month: "short", day: "numeric" }).format(date);
  }
  return value;
}

export function CashFlowChart({ data, action }: { data: CashFlowEntry[], action?: React.ReactNode }) {
  const chartData = data.map((entry) => ({
    ...entry,
    month: monthLabel(entry.month),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Flujo de caja</CardTitle>
          <CardDescription>
            Entradas y salidas registradas.
          </CardDescription>
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] sm:h-[350px]">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Registra movimientos para visualizar tendencias.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => `$${value / 1000}k`}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend
                  formatter={(value: string) =>
                    value === "income" ? "Entradas" : "Salidas"
                  }
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
