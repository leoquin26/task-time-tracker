"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { formatISO } from "date-fns"
import { GoalCard } from "@/components/goal-card"

// Ajusta un ISO-8601 al inicio de ese día en tu zona local
function parseLocalDate(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset())
  return d
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

export default function EditGoalPage() {
  const { id } = useParams()
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL!
  const [goal, setGoal] = useState<GoalWithProgress | null>(null)
  const [title, setTitle] = useState("")
  const [targetAmount, setTargetAmount] = useState(0)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null) // For delete dialog

  const fetchGoal = async () => {
    setIsLoading(true)
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${apiUrl}/api/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to load goal")
      const g: GoalDetail = await res.json()

      // Transform GoalDetail into GoalWithProgress
      const transformedGoal: GoalWithProgress = {
        ...g,
        currentAmount: g.progress.achieved,
        progress: {
          ...g.progress,
          percent: Math.min(Math.round(parseFloat(g.progress.percent)), 100),
        },
      }

      setGoal(transformedGoal)

      // Ajustar fechas para compensar el offset antes de formatear
      const sd = new Date(g.startDate)
      sd.setMinutes(sd.getMinutes() + sd.getTimezoneOffset())
      setStartDate(formatISO(sd, { representation: "date" }))

      const ed = new Date(g.endDate)
      ed.setMinutes(ed.getMinutes() + ed.getTimezoneOffset())
      setEndDate(formatISO(ed, { representation: "date" }))

      setTitle(g.title)
      setTargetAmount(g.targetAmount)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${apiUrl}/api/goals/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, targetAmount, startDate, endDate }),
      })
      if (!res.ok) throw new Error("Failed to update goal")
      toast.success("Goal updated")
      router.push(`/goals/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteGoal = async () => {
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
    fetchGoal()
  }, [id])

  if (isLoading || !goal) return <p>Loading…</p>

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Edit Goal: {goal.title}</h1>
      </div>

      {/* Display Current Goal Details Using GoalCard */}
      <GoalCard
        goal={goal}
        openId={openId}
        setOpenId={setOpenId}
        deleteGoal={deleteGoal}
        parseLocalDate={parseLocalDate}
      />

      {/* Edit Form */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="text-xl font-semibold">Update Goal Details</h2>
        <div>
          <Label className="p-2">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <Label className="p-2">Target Amount ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(parseFloat(e.target.value))}
            required
          />
        </div>
        <div className="flex gap-4">
          <div>
            <Label className="p-2">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label className="p-2">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </div>
  )
}