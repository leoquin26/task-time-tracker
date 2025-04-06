"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, CalendarIcon, InfoIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface UserProfile {
  hourlyRate: number
}

export default function EditTaskPage() {
  const params = useParams()
  const taskId = params.id as string

  // States for date and normal time (tasking time)
  const [fecha, setFecha] = useState<Date | undefined>(undefined)
  const [horas, setHoras] = useState(0)
  const [minutos, setMinutos] = useState(0)
  const [segundos, setSegundos] = useState(0)

  // States for exceeded time
  const [exceedHoras, setExceedHoras] = useState(0)
  const [exceedMinutos, setExceedMinutos] = useState(0)
  const [exceedSegundos, setExceedSegundos] = useState(0)

  const [monto, setMonto] = useState(0)
  const [descripcion, setDescripcion] = useState("")

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  const router = useRouter()
  const { toast } = useToast()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  // Load user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token")
      try {
        const response = await fetch(`${apiUrl}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          throw new Error("Failed to fetch user profile")
        }
        const data = await response.json()
        setUserProfile(data)
      } catch (_) {
        toast.error("Error loading user profile")
      } finally {
        setIsLoadingProfile(false)
      }
    }
    fetchUserProfile()
  }, [toast, apiUrl])

  // Load task data
  useEffect(() => {
    const fetchTask = async () => {
      const token = localStorage.getItem("token")
      try {
        const response = await fetch(`${apiUrl}/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          throw new Error("Failed to fetch task")
        }
        const data = await response.json()
        // Convert received date to Date object
        const taskDate = new Date(data.fecha)
        setFecha(taskDate)

        // For normal time: use data.taskingHours if it exists; otherwise, data.horas
        const totalNormal = data.taskingHours !== undefined ? data.taskingHours : data.horas || 0
        const normalHorasEnteras = Math.floor(totalNormal)
        const normalMinutosDecimales = (totalNormal - normalHorasEnteras) * 60
        const normalMinutosEnteros = Math.floor(normalMinutosDecimales)
        const normalSegundosEnteros = Math.round((normalMinutosDecimales - normalMinutosEnteros) * 60)
        setHoras(normalHorasEnteras)
        setMinutos(normalMinutosEnteros)
        setSegundos(normalSegundosEnteros)

        // For exceeded time: use data.exceedHours if it exists, otherwise 0
        const totalExceed = data.exceedHours !== undefined ? data.exceedHours : 0
        const exceedHorasEnteras = Math.floor(totalExceed)
        const exceedMinutosDecimales = (totalExceed - exceedHorasEnteras) * 60
        const exceedMinutosEnteros = Math.floor(exceedMinutosDecimales)
        const exceedSegundosEnteros = Math.round((exceedMinutosDecimales - exceedMinutosEnteros) * 60)
        setExceedHoras(exceedHorasEnteras)
        setExceedMinutos(exceedMinutosEnteros)
        setExceedSegundos(exceedSegundosEnteros)

        setMonto(data.monto)
        setDescripcion(data.descripcion)
      } catch (_) {
        toast.error("Error loading task")
        router.push("/tasks")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTask()
  }, [taskId, router, toast, apiUrl])

  // Recalculate amount when times are modified (normal and exceeded)
  useEffect(() => {
    if (userProfile?.hourlyRate) {
      const fullRate = userProfile.hourlyRate
      const normalTime = horas + minutos / 60 + segundos / 3600
      const exceedTime = exceedHoras + exceedMinutos / 60 + exceedSegundos / 3600
      const calculatedAmount = normalTime * fullRate + exceedTime * fullRate * 0.3
      setMonto(Number(calculatedAmount.toFixed(2)))
    }
  }, [horas, minutos, segundos, exceedHoras, exceedMinutos, exceedSegundos, userProfile])

  // Function to handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setFecha(date)
    if (date) {
      console.log("Selected date:", date)
      console.log("Formatted date:", format(date, "yyyy-MM-dd"))
    }
  }

  // Submit the edit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile?.hourlyRate) {
      toast.error("You must set your hourly rate in your profile")
      return
    }
    if (!fecha) {
      toast.error("You must select a date")
      return
    }
    setIsSaving(true)
    const token = localStorage.getItem("token")
    // Calculate times in decimal format
    const normalTime = horas + minutos / 60 + segundos / 3600
    const exceedTime = exceedHoras + exceedMinutos / 60 + exceedSegundos / 3600
    const formattedDate = format(fecha, "yyyy-MM-dd")
    try {
      const response = await fetch(`${apiUrl}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Send separate fields for normal and exceeded time
        body: JSON.stringify({
          fecha: formattedDate,
          taskingHours: normalTime,
          exceedHours: exceedTime,
          descripcion,
        }),
      })
      if (!response.ok) {
        throw new Error("Failed to update task")
      }
      toast.success("Task updated successfully")
      router.push("/tasks")
    } catch (_) {
      toast.error("Error updating task")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Task</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
            <CardDescription>Update your task details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!userProfile?.hourlyRate && !isLoadingProfile && (
              <Alert variant="destructive" className="mb-4">
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  You must set your hourly rate in your{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-destructive underline"
                    onClick={() => router.push("/profile")}
                  >
                    profile
                  </Button>{" "}
                  to edit tasks.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fecha">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" id="fecha">
                    {fecha ? format(fecha, "MM/dd/yyyy") : <span className="text-muted-foreground">Select date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fecha}
                    onSelect={handleDateSelect}
                    locale={enUS}
                    initialFocus
                    fixedWeeks
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Fields for Normal Time */}
            <div className="space-y-2">
              <Label>Normal Time (hours, minutes, seconds)</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="horas" className="text-xs">
                    Hours
                  </Label>
                  <Input
                    id="horas"
                    type="number"
                    min="0"
                    value={horas}
                    onChange={(e) => setHoras(Number.parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minutos" className="text-xs">
                    Minutes
                  </Label>
                  <Input
                    id="minutos"
                    type="number"
                    min="0"
                    max="59"
                    value={minutos}
                    onChange={(e) => setMinutos(Number.parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="segundos" className="text-xs">
                    Seconds
                  </Label>
                  <Input
                    id="segundos"
                    type="number"
                    min="0"
                    max="59"
                    value={segundos}
                    onChange={(e) => setSegundos(Number.parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Fields for Exceeded Time */}
            <div className="space-y-2">
              <Label>Exceeded Time (hours, minutes, seconds)</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="exceedHoras" className="text-xs">
                    Hours
                  </Label>
                  <Input
                    id="exceedHoras"
                    type="number"
                    min="0"
                    value={exceedHoras}
                    onChange={(e) => setExceedHoras(Number.parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="exceedMinutos" className="text-xs">
                    Minutes
                  </Label>
                  <Input
                    id="exceedMinutos"
                    type="number"
                    min="0"
                    max="59"
                    value={exceedMinutos}
                    onChange={(e) => setExceedMinutos(Number.parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="exceedSegundos" className="text-xs">
                    Seconds
                  </Label>
                  <Input
                    id="exceedSegundos"
                    type="number"
                    min="0"
                    max="59"
                    value={exceedSegundos}
                    onChange={(e) => setExceedSegundos(Number.parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto">Amount ($)</Label>
              <Input id="monto" type="number" step="0.01" min="0" value={monto} disabled className="bg-muted" />
              <p className="text-sm text-muted-foreground">
                {userProfile?.hourlyRate
                  ? `Automatically calculated using your rate of $${userProfile.hourlyRate}/hour and exceeded time at 30% of that rate`
                  : "Set your hourly rate in your profile to calculate the amount"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Description</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between pt-6">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !userProfile?.hourlyRate}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

