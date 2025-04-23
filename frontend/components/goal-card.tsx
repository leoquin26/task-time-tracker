import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Trash2 } from "lucide-react"

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

interface GoalCardProps {
  goal: GoalWithProgress
  openId: string | null
  setOpenId: (id: string | null) => void
  deleteGoal: (id: string) => void
  parseLocalDate: (dateStr: string) => Date
}

export function GoalCard({ goal, openId, setOpenId, deleteGoal, parseLocalDate }: GoalCardProps) {
  // Use progress.achieved for consistency with displayed value
  const percent = goal.targetAmount > 0 
    ? Math.min(Math.round((goal.progress.achieved / goal.targetAmount) * 100), 100) 
    : 0;

  // State to track animated percentage for this goal
  const [animatedPercent, setAnimatedPercent] = useState(0)

  // Animate the percentage on mount
  useEffect(() => {
    let currentPercent = 0
    const interval = setInterval(() => {
      if (currentPercent < percent) {
        currentPercent += 1
        setAnimatedPercent(currentPercent)
      } else {
        clearInterval(interval)
        setAnimatedPercent(percent) // Ensure it matches exactly
      }
    }, 20) // Adjust speed by changing the interval time

    return () => clearInterval(interval)
  }, [percent])

  // Define the milestones
  const milestones = [0, 25, 50, 75, 100]

  // Find the current milestone based on animated percentage
  const currentMilestone = milestones.reduce((prev, curr) =>
    animatedPercent >= curr ? curr : prev
  )

  return (
    <Link href={`/goals/${goal._id}`}>
      <Card>
        <CardHeader className="flex justify-between items-start">
          <div>
            <CardTitle className="py-2">{goal.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(parseLocalDate(goal.startDate), "dd/MM/yyyy")} –{" "}
              {format(parseLocalDate(goal.endDate), "dd/MM/yyyy")}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span>${goal.progress.achieved.toFixed(2)}</span>
            <span>${goal.targetAmount.toFixed(2)}</span>
          </div>

          {/* Progress bar with green fill */}
          <div className="relative">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-200"
                style={{ width: `${animatedPercent}%` }}
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

          {/* Percentage labels with a moving label */}
          <div className="relative flex justify-between text-xs text-muted-foreground">
            {/* Static milestone labels */}
            {milestones.map((p) => (
              <span
                key={p}
                className={`transition-opacity duration-300 ${
                  p === currentMilestone && animatedPercent < (milestones[milestones.indexOf(p) + 1] || 100)
                    ? "opacity-50"
                    : "opacity-100"
                }`}
              >
                {p}%
              </span>
            ))}
            {/* Moving percentage label */}
            <span
              className="absolute text-xs text-green-500 transition-all duration-200"
              style={{
                left: `${animatedPercent}%`,
                transform: "translateX(-50%)",
              }}
            >
              {animatedPercent}%
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            {goal.progress.days} days remaining • ~$
            {goal.progress.dailyTarget.toFixed(2)} per day
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}