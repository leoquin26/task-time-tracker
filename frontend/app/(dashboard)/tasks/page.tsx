"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, Filter, CalendarDays, Upload, CheckSquare } from "lucide-react"
import { toast } from "sonner"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

// Task interface
interface Task {
  _id: string
  fecha?: string
  horas?: number
  monto?: number
  descripcion?: string
  selected?: boolean // Para la funcionalidad de selección
}

// Response interface for paginated tasks
interface TasksResponse {
  tasks: Task[]
  total: number
  page: number
  pages: number
}

// Interfaz para el summary
interface Summary {
  totalTasks: number
  totalHours: number
  totalEarned: number
}

/**
 * Helper function para formatear una fecha de forma segura (ajustando el offset de zona horaria).
 */
function safeFormatDate(dateStr?: string): string {
  if (!dateStr) return "Sin fecha"
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return "Fecha inválida"
  // Ajusta agregando el offset de la zona horaria para mostrar la fecha como se almacenó
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
  return format(date, "dd/MM/yyyy", { locale: es })
}

/**
 * Helper function para formatear una fecha para mostrarla en el filtro.
 */
function formatDateToSpanish(date: Date): string {
  const adjustedDate = new Date(date)
  adjustedDate.setMinutes(adjustedDate.getMinutes() + adjustedDate.getTimezoneOffset())
  return format(adjustedDate, "dd/MM/yyyy", { locale: es })
}

/**
 * Helper function para convertir horas decimales a una cadena con formato "Xh Ym Zs"
 */
function formatDuration(decimalHours: number): string {
  const totalSeconds = Math.round(decimalHours * 3600)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)
  return parts.join(" ")
}

export default function DashboardPage() {

  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined)
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined)
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined)
  // Estos estados se usan para los cálculos de los otros tabs (no "all")
  const [totalHours, setTotalHours] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  // Estados para selección de tareas
  const [selectMode, setSelectMode] = useState(false)
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [selectedCount, setSelectedCount] = useState(0)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)

  // Estados para la paginación (aplican solo a tabs distintos de "all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  // Estado para el resumen global (usado en tab "all")
  const [summary, setSummary] = useState<Summary>({ totalTasks: 0, totalHours: 0, totalEarned: 0 })

  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  /**
   * Función para obtener las tareas.
   * Para los tabs distintos de "all" se utiliza paginación.
   * En "all" se utiliza un endpoint que devuelve TODAS las tareas (o se ignora la paginación).
   */
  const fetchTasks = async (filter = "all", page = 1, limit = pageSize) => {
    setIsLoading(true)
    const token = localStorage.getItem("token")
    let url = `${apiUrl}/api/tasks?page=${page}&limit=${limit}`

    if (filter === "daily") {
      url = `${apiUrl}/api/tasks/filter/daily`
    } else if (filter === "weekly") {
      url = `${apiUrl}/api/tasks/filter/weekly`
    } else if (filter === "monthly") {
      url = `${apiUrl}/api/tasks/filter/monthly`
    } else if (filter === "custom" && customStartDate && customEndDate) {
      const formattedStartDate = format(customStartDate, "yyyy-MM-dd")
      const formattedEndDate = format(customEndDate, "yyyy-MM-dd")
      url = `${apiUrl}/api/tasks?startDate=${formattedStartDate}&endDate=${formattedEndDate}&page=${page}&limit=${limit}`
    } else if (filter === "specific-day" && specificDate) {
      const formattedDate = format(specificDate, "yyyy-MM-dd")
      const nextDay = addDays(specificDate, 1)
      const formattedNextDay = format(nextDay, "yyyy-MM-dd")
      url = `${apiUrl}/api/tasks?startDate=${formattedDate}&endDate=${formattedNextDay}&page=${page}&limit=${limit}`
    } else if (filter === "all") {
      // Para el tab all usamos el query parameter 'all=true'
      url = `${apiUrl}/api/tasks?all=true`
    }

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch tasks")
      }
      const data = await response.json()
      let tasksList: Task[] = []
      let totalCount = 0

      if (filter === "all") {
        // Para All, asumimos que el endpoint devuelve todas las tareas (sin paginación)
        tasksList = data.tasks || data
        totalCount = data.total || tasksList.length
        setTotalPages(1)
        setCurrentPage(1)
      } else if (Array.isArray(data)) {
        tasksList = data
        totalCount = data.length
        setTotalPages(1)
        setCurrentPage(1)
      } else {
        tasksList = data.tasks
        totalCount = data.total
        setTotalTasks(data.total)
        setTotalPages(data.pages)
        setCurrentPage(data.page)
      }

      const tasksWithSelection = tasksList.map((task: Task) => ({
        ...task,
        selected: false,
      }))

      setTasks(tasksWithSelection)
      // Para tabs distintos de "all" usamos el total obtenido del endpoint de tareas
      if (filter !== "all") setTotalTasks(totalCount)
      setIsAllSelected(false)
      setSelectedCount(0)

      // Si no es el tab all, recalculamos las métricas de las tareas que se muestran en la lista
      if (filter !== "all") {
        const hours = tasksList.reduce((sum: number, task: Task) => sum + (task.horas || 0), 0)
        const amount = tasksList.reduce((sum: number, task: Task) => sum + (task.monto || 0), 0)
        setTotalHours(hours)
        setTotalAmount(Number.parseFloat(amount.toFixed(2)))
      }
    } catch (error) {
      toast.error("Failed to load tasks")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Función para obtener el resumen (summary) global de todas las tareas.
   * Este resultado NO se verá afectado por la paginación.
   */
  const fetchSummary = async () => {
    const token = localStorage.getItem("token")
    let summaryUrl = `${apiUrl}/api/tasks/summary`
    // Si se aplicó un filtro por fecha (para tabs que no sean "all"), se añaden esos parámetros.
    if (activeFilter !== "all") {
      if (activeFilter === "custom" && customStartDate && customEndDate) {
        const formattedStart = format(customStartDate, "yyyy-MM-dd")
        const formattedEnd = format(customEndDate, "yyyy-MM-dd")
        summaryUrl += `?startDate=${formattedStart}&endDate=${formattedEnd}`
      } else if (activeFilter === "specific-day" && specificDate) {
        const formattedDate = format(specificDate, "yyyy-MM-dd")
        const nextDay = addDays(specificDate, 1)
        const formattedNextDay = format(nextDay, "yyyy-MM-dd")
        summaryUrl += `?startDate=${formattedDate}&endDate=${formattedNextDay}`
      }
      // Puedes agregar casos para weekly y monthly si lo deseas.
    }
    try {
      const response = await fetch(summaryUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch summary")
      }
      const data = await response.json()
      setSummary(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error fetching summary")
    }
  }

  const handleFilterChange = (value: string) => {
    setActiveFilter(value)
    setCurrentPage(1) // Reiniciar a la primera página al cambiar filtro
    fetchTasks(value, 1, pageSize)
    fetchSummary()
    setSelectMode(false)
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
    fetchTasks(activeFilter, page, pageSize)
    // El resumen global no se actualiza en cambio de página
  }

  const handlePageSizeChange = (value: string) => {
    const newPageSize = Number.parseInt(value)
    setPageSize(newPageSize)
    setCurrentPage(1) // Reiniciar a la primera página al cambiar tamaño de página
    fetchTasks(activeFilter, 1, newPageSize)
  }

  const handleCustomDateFilter = () => {
    if (customStartDate && customEndDate) {
      setActiveFilter("custom")
      setCurrentPage(1)
      fetchTasks("custom", 1, pageSize)
      fetchSummary()
    } else {
      toast.error("Please select a start and end date")
    }
  }

  const handleSpecificDayFilter = () => {
    if (specificDate) {
      setActiveFilter("specific-day")
      setCurrentPage(1)
      fetchTasks("specific-day", 1, pageSize)
      fetchSummary()
      setIsCalendarOpen(false)
    } else {
      toast.error("Please select a date")
    }
  }

  const deleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return
    const token = localStorage.getItem("token")
    try {
      const response = await fetch(`${apiUrl}/api/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error("Failed to delete task")
      toast.success("Task deleted successfully")
      fetchTasks(activeFilter, currentPage, pageSize)
      fetchSummary()
    } catch (error) {
      toast.error("Error deleting task")
    }
  }

  // Funciones para selección de tareas
  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    if (selectMode) {
      setTasks(tasks.map((task) => ({ ...task, selected: false })))
      setIsAllSelected(false)
      setSelectedCount(0)
    }
  }

  const toggleTaskSelection = (taskId: string) => {
    const updatedTasks = tasks.map((task) =>
      task._id === taskId ? { ...task, selected: !task.selected } : task
    )
    setTasks(updatedTasks)
    const selectedTasks = updatedTasks.filter((task) => task.selected)
    setSelectedCount(selectedTasks.length)
    setIsAllSelected(selectedTasks.length === updatedTasks.length && updatedTasks.length > 0)
  }

  const toggleSelectAll = () => {
    const newSelectAllState = !isAllSelected
    const updatedTasks = tasks.map((task) => ({ ...task, selected: newSelectAllState }))
    setTasks(updatedTasks)
    setIsAllSelected(newSelectAllState)
    setSelectedCount(newSelectAllState ? tasks.length : 0)
  }

  const deleteSelectedTasks = async () => {
    setIsDeletingBulk(true)
    const token = localStorage.getItem("token")
    const selectedIds = tasks.filter((task) => task.selected).map((task) => task._id)
    try {
      const response = await fetch(`${apiUrl}/api/tasks/bulk`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      })
      if (!response.ok) {
        throw new Error("Failed to delete tasks")
      }
      const result = await response.json()
      toast.success(`Successfully deleted ${result.totalDeleted} tasks`)
      fetchTasks(activeFilter, currentPage, pageSize)
      fetchSummary()
      setSelectMode(false)
      setIsDeleteDialogOpen(false)
    } catch (error) {
      toast.error("Error deleting tasks")
    } finally {
      setIsDeletingBulk(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredTasks = tasks.filter((task) =>
    (task.descripcion || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getFilterLabel = () => {
    switch (activeFilter) {
      case "daily":
        return "Today"
      case "weekly":
        return "This Week"
      case "monthly":
        return "This Month"
      case "custom":
        return customStartDate && customEndDate
          ? `${format(customStartDate, "dd 'de' MMMM 'de' yyyy", { locale: es })} to ${format(
              customEndDate,
              "dd 'de' MMMM 'de' yyyy",
              { locale: es }
            )}`
          : "Custom Period"
      case "specific-day":
        return specificDate ? formatDateToSpanish(specificDate) : "Specific Day"
      default:
        return "All Tasks"
    }
  }

  const renderPaginationItems = () => {
    const items = []
    const maxVisiblePages = 5

    items.push(
      <PaginationItem key="first">
        <PaginationLink isActive={currentPage === 1} onClick={() => handlePageChange(1)}>
          1
        </PaginationLink>
      </PaginationItem>
    )

    const startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3)

    if (startPage > 2) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      )
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={currentPage === i} onClick={() => handlePageChange(i)}>
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }

    if (endPage < totalPages - 1) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      )
    }

    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink isActive={currentPage === totalPages} onClick={() => handlePageChange(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }

    return items
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage your work tasks</p>
        </div>
        <div className="flex gap-2">
          {selectMode ? (
            <>
              <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={selectedCount === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedCount})
              </Button>
              <Button variant="outline" onClick={toggleSelectMode}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={toggleSelectMode}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Select
              </Button>
              <Button variant="outline" onClick={() => router.push("/tasks/upload-csv")}>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
              <Button onClick={() => router.push("/tasks/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
            <Tabs defaultValue="all" value={activeFilter} onValueChange={handleFilterChange} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-4 w-full md:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="daily">Today</TabsTrigger>
                <TabsTrigger value="weekly">Week</TabsTrigger>
                <TabsTrigger value="monthly">Month</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleFilterChange("all")}>All Tasks</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("daily")}>Today</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("weekly")}>This Week</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("monthly")}>This Month</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveFilter("custom")}>Custom Period</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsCalendarOpen(true)
                      setActiveFilter("specific-day")
                    }}
                  >
                    Specific Day
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tasks..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>

          {activeFilter === "custom" && (
            <div className="flex flex-col space-y-4 md:flex-row md:items-end md:space-x-4 md:space-y-0 mb-4 p-4 border rounded-md bg-muted/20">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : <span>Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={customStartDate} onSelect={setCustomStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : <span>Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={customEndDate} onSelect={setCustomEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={handleCustomDateFilter}>
                <Filter className="mr-2 h-4 w-4" />
                Apply Filter
              </Button>
            </div>
          )}

          {activeFilter === "specific-day" && (
            <div className="flex flex-col space-y-4 mb-4 p-4 border rounded-md bg-muted/20">
              <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium">Select Day</label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {specificDate ? formatDateToSpanish(specificDate) : <span>Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={specificDate} onSelect={setSpecificDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button onClick={handleSpecificDayFilter}>
                  <Filter className="mr-2 h-4 w-4" />
                  View Day's Tasks
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{getFilterLabel()}</h2>
            {activeFilter !== "daily" && activeFilter !== "weekly" && activeFilter !== "monthly" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder="20" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No tasks found for {getFilterLabel()}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/tasks/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first task
              </Button>
            </div>
          ) : (
            <>
              {/* Mostrar summary:
                  Para el tab "all" se usa el summary global obtenido del endpoint /summary,
                  para los demás se usan los valores calculados a partir de las tareas paginadas */}
              {activeFilter === "all" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card className="p-4 bg-muted/50">
                    <div className="font-medium text-sm text-muted-foreground">Total Tasks</div>
                    <div className="text-2xl font-bold">{summary.totalTasks}</div>
                  </Card>
                  <Card className="p-4 bg-muted/50">
                    <div className="font-medium text-sm text-muted-foreground">Total Duration</div>
                    <div className="text-2xl font-bold">{formatDuration(summary.totalHours)}</div>
                  </Card>
                  <Card className="p-4 bg-muted/50">
                    <div className="font-medium text-sm text-muted-foreground">Total Earned</div>
                    <div className="text-2xl font-bold">
                      ${ (summary.totalEarned ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card className="p-4 bg-muted/50">
                    <div className="font-medium text-sm text-muted-foreground">Total Tasks</div>
                    <div className="text-2xl font-bold">{totalTasks}</div>
                  </Card>
                  <Card className="p-4 bg-muted/50">
                    <div className="font-medium text-sm text-muted-foreground">Total Duration</div>
                    <div className="text-2xl font-bold">{formatDuration(totalHours)}</div>
                  </Card>
                  <Card className="p-4 bg-muted/50">
                    <div className="font-medium text-sm text-muted-foreground">Total Earned</div>
                    <div className="text-2xl font-bold">
                      ${ (totalAmount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                    </div>
                  </Card>
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectMode && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all tasks"
                          />
                        </TableHead>
                      )}
                      <TableHead>Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task._id} className={task.selected ? "bg-muted/50" : ""}>
                        {selectMode && (
                          <TableCell className="w-12">
                            <Checkbox
                              checked={task.selected}
                              onCheckedChange={() => toggleTaskSelection(task._id)}
                              aria-label={`Select task ${task.descripcion || ""}`}
                            />
                          </TableCell>
                        )}
                        <TableCell>{safeFormatDate(task.fecha)}</TableCell>
                        <TableCell>{formatDuration(task.horas || 0)}</TableCell>
                        <TableCell>
                          $ {(task.monto ?? 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{task.descripcion || ""}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/tasks/edit/${task._id}`)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteTask(task._id)}>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Controles de paginación se muestran solo para filtros distintos a "all" */}
              {activeFilter !== "all" && totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * pageSize + 1, totalTasks)} -{" "}
                    {Math.min(currentPage * pageSize, totalTasks)} of {totalTasks} tasks
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                      </PaginationItem>
                      {renderPaginationItems()}
                      <PaginationItem>
                        <PaginationNext onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Tasks</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} selected tasks?
            </AlertDialogDescription>
            <AlertDialogDescription className="mt-2">This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBulk}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                deleteSelectedTasks()
              }}
              disabled={isDeletingBulk}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingBulk ? "Deleting..." : "Delete Tasks"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
