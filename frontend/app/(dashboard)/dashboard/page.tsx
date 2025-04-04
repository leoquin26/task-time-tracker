"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, DollarSign, ListTodo } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Metrics {
  totalHoras: number;
  totalTareas: number;
  totalMonto: number;
}

export default function DashboardPage() {
  // Se inicializan las métricas con valores por defecto
  const [dailyMetrics, setDailyMetrics] = useState<Metrics>({
    totalHoras: 0,
    totalTareas: 0,
    totalMonto: 0,
  });
  const [weeklyMetrics, setWeeklyMetrics] = useState<Metrics>({
    totalHoras: 0,
    totalTareas: 0,
    totalMonto: 0,
  });
  const [monthlyMetrics, setMonthlyMetrics] = useState<Metrics>({
    totalHoras: 0,
    totalTareas: 0,
    totalMonto: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Utiliza una variable de entorno para la URL base de la API (o usa localhost por defecto)
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchMetrics = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      // Se utilizan las URL basadas en API_BASE
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch(`${API_BASE}/api/metrics/daily`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/metrics/weekly`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/metrics/monthly`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!dailyRes.ok || !weeklyRes.ok || !monthlyRes.ok) {
        throw new Error("Failed to fetch metrics");
      }

      const daily: Metrics = await dailyRes.json();
      const weekly: Metrics = await weeklyRes.json();
      const monthly: Metrics = await monthlyRes.json();

      setDailyMetrics(daily);
      setWeeklyMetrics(weekly);
      setMonthlyMetrics(monthly);
    } catch (error) {
      toast.error("Error al cargar las métricas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your work hours and earnings
        </p>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hours Worked</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    `${dailyMetrics.totalHoras}h`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
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
                    dailyMetrics.totalTareas
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
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
                    `$${dailyMetrics.totalMonto}`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="weekly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hours Worked</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    `${weeklyMetrics.totalHoras}h`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This Week</p>
              </CardContent>
            </Card>
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
                    weeklyMetrics.totalTareas
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This Week</p>
              </CardContent>
            </Card>
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
                    `$${weeklyMetrics.totalMonto}`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This Week</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="monthly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hours Worked</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    `${monthlyMetrics.totalHoras}h`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This Month</p>
              </CardContent>
            </Card>
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
                    monthlyMetrics.totalTareas
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This Month</p>
              </CardContent>
            </Card>
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
                    `$${monthlyMetrics.totalMonto}`
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
