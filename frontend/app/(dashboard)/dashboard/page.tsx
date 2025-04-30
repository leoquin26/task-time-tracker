"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, DollarSign, ListTodo, TrendingUp, Target } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { toZonedTime } from "date-fns-tz"
import { format } from "date-fns"
import { GoalCard } from "@/components/goal-card"
import { LineChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Metrics {
  totalHoras: number
  totalTareas: number
  totalMonto: number
  productivity: number
  target: number
  trend: number
  shortfall: number
  previousPeriod: number
  avgTasksPerDay: number
  avgHoursPerDay: number
  avgEarningsPerDay: number
  daysConsidered: number
  avgTasksPerDayThisWeek?: number
  avgHoursPerDayThisWeek?: number
  avgEarningsPerDayThisWeek?: number
  avgTasksPerDayThisMonth?: number
  avgHoursPerDayThisMonth?: number
  avgEarningsPerDayThisMonth?: number
  avgTasksPerDayHistorical?: number
  avgHoursPerDayHistorical?: number
  avgEarningsPerDayHistorical?: number
}

interface HistoricalMetric {
  period: string
  totalHoras: number
  totalTareas: number
  totalMonto: number
  avgTasksPerDay: number
  avgHoursPerDay: number
  avgEarningsPerDay: number
}

// Función para convertir horas decimales a un formato legible (Hh Mm Ss)
function formatDuration(decimalHours: number): string {
  const totalSeconds = Math.round(decimalHours * 3600)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  let parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)
  return parts.join(" ")
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
  currentAmount: number
  progress: {
    achieved: number
    remaining: number
    percent: number
    days: number
    dailyTarget: number
    hoursPerDay: number
  }
}

function parseLocalDate(dateStr: string, timezone: string): Date {
  return toZonedTime(new Date(dateStr), timezone);
}

export default function DashboardPage() {
  const [dailyMetrics, setDailyMetrics] = useState<Metrics | null>(null)
  const [weeklyMetrics, setWeeklyMetrics] = useState<Metrics | null>(null)
  const [monthlyMetrics, setMonthlyMetrics] = useState<Metrics | null>(null)
  const [dailyHistory, setDailyHistory] = useState<HistoricalMetric[]>([])
  const [weeklyHistory, setWeeklyHistory] = useState<HistoricalMetric[]>([])
  const [monthlyHistory, setMonthlyHistory] = useState<HistoricalMetric[]>([])
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoadingGoals, setIsLoadingGoals] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null) // For goal deletion dialog
  const [timezone, setTimezone] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const fetchUserTimezone = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${apiUrl}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch user")
      const user = await res.json()
      setTimezone(user.timezone || "UTC")
    } catch (err) {
      toast.error("Failed to fetch user timezone, defaulting to UTC")
      setTimezone("UTC")
    }
  }

  const fetchMetrics = async () => {
    setIsLoading(true)
    const token = localStorage.getItem("token")

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
      ])

      if (!dailyRes.ok || !weeklyRes.ok || !monthlyRes.ok) {
        throw new Error("Failed to fetch metrics")
      }

      const daily = await dailyRes.json()
      const weekly = await weeklyRes.json()
      const monthly = await monthlyRes.json()

      setDailyMetrics(daily)
      setWeeklyMetrics(weekly)
      setMonthlyMetrics(monthly)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al cargar las métricas"
      )
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHistoricalMetrics = async () => {
    const token = localStorage.getItem("token")
    try {
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch(`${apiUrl}/api/metrics/historical?period=daily&periodsBack=7`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/metrics/historical?period=weekly&periodsBack=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/metrics/historical?period=monthly&periodsBack=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!dailyRes.ok || !weeklyRes.ok || !monthlyRes.ok) {
        throw new Error("Failed to fetch historical metrics")
      }

      const dailyHistoryData = await dailyRes.json()
      const weeklyHistoryData = await weeklyRes.json()
      const monthlyHistoryData = await monthlyRes.json()

      setDailyHistory(dailyHistoryData)
      setWeeklyHistory(weeklyHistoryData)
      setMonthlyHistory(monthlyHistoryData)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error loading historical metrics")
    }
  }

  // Fetch goals + progress from API
  const fetchGoals = async () => {
    if (!timezone) return; // Wait for timezone to be fetched
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
            currentAmount: det.progress.achieved, // Map achieved to currentAmount
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

  // Delete a single goal
  async function deleteGoal(id: string) {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${apiUrl}/api/goals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to delete goal")
      toast.success("Goal deleted")
      setOpenId(null)
      fetchGoals()
    } catch (err) {
      toast.error((err as Error).message || "Error deleting goal")
    }
  }

  useEffect(() => {
    fetchUserTimezone().then(() => {
      fetchMetrics()
      fetchGoals()
      fetchHistoricalMetrics()
    })
  }, [timezone])

  if (!timezone) return <p>Loading timezone...</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight py-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your work hours, earnings, and productivity
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
              <GoalCard
                key={g._id}
                goal={g}
                openId={openId}
                setOpenId={setOpenId}
                deleteGoal={deleteGoal}
                parseLocalDate={(dateStr) => parseLocalDate(dateStr, timezone)}
                timezone={timezone}
              />
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

        {/* Daily Metrics */}
        <TabsContent value="daily" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Duración (Daily) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duration Today</CardTitle>
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
                <p className="text-xs text-muted-foreground">
                  Avg: {isLoading ? '...' : dailyMetrics ? `${formatDuration(dailyMetrics.avgHoursPerDay)}/day over ${dailyMetrics.daysConsidered} days` : '0s'}
                </p>
              </CardContent>
            </Card>
            {/* Tasks Completed (Daily) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Completed Today</CardTitle>
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
                <p className="text-xs text-muted-foreground">
                  Avg: {isLoading ? '...' : dailyMetrics ? `${dailyMetrics.avgTasksPerDay.toFixed(2)}/day over ${dailyMetrics.daysConsidered} days` : '0'}
                </p>
              </CardContent>
            </Card>
            {/* Earnings (Daily) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Earnings Today</CardTitle>
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
                <p className="text-xs text-muted-foreground">
                  Avg: {isLoading ? '...' : dailyMetrics ? `$${dailyMetrics.avgEarningsPerDay.toFixed(2)}/day over ${dailyMetrics.daysConsidered} days` : '$0'}
                </p>
              </CardContent>
            </Card>
            {/* Productivity (Daily) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productivity</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    `${dailyMetrics?.productivity || 0}%`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: ${dailyMetrics?.target.toFixed(2) || 0} / day
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trend and Historical Chart */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Trend vs Yesterday</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <TrendingUp className={`h-4 w-4 ${(dailyMetrics?.trend ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <div className={`text-2xl font-bold ${(dailyMetrics?.trend ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {isLoading ? (
                      <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                    ) : (
                      `${dailyMetrics?.trend ?? 0}%`
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Yesterday: ${dailyMetrics?.previousPeriod.toFixed(2) || 0}
                  {(dailyMetrics?.trend ?? 0) < 0 && dailyMetrics?.shortfall ? ` (Need $${dailyMetrics.shortfall.toFixed(2)} to match)` : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Earnings Over Last 7 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="totalMonto" name="Earnings ($)" stroke="#8884d8" />
                      <Line type="monotone" dataKey="avgEarningsPerDay" name="Avg Earnings/Day ($)" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Weekly Metrics */}
        <TabsContent value="weekly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Duración (Weekly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Duration This Week</CardTitle>
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
                <p className="text-xs text-muted-foreground">
                  Avg: {isLoading ? '...' : weeklyMetrics ? `${formatDuration(weeklyMetrics.avgHoursPerDayThisWeek || 0)}/day this week` : '0s'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Historical Avg: {isLoading ? '...' : weeklyMetrics ? `${formatDuration(weeklyMetrics.avgHoursPerDayHistorical || 0)}/day over ${weeklyMetrics.daysConsidered} days` : '0s'}
                </p>
              </CardContent>
            </Card>
            {/* Tasks Completed (Weekly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Completed This Week</CardTitle>
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
                <p className="text-xs text-muted-foreground">
                  Avg: {isLoading ? '...' : weeklyMetrics ? `${(weeklyMetrics.avgTasksPerDayThisWeek || 0).toFixed(2)}/day this week` : '0'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Historical Avg: {isLoading ? '...' : weeklyMetrics ? `${(weeklyMetrics.avgTasksPerDayHistorical || 0).toFixed(2)}/day over ${weeklyMetrics.daysConsidered} days` : '0'}
                </p>
              </CardContent>
            </Card>
            {/* Earnings (Weekly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Earnings This Week</CardTitle>
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
                <p className="text-xs text-muted-foreground">
                  Avg: {isLoading ? '...' : weeklyMetrics ? `$${(weeklyMetrics.avgEarningsPerDayThisWeek || 0).toFixed(2)}/day this week` : '$0'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Historical Avg: {isLoading ? '...' : weeklyMetrics ? `$${(weeklyMetrics.avgEarningsPerDayHistorical || 0).toFixed(2)}/day over ${weeklyMetrics.daysConsidered} days` : '$0'}
                </p>
              </CardContent>
            </Card>
            {/* Productivity (Weekly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productivity</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    `${weeklyMetrics?.productivity || 0}%`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: ${weeklyMetrics?.target.toFixed(2) || 0} / week
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trend and Historical Chart */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Trend vs Last Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <TrendingUp className={`h-4 w-4 ${(weeklyMetrics?.trend ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <div className={`text-2xl font-bold ${(weeklyMetrics?.trend ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {isLoading ? (
                      <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                    ) : (
                      `${weeklyMetrics?.trend ?? 0}%`
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last Week: ${weeklyMetrics?.previousPeriod.toFixed(2) || 0}
                  {(weeklyMetrics?.trend ?? 0) < 0 && weeklyMetrics?.shortfall ? ` (Need $${weeklyMetrics.shortfall.toFixed(2)} to match)` : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Earnings Over Last 5 Weeks</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalMonto" name="Total Earnings ($)" fill="#8884d8" />
                      <Bar dataKey="avgEarningsPerDay" name="Avg Earnings/Day ($)" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monthly Metrics */}
        <TabsContent value="monthly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Duración (Monthly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Duration This Month</CardTitle>
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
                <p className="text-xs text-muted-foreground">
                  Avg: {isLoading ? '...' : monthlyMetrics ? `${formatDuration(monthlyMetrics.avgHoursPerDayThisMonth || 0)}/day this month` : '0s'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Historical Avg: {isLoading ? '...' : monthlyMetrics ? `${formatDuration(monthlyMetrics.avgHoursPerDayHistorical || 0)}/day over ${monthlyMetrics.daysConsidered} days` : '0s'}
                </p>
              </CardContent>
            </Card>
            {/* Tasks Completed (Monthly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Completed This Month</CardTitle>
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
                <p className="text-xs text-muted-foreground">
                  Avg: {isLoading ? '...' : monthlyMetrics ? `${(monthlyMetrics.avgTasksPerDayThisMonth || 0).toFixed(2)}/day this month` : '0'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Historical Avg: {isLoading ? '...' : monthlyMetrics ? `${(monthlyMetrics.avgTasksPerDayHistorical || 0).toFixed(2)}/day over ${monthlyMetrics.daysConsidered} days` : '0'}
                </p>
              </CardContent>
            </Card>
            {/* Earnings (Monthly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Earnings This Month</CardTitle>
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
                <p className="text-xs text-muted-foreground">
                  Avg: {isLoading ? '...' : monthlyMetrics ? `$${(monthlyMetrics.avgEarningsPerDayThisMonth || 0).toFixed(2)}/day this month` : '$0'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Historical Avg: {isLoading ? '...' : monthlyMetrics ? `$${(monthlyMetrics.avgEarningsPerDayHistorical || 0).toFixed(2)}/day over ${monthlyMetrics.daysConsidered} days` : '$0'}
                </p>
              </CardContent>
            </Card>
            {/* Productivity (Monthly) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productivity</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                  ) : (
                    `${monthlyMetrics?.productivity || 0}%`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: ${monthlyMetrics?.target.toFixed(2) || 0} / month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trend and Historical Chart */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Trend vs Last Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <TrendingUp className={`h-4 w-4 ${(monthlyMetrics?.trend ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <div className={`text-2xl font-bold ${(monthlyMetrics?.trend ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {isLoading ? (
                      <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                    ) : (
                      `${monthlyMetrics?.trend ?? 0}%`
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last Month: ${monthlyMetrics?.previousPeriod.toFixed(2) || 0}
                  {(monthlyMetrics?.trend ?? 0) < 0 && monthlyMetrics?.shortfall ? ` (Need $${monthlyMetrics.shortfall.toFixed(2)} to match)` : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Earnings Over Last 5 Months</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalMonto" name="Total Earnings ($)" fill="#8884d8" />
                      <Bar dataKey="avgEarningsPerDay" name="Avg Earnings/Day ($)" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}