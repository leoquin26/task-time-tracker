"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, DollarSign, ListTodo } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Metrics {
  totalHoras: number;
  totalTareas: number;
  totalMonto: number;
}

// Función para convertir horas decimales a un formato legible (Hh Mm Ss)
function formatDuration(decimalHours: number): string {
  const totalSeconds = Math.round(decimalHours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  let parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

//
// Goal interfaces
//
interface Goal {
  _id: string
  title: string
  targetAmount: number
  startDate: string
  endDate: string
}
interface GoalWithProgress extends Goal {
  progress: {
    achieved: number
    remaining: number
    percent: number
    days: number
    dailyTarget: number
    hoursPerDay: number
  }
}

export default function DashboardPage() {
  const [dailyMetrics, setDailyMetrics] = useState<Metrics | null>(null);
  const [weeklyMetrics, setWeeklyMetrics] = useState<Metrics | null>(null);
  const [monthlyMetrics, setMonthlyMetrics] = useState<Metrics | null>(null);
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoadingGoals, setIsLoadingGoals] = useState(true)

  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  function parseLocalDate(dateStr: string): Date {
    const d = new Date(dateStr)
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset())
    return d
  }
  
  const fetchMetrics = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch(`${apiUrl}/api/metrics/daily`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/metrics/weekly`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/metrics/monthly`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!dailyRes.ok || !weeklyRes.ok || !monthlyRes.ok) {
        throw new Error("Failed to fetch metrics");
      }

      const daily = await dailyRes.json();
      const weekly = await weeklyRes.json();
      const monthly = await monthlyRes.json();

      setDailyMetrics(daily);
      setWeeklyMetrics(weekly);
      setMonthlyMetrics(monthly);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al cargar las métricas"
      );
    } finally {
      setIsLoading(false);
    }
  };

    // Fetch goals + progress from API
    const fetchGoals = async () => {
      setIsLoadingGoals(true)
      const token = localStorage.getItem("token")
      try {
        const res = await fetch(`${apiUrl}/api/goals`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error("Failed to load goals")
        const list: Goal[] = await res.json()
        const detailed = await Promise.all(
          list.map(async g => {
            const r2 = await fetch(`${apiUrl}/api/goals/${g._id}`, { headers: { Authorization: `Bearer ${token}` } })
            if (!r2.ok) throw new Error(`Failed to load goal ${g._id}`)
            const det = await r2.json()
            const pct = Math.min(Math.round(parseFloat(det.progress.percent)), 100)
            return {
              ...g,
              progress: {
                achieved: det.progress.achieved,
                remaining: det.progress.remaining,
                percent: pct,
                days: det.progress.days,
                dailyTarget: det.progress.dailyTarget,
                hoursPerDay: det.progress.hoursPerDay,
              },
            }
          })
        )
        setGoals(detailed)
      } catch (err: any) {
        toast.error(err.message || "Error loading goals")
      } finally {
        setIsLoadingGoals(false)
      }
    }

  useEffect(() => {
    fetchMetrics();
    fetchGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight py-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your work hours and earnings
        </p>
      </div>
      {/* Goals Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">My Goals</h2>
        </div>
        {isLoadingGoals ? (
          <p>Loading goals…</p>
        ) : goals.length === 0 ? (
          <p>No goals yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map(g => (
              <Card key={g._id}>
              <CardHeader className="flex justify-between items-start">
                <div>
                  <CardTitle className="py-2">{g.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(parseLocalDate(g.startDate), "dd/MM/yyyy")} –{" "}
                    {format(parseLocalDate(g.endDate), "dd/MM/yyyy")}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>${g.progress.achieved.toFixed(2)}</span>
                  <span>${g.targetAmount.toFixed(2)}</span>
                </div>

                {/* Progress bar with green fill only */}
                <div className="relative">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${g.progress.percent}%` }}
                    />
                  </div>
                  {[25, 50, 75, 100].map((mark) => (
                    <div
                      key={mark}
                      className="absolute top-0 h-full w-[2px] bg-muted-foreground"
                      style={{ left: `${mark}%`, transform: "translateX(-50%)" }}
                    />
                  ))}
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  {[0, 25, 50, 75, 100].map((p) => (
                    <span key={p}>{p}%</span>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">
                  {g.progress.days} days remaining • ~$
                  {g.progress.dailyTarget.toFixed(2)} per day
                </p>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Duración (Daily) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    dailyMetrics
                      ? formatDuration(dailyMetrics.totalHoras)
                      : "0s"
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
            {/* Tasks Completed (Daily) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    dailyMetrics?.totalTareas || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
            {/* Earnings (Daily) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    `$${dailyMetrics?.totalMonto || 0}`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="weekly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Duración (Weekly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    weeklyMetrics
                      ? formatDuration(weeklyMetrics.totalHoras)
                      : "0s"
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This Week</p>
              </CardContent>
            </Card>
            {/* Tasks Completed (Weekly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    weeklyMetrics?.totalTareas || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This Week</p>
              </CardContent>
            </Card>
            {/* Earnings (Weekly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    `$${weeklyMetrics?.totalMonto || 0}`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This Week</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="monthly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Duración (Monthly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    monthlyMetrics
                      ? formatDuration(monthlyMetrics.totalHoras)
                      : "0s"
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This Month</p>
              </CardContent>
            </Card>
            {/* Tasks Completed (Monthly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    monthlyMetrics?.totalTareas || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This Month</p>
              </CardContent>
            </Card>
            {/* Earnings (Monthly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    `$${monthlyMetrics?.totalMonto || 0}`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This Month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
