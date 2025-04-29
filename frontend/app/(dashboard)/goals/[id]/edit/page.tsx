"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"

// Ajusta un ISO-8601 al inicio de ese día en tu zona local
function parseLocalDate(dateStr: string, timezone: string): Date {
  // Convert the UTC date to the user's timezone
  const utcDate = new Date(dateStr)
  return toZonedTime(utcDate, timezone)
}

interface GoalDetail {
  _id: string
  title: string
  targetAmount: number
  startDate: string
  endDate: string
  progress: {
    achieved: number
    remaining: number
    percent: string
    days: number
    dailyTarget: number
    hoursPerDay: number
  }
}

export default function GoalDetailPage() {
  const { id } = useParams()Q
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL!
  const [goal, setGoal] = useState<GoalDetail | null>(null)
  const [timezone, setTimezone] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
Q
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

  const fetchGoal = async () => {
    setIsLoading(true)
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${apiUrl}/api/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to load goal")
      const data: GoalDetail = await res.json()
      setGoal(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserTimezone().then(() => fetchGoal())
  }, [id])

  if (isLoading || !goal || !timezone) return <p>Loading…</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{goal.title}</h1>
      </div>

      <Card className="relative">
        <CardHeader className="flex justify-between items-start">
          <div>
            <CardTitle className="py-2">{goal.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(parseLocalDate(goal.startDate, timezone), "dd/MM/yyyy")} –{" "}
              {format(parseLocalDate(goal.endDate, timezone), "dd/MM/yyyy")}
            </p>
          </div>

          <Button variant="outline" onClick={() => router.push(`/goals/${id}/edit`)}>
            Edit Goal
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span>${goal.progress.achieved.toFixed(2)}</span>
            <span>${goal.targetAmount.toFixed(2)}</span>
          </div>

          <div className="relative">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${goal.progress.percent}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {goal.progress.days} days remaining • ~$
            {goal.progress.dailyTarget.toFixed(2)} per day
          </p>

          <p className="text-sm text-muted-foreground">
            ~{goal.progress.hoursPerDay.toFixed(2)} hours per day
          </p>
        </CardContent>
      </Card>
    </div>
  )
}