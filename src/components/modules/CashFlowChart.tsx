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
import { Card, CardContent } from "@/components/ui/card";
import type { CashFlowEntry } from "@/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function monthLabel(value: string) {
  const date = new Date(`${value}-01T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("es-MX", { month: "short" }).format(date);
}

export function CashFlowChart({ data }: { data: CashFlowEntry[] }) {
  const chartData = data.map((entry) => ({
    ...entry,
    month: monthLabel(entry.month),
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2">
        <h2 className="text-base font-medium leading-snug">Flujo de caja</h2>
        <p className="text-sm text-muted-foreground">
          Entradas y salidas registradas en los ultimos 6 meses.
        </p>
      </div>
      <Card className="flex-1">
        <CardContent className="h-full pt-4">
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
    </div>
  );
}