"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

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

export default function GoalDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL!
  const [goal, setGoal] = useState<GoalDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [open, setOpen] = useState(false)

  async function fetchGoal() {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${apiUrl}/api/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to load goal")
      setGoal(await res.json())
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
      router.push("/goals")
    } catch (err) {
      toast.error((err as Error).message || "Error deleting goal")
    }
  }

  useEffect(() => {
    fetchGoal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (isLoading || !goal) return <p>Loading…</p>

  const { title, targetAmount, startDate, endDate, progress } = goal
  const achieved      = progress.achieved
  const daysRemaining = progress.days
  const dailyTarget   = progress.dailyTarget
  const percentNum    = Math.min(Math.round(parseFloat(progress.percent)), 100)

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/goals/${id}/edit`)}
          >
            Edit
          </Button>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={deleteGoal}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>${achieved.toFixed(2)}</span>
            <span>${targetAmount.toFixed(2)}</span>
          </div>
          <Progress value={percentNum} />
          <div className="text-xs text-muted-foreground">{percentNum}%</div>
          <p className="text-sm">
            {format(parseLocalDate(startDate), "dd/MM/yyyy")} –{" "}
            {format(parseLocalDate(endDate), "dd/MM/yyyy")}
          </p>
          <p className="text-sm">
            {daysRemaining} days remaining • ~${dailyTarget.toFixed(2)} per day
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
