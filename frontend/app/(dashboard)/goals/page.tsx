"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"
import { GoalCard } from "@/components/goal-card"
import Link from "next/link"

// Ajusta un ISO-8601 al inicio de ese día en tu zona local
function parseLocalDate(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset())
  return d
}

interface Goal {
  _id: string
  title: string
  targetAmount: number
  currentAmount: number
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

export default function GoalsListPage() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const { toast } = useToast()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL!
  const router = useRouter()

  async function fetchGoals() {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${apiUrl}/api/goals`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to load goals")
      const list: Goal[] = await res.json()

      const detailed = await Promise.all(
        list.map(async (g) => {
          const r2 = await fetch(`${apiUrl}/api/goals/${g._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!r2.ok) throw new Error("Failed to load goal " + g._id)
          const detail = await r2.json()
          return {
            ...g,
            progress: {
              achieved: detail.progress.achieved,
              remaining: detail.progress.remaining,
              percent: Math.min(
                Math.round(parseFloat(detail.progress.percent)),
                100
              ),
              days: detail.progress.days,
              dailyTarget: detail.progress.dailyTarget,
              hoursPerDay: detail.progress.hoursPerDay,
            },
          }
        })
      )

      setGoals(detailed)
    } catch (err) {
      toast.error((err as Error).message || "Error loading goals")
    } finally {
      setIsLoading(false)
    }
  }

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
    fetchGoals()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Active Goals</h1>
        <div className="flex gap-2">
          <Link href="/goals/history">
            <Button variant="outline">View Goal History</Button>
          </Link>
          <Button onClick={() => router.push("/goals/new")}>
            <Plus className="mr-2 h-4 w-4" /> Add Goal
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : goals.length === 0 ? (
        <p>No active goals yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {goals.map((g) => (
            <GoalCard
              key={g._id}
              goal={g}
              openId={openId}
              setOpenId={setOpenId}
              deleteGoal={deleteGoal}
              parseLocalDate={parseLocalDate} timezone={""}            />
          ))}
        </div>
      )}
    </div>
  )
}