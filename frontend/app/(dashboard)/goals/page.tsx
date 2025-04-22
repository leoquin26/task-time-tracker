"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2 } from "lucide-react"

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

export default function GoalsListPage() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const { toast } = useToast()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const router = useRouter()

  const fetchGoals = async () => {
    setIsLoading(true)
    const token = localStorage.getItem("token")
    try {
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
          if (!r2.ok) throw new Error(`Failed to load goal ${g._id}`)
          const detail = await r2.json()
          const percentNum = Math.min(
            Math.round(parseFloat(detail.progress.percent)),
            100
          )
          return {
            ...g,
            progress: {
              achieved: detail.progress.achieved,
              remaining: detail.progress.remaining,
              percent: percentNum,
              days: detail.progress.days,
              dailyTarget: detail.progress.dailyTarget,
              hoursPerDay: detail.progress.hoursPerDay,
            },
          }
        })
      )
      setGoals(detailed)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error loading goals")
    } finally {
      setIsLoading(false)
    }
  }

  const deleteGoal = async (id: string) => {
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${apiUrl}/api/goals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to delete goal")
      toast.success("Goal deleted")
      setOpenId(null)
      fetchGoals()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting goal")
    }
  }

  useEffect(() => {
    fetchGoals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Goals</h1>
        <Button onClick={() => router.push("/goals/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : goals.length === 0 ? (
        <p>No goals yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => (
            <Card key={g._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex justify-between items-start">
                <div>
                  <CardTitle>{g.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(g.startDate), "dd/MM/yyyy")} –{" "}
                    {format(new Date(g.endDate), "dd/MM/yyyy")}
                  </p>
                </div>
                <AlertDialog open={openId === g._id} onOpenChange={(o) => !o && setOpenId(null)}>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive-foreground"
                      onClick={() => setOpenId(g._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete goal</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this goal? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteGoal(g._id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>${g.progress.achieved.toFixed(2)}</span>
                  <span>${g.targetAmount.toFixed(2)}</span>
                </div>
                <Progress value={g.progress.percent} />
                <div className="text-xs text-muted-foreground">
                  {g.progress.percent}%
                </div>
                <p className="text-sm">
                  {g.progress.days} days remaining • ~$
                  {g.progress.dailyTarget.toFixed(2)} per day
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
