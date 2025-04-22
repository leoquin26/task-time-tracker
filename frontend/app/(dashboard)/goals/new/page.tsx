"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { formatISO } from "date-fns"

export default function NewGoalPage() {
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const [title, setTitle] = useState("")
  const [targetAmount, setTargetAmount] = useState(0)
  const [startDate, setStartDate] = useState(formatISO(new Date(), { representation: "date" }))
  const [endDate, setEndDate] = useState(formatISO(new Date(), { representation: "date" }))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${apiUrl}/api/goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, targetAmount, startDate, endDate }),
      })
      if (!res.ok) throw new Error("Failed to create goal")
      toast.success("Goal created")
      router.push("/goals")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-4 max-w-md" onSubmit={handleSubmit}>
      <h1 className="text-xl font-bold">New Goal</h1>
      <div>
        <Label className="py-2">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <Label className="py-2">Target Amount ($)</Label>
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
          <Label className="py-2">Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label className="py-2">End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating…" : "Create Goal"}
      </Button>
    </form>
  )
}
