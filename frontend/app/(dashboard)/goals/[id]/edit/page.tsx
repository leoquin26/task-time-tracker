"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { formatISO } from "date-fns"

export default function EditGoalPage() {
  const { id } = useParams()
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const [title, setTitle] = useState("")
  const [targetAmount, setTargetAmount] = useState(0)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchGoal = async () => {
    setIsLoading(true)
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${apiUrl}/api/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to load goal")
      const g = await res.json()

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

  useEffect(() => {
    fetchGoal()
  }, [id])

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

  if (isLoading) return <p>Loading…</p>

  return (
    <form className="space-y-4 max-w-md" onSubmit={handleSubmit}>
      <h1 className="text-xl font-bold">Edit Goal</h1>
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
  )
}
