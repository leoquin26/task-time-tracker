"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, DollarSign, ListTodo } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface Metrics {
  totalHoras: number;
  totalTareas: number;
  totalMonto: number;
}

export default function DashboardPage() {
  const [dailyMetrics, setDailyMetrics] = useState<Metrics | null>(null);
  const [weeklyMetrics, setWeeklyMetrics] = useState<Metrics | null>(null);
  const [monthlyMetrics, setMonthlyMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMetrics = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch("http://localhost:5000/api/metrics/daily", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:5000/api/metrics/weekly", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:5000/api/metrics/monthly", {
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
      toast.error("Error al cargar las métricas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    `${dailyMetrics?.totalHoras || 0}h`
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
                    dailyMetrics?.totalTareas || 0
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
                    `${weeklyMetrics?.totalHoras || 0}h`
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
                    weeklyMetrics?.totalTareas || 0
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
                    `${monthlyMetrics?.totalHoras || 0}h`
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
                    monthlyMetrics?.totalTareas || 0
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