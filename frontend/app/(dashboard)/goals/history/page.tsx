"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

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
    percentRemaining: number
    days: number
    dailyTarget: number
    hoursPerDay: number
  }
}

export default function GoalHistoryPage() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL!

  async function fetchGoalHistory() {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${apiUrl}/api/goals/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to load goal history")
      const data: GoalWithProgress[] = await res.json()
      setGoals(data)
    } catch (err) {
      toast.error((err as Error).message || "Error loading goal history")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGoalHistory()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Goal History</h1>
      {isLoading ? (
        <p>Loading…</p>
      ) : goals.length === 0 ? (
        <p>No completed goals yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {goals.map((g) => (
            <GoalHistoryCard key={g._id} goal={g} parseLocalDate={parseLocalDate} />
          ))}
        </div>
      )}
    </div>
  )
}

function GoalHistoryCard({ goal, parseLocalDate }: { goal: GoalWithProgress; parseLocalDate: (dateStr: string) => Date }) {
  const percent = goal.progress.percent;

  // State to track animated percentage
  const [animatedPercent, setAnimatedPercent] = useState(0);

  // Animate the percentage on mount
  useEffect(() => {
    let currentPercent = 0;
    const interval = setInterval(() => {
      if (currentPercent < percent) {
        currentPercent += 1;
        setAnimatedPercent(currentPercent);
      } else {
        clearInterval(interval);
        setAnimatedPercent(percent);
      }
    }, 20); // Adjust speed by changing the interval time

    return () => clearInterval(interval);
  }, [percent]);

  // Define the milestones
  const milestones = [0, 25, 50, 75, 100];

  // Find the current milestone based on animated percentage
  const currentMilestone = milestones.reduce((prev, curr) =>
    animatedPercent >= curr ? curr : prev
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="py-2">{goal.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(parseLocalDate(goal.startDate), "dd/MM/yyyy")} –{" "}
          {format(parseLocalDate(goal.endDate), "dd/MM/yyyy")}
        </p>
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

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Completed: {goal.progress.percent.toFixed(2)}%</p>
          <p>Remaining: {goal.progress.percentRemaining.toFixed(2)}%</p>
          <p>Daily Target: ${goal.progress.dailyTarget.toFixed(2)} (over {goal.progress.days} days)</p>
          {goal.progress.hoursPerDay > 0 && (
            <p>Hours per Day: {goal.progress.hoursPerDay.toFixed(2)} hrs</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}