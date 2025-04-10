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
  selected?: boolean // Added for selection functionality
}

// Response interface for paginated tasks
interface TasksResponse {
  tasks: Task[]
  total: number // Cambio de totalCount a total
  page: number
  pages: number // Añadir pages que viene directamente del API
}

/**
 * Helper function to safely format a date string in Spanish.
 * It adjusts for the local timezone so that a UTC date like
 * "2025-04-06T00:00:00.000Z" is shown as "06/04/2025" regardless of the browser's timezone.
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
 * Helper function to format a date for filter labels in Spanish.
 * Se aplica el mismo ajuste de zona horaria.
 */
function formatDateToSpanish(date: Date): string {
  const adjustedDate = new Date(date)
  adjustedDate.setMinutes(adjustedDate.getMinutes() + adjustedDate.getTimezoneOffset())
  return format(adjustedDate, "dd/MM/yyyy", { locale: es })
}

/**
 * Helper function to convert decimal hours to a formatted duration string "Xh Ym Zs"
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
  const [totalHours, setTotalHours] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [selectedCount, setSelectedCount] = useState(0)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const fetchTasks = async (filter = "all", page = 1, limit = pageSize) => {
    setIsLoading(true)
    const token = localStorage.getItem("token")
    let url = `${apiUrl}/api/tasks?page=${page}&limit=${limit}`

    // Determine URL based on filter
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
      const nextDay = addDays(new Date(formattedDate), 1)
      const formattedNextDay = format(nextDay, "yyyy-MM-dd")
      url = `${apiUrl}/api/tasks?startDate=${formattedDate}&endDate=${formattedNextDay}&page=${page}&limit=${limit}`
    }

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch tasks")
      }

      // Handle both paginated and non-paginated responses
      const data = await response.json()
      let tasksList: Task[] = []
      let totalCount = 0

      if (Array.isArray(data)) {
        // Non-paginated response (filter endpoints)
        tasksList = data
        totalCount = data.length
        setTotalPages(1)
        setCurrentPage(1)
      } else {
        // Paginated response
        tasksList = data.tasks
        totalCount = data.total // Cambiar de data.totalCount a data.total
        setTotalTasks(data.total)
        setTotalPages(data.pages) // Usar directamente data.pages en lugar de calcular
        setCurrentPage(data.page)
      }

      // Add selected property to each task
      const tasksWithSelection = tasksList.map((task: Task) => ({
        ...task,
        selected: false,
      }))

      setTasks(tasksWithSelection)
      setTotalTasks(totalCount)
      setIsAllSelected(false)
      setSelectedCount(0)

      // Calculate totals for displayed tasks
      const hours = tasksList.reduce((sum: number, task: Task) => sum + (task.horas || 0), 0)
      const amount = tasksList.reduce((sum: number, task: Task) => sum + (task.monto || 0), 0)
      setTotalHours(hours)
      setTotalAmount(Number.parseFloat(amount.toFixed(2)))
    } catch (error) {
      toast.error("Failed to load tasks")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (value: string) => {
    setActiveFilter(value)
    setCurrentPage(1) // Reset to first page when changing filters
    fetchTasks(value, 1, pageSize)
    // Exit select mode when changing filters
    setSelectMode(false)
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
    fetchTasks(activeFilter, page, pageSize)
  }

  const handlePageSizeChange = (value: string) => {
    const newPageSize = Number.parseInt(value)
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when changing page size
    fetchTasks(activeFilter, 1, newPageSize)
  }

  const handleCustomDateFilter = () => {
    if (customStartDate && customEndDate) {
      setActiveFilter("custom")
      setCurrentPage(1) // Reset to first page when applying filter
      fetchTasks("custom", 1, pageSize)
    } else {
      toast.error("Please select a start and end date")
    }
  }

  const handleSpecificDayFilter = () => {
    if (specificDate) {
      setActiveFilter("specific-day")
      setCurrentPage(1) // Reset to first page when applying filter
      fetchTasks("specific-day", 1, pageSize)
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
    } catch (error) {
      toast.error("Error deleting task")
    }
  }

  // Toggle selection mode
  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    if (selectMode) {
      // Clear all selections when exiting select mode
      setTasks(tasks.map((task) => ({ ...task, selected: false })))
      setIsAllSelected(false)
      setSelectedCount(0)
    }
  }

  // Toggle selection of a single task
  const toggleTaskSelection = (taskId: string) => {
    const updatedTasks = tasks.map((task) => (task._id === taskId ? { ...task, selected: !task.selected } : task))
    setTasks(updatedTasks)

    // Update selected count and all selected state
    const selectedTasks = updatedTasks.filter((task) => task.selected)
    setSelectedCount(selectedTasks.length)
    setIsAllSelected(selectedTasks.length === updatedTasks.length && updatedTasks.length > 0)
  }

  // Toggle selection of all tasks
  const toggleSelectAll = () => {
    const newSelectAllState = !isAllSelected
    const updatedTasks = tasks.map((task) => ({ ...task, selected: newSelectAllState }))
    setTasks(updatedTasks)
    setIsAllSelected(newSelectAllState)
    setSelectedCount(newSelectAllState ? tasks.length : 0)
  }

  // Delete selected tasks in bulk
  const deleteSelectedTasks = async () => {
    setIsDeletingBulk(true)
    const token = localStorage.getItem("token")

    // Get IDs of selected tasks
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

      // Refresh the task list
      fetchTasks(activeFilter, currentPage, pageSize)

      // Exit select mode
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter tasks safely using a fallback for description
  const filteredTasks = tasks.filter((task) =>
    (task.descripcion || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Use our safeFormatDate to display dates in Spanish
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
          ? `${format(customStartDate, "dd 'de' MMMM 'de' yyyy", { locale: es })} to ${format(customEndDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}`
          : "Custom Period"
      case "specific-day":
        return specificDate ? formatDateToSpanish(specificDate) : "Specific Day"
      default:
        return "All Tasks"
    }
  }

  // Generate pagination items
  const renderPaginationItems = () => {
    const items = []
    const maxVisiblePages = 5

    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink isActive={currentPage === 1} onClick={() => handlePageChange(1)}>
          1
        </PaginationLink>
      </PaginationItem>,
    )

    // Calculate range of visible pages
    const startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3)

    // Adjust if we're near the beginning
    if (startPage > 2) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>,
      )
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={currentPage === i} onClick={() => handlePageChange(i)}>
            {i}
          </PaginationLink>
        </PaginationItem>,
      )
    }

    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>,
      )
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink isActive={currentPage === totalPages} onClick={() => handlePageChange(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
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
            <Tabs
              defaultValue="all"
              value={activeFilter}
              onValueChange={handleFilterChange}
              className="w-full md:w-auto"
            >
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
                <Input
                  placeholder="Search tasks..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                      {customStartDate ? (
                        format(customStartDate, "dd 'de' MMMM 'de' yyyy", { locale: es })
                      ) : (
                        <span>Select date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {customEndDate ? (
                        format(customEndDate, "dd 'de' MMMM 'de' yyyy", { locale: es })
                      ) : (
                        <span>Select date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
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
                      <CalendarComponent
                        mode="single"
                        selected={specificDate}
                        onSelect={setSpecificDate}
                        initialFocus
                      />
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

            {/* Page size selector */}
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
                    $
                    {(totalAmount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </Card>
              </div>

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
                          $
                          {(task.monto ?? 0).toLocaleString("en-US", {
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

              {/* Pagination controls */}
              {totalPages > 1 &&
                activeFilter !== "daily" &&
                activeFilter !== "weekly" &&
                activeFilter !== "monthly" && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {Math.min((currentPage - 1) * pageSize + 1, totalTasks)} -{" "}
                      {Math.min(currentPage * pageSize, totalTasks)} of {totalTasks} tasks
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          />
                        </PaginationItem>

                        {renderPaginationItems()}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Bulk Delete */}
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
