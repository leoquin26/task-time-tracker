"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GoalCard } from "@/components/goal-card"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { zonedTimeToUtc, toZonedTime } from "date-fns-tz"

// Ajusta un ISO-8601 al inicio de ese día en tu zona local
function parseLocalDate(dateStr: string, timezone: string): Date {
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

interface GoalWithProgress {
  _id: string
  title: string
  targetAmount: number
  currentAmount: number
  startDate: string
  endDate: string
  progress: {
    achieved: number
    remaining: number
    percent: number
    days: number
    dailyTarget: number
    hoursPerDay: number
  }
}

export default function GoalDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL!
  const [goal, setGoal] = useState<GoalWithProgress | null>(null)
  const [timezone, setTimezone] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

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

  async function fetchGoal() {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${apiUrl}/api/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to load goal")
      const data: GoalDetail = await res.json()

      // Transform GoalDetail into GoalWithProgress
      const transformedGoal: GoalWithProgress = {
        ...data,
        currentAmount: data.progress.achieved,
        progress: {
          ...data.progress,
          percent: Math.min(Math.round(parseFloat(data.progress.percent)), 100),
        },
      }

      setGoal(transformedGoal)
    } catch (err) {
      toast.error((err as Error).message || "Error loading goal")
    } finally {
      setIsLoading(false)
    }
  }

  async function deleteGoal() {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${apiUrl}/api/goals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to delete goal")
      toast.success("Goal deleted")
      setOpenId(null)
      router.push("/goals")
    } catch (err) {
      toast.error((err as Error).message || "Error deleting goal")
    }
  }

  useEffect(() => {
    fetchUserTimezone().then(() => fetchGoal())
  }, [id])

  if (isLoading || !goal || !timezone) return <p>Loading…</p>

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{goal.title}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/goals/${id}/edit`)}
          >
            Edit
          </Button>
        </div>
      </div>

      <GoalCard
        goal={goal}
        openId={openId}
        setOpenId={setOpenId}
        deleteGoal={deleteGoal}
        parseLocalDate={(dateStr) => parseLocalDate(dateStr, timezone)}
      />
    </div>
  )
}