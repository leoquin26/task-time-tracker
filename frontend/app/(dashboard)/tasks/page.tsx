// app/(dashboard)/tasks/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  CalendarDays,
  Upload,
  CheckSquare,
} from "lucide-react"
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
import { Progress } from "@/components/ui/progress"

//
// Task interfaces
//
interface Task {
  _id: string
  fecha?: string
  horas?: number
  monto?: number
  descripcion?: string
  selected?: boolean
}
interface TasksResponse {
  tasks: Task[]
  total: number
  page: number
  pages: number
}

//
// Goal interfaces
//
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

//
// Helpers
//
function safeFormatDate(dateStr?: string): string {
  if (!dateStr) return "Sin fecha"
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return "Fecha inválida"
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
  return format(date, "dd/MM/yyyy", { locale: es })
}
function formatDateToSpanish(date: Date): string {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset())
  return format(d, "dd/MM/yyyy", { locale: es })
}
function formatDuration(decimalHours: number): string {
  const sec = Math.round(decimalHours * 3600)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const parts: string[] = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (s || !parts.length) parts.push(`${s}s`)
  return parts.join(" ")
}

export default function DashboardPage() {
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [customStartDate, setCustomStartDate] = useState<Date>()
  const [customEndDate, setCustomEndDate] = useState<Date>()
  const [specificDate, setSpecificDate] = useState<Date>()
  const [totalHours, setTotalHours] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [selectedCount, setSelectedCount] = useState(0)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  // Goals state
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoadingGoals, setIsLoadingGoals] = useState(true)

  // Fetch tasks
  const fetchTasks = async (filter = "all", page = 1, limit = pageSize) => {
    setIsLoadingTasks(true)
    const token = localStorage.getItem("token")
    let url = `${apiUrl}/api/tasks?page=${page}&limit=${limit}`
    if (filter === "daily") url = `${apiUrl}/api/tasks/filter/daily`
    else if (filter === "weekly") url = `${apiUrl}/api/tasks/filter/weekly`
    else if (filter === "monthly") url = `${apiUrl}/api/tasks/filter/monthly`
    else if (filter === "custom" && customStartDate && customEndDate) {
      const s = format(customStartDate, "yyyy-MM-dd")
      const e = format(customEndDate, "yyyy-MM-dd")
      url = `${apiUrl}/api/tasks?startDate=${s}&endDate=${e}&page=${page}&limit=${limit}`
    } else if (filter === "specific-day" && specificDate) {
      const s = format(specificDate, "yyyy-MM-dd")
      const e = format(addDays(specificDate, 1), "yyyy-MM-dd")
      url = `${apiUrl}/api/tasks?startDate=${s}&endDate=${e}&page=${page}&limit=${limit}`
    }
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error("Failed to fetch tasks")
      const data: any = await res.json()
      let list: Task[] = []
      let total = 0
      if (Array.isArray(data)) {
        list = data; total = data.length
        setTotalPages(1); setCurrentPage(1)
      } else {
        list = data.tasks; total = data.total
        setTotalTasks(data.total)
        setTotalPages(data.pages)
        setCurrentPage(data.page)
      }
      const withSel = list.map(t => ({ ...t, selected: false }))
      setTasks(withSel)
      setTotalTasks(total); setIsAllSelected(false); setSelectedCount(0)
      const hrs = list.reduce((a, t) => a + (t.horas || 0), 0)
      const amt = list.reduce((a, t) => a + (t.monto || 0), 0)
      setTotalHours(hrs); setTotalAmount(Number(amt.toFixed(2)))
    } catch {
      toast.error("Failed to load tasks")
    } finally {
      setIsLoadingTasks(false)
    }
  }

  // Fetch goals + progress
  const fetchGoals = async () => {
    setIsLoadingGoals(true)
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${apiUrl}/api/goals`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error("Failed to load goals")
      const list: Goal[] = await res.json()
      const detailed = await Promise.all(
        list.map(async g => {
          const r2 = await fetch(`${apiUrl}/api/goals/${g._id}`, { headers: { Authorization: `Bearer ${token}` } })
          if (!r2.ok) throw new Error(`Failed to load goal ${g._id}`)
          const det = await r2.json()
          const pct = Math.min(Math.round(parseFloat(det.progress.percent)), 100)
          return {
            ...g,
            progress: {
              achieved: det.progress.achieved,
              remaining: det.progress.remaining,
              percent: pct,
              days: det.progress.days,
              dailyTarget: det.progress.dailyTarget,
              hoursPerDay: det.progress.hoursPerDay,
            },
          }
        })
      )
      setGoals(detailed)
    } catch (err: any) {
      toast.error(err.message || "Error loading goals")
    } finally {
      setIsLoadingGoals(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchGoals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Task handlers...
  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    if (selectMode) {
      setTasks(tasks.map(t => ({ ...t, selected: false })))
      setIsAllSelected(false)
      setSelectedCount(0)
    }
  }
  const deleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${apiUrl}/api/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to delete task")
      toast.success("Task deleted successfully")
      fetchTasks(activeFilter, currentPage, pageSize)
    } catch {
      toast.error("Error deleting task")
    }
  }
  const toggleTaskSelection = (id: string) => {
    const upd = tasks.map(t => t._id === id ? { ...t, selected: !t.selected } : t)
    setTasks(upd)
    const sel = upd.filter(t => t.selected).length
    setSelectedCount(sel)
    setIsAllSelected(sel === upd.length && upd.length > 0)
  }
  const toggleSelectAll = () => {
    const next = !isAllSelected
    const upd = tasks.map(t => ({ ...t, selected: next }))
    setTasks(upd)
    setIsAllSelected(next)
    setSelectedCount(next ? upd.length : 0)
  }
  const deleteSelectedTasks = async () => {
    setIsDeletingBulk(true)
    const token = localStorage.getItem("token")
    const ids = tasks.filter(t => t.selected).map(t => t._id)
    try {
      const res = await fetch(`${apiUrl}/api/tasks/bulk`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error("Failed to delete tasks")
      const resJson = await res.json()
      toast.success(`Successfully deleted ${resJson.totalDeleted} tasks`)
      setSelectMode(false)
      setIsDeleteDialogOpen(false)
      fetchTasks(activeFilter, currentPage, pageSize)
    } catch {
      toast.error("Error deleting tasks")
    } finally {
      setIsDeletingBulk(false)
    }
  }
  const handleFilterChange = (v: string) => { setActiveFilter(v); setCurrentPage(1); fetchTasks(v, 1, pageSize); setSelectMode(false) }
  const handlePageChange = (p: number) => { if (p<1||p>totalPages) return; setCurrentPage(p); fetchTasks(activeFilter, p, pageSize) }
  const handlePageSizeChange = (v: string) => { const n = +v; setPageSize(n); setCurrentPage(1); fetchTasks(activeFilter,1,n) }
  const handleCustomDateFilter = () => {
    if (customStartDate && customEndDate) {
      setActiveFilter("custom"); setCurrentPage(1)
      fetchTasks("custom",1,pageSize)
    } else toast.error("Please select a start and end date")
  }
  const handleSpecificDayFilter = () => {
    if (specificDate) {
      setActiveFilter("specific-day"); setCurrentPage(1)
      fetchTasks("specific-day",1,pageSize); setIsCalendarOpen(false)
    } else toast.error("Please select a date")
  }
  const renderPaginationItems = () => {
    const items = []
    const max = 5
    items.push(
      <PaginationItem key="first">
        <PaginationLink isActive={currentPage===1} onClick={() => handlePageChange(1)}>1</PaginationLink>
      </PaginationItem>
    )
    const start = Math.max(2, currentPage-Math.floor(max/2))
    const end = Math.min(totalPages-1, start+max-3)
    if (start>2) items.push(<PaginationItem key="ell-start"><PaginationEllipsis/></PaginationItem>)
    for (let i=start;i<=end;i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={currentPage===i} onClick={()=>handlePageChange(i)}>{i}</PaginationLink>
        </PaginationItem>
      )
    }
    if (end<totalPages-1) items.push(<PaginationItem key="ell-end"><PaginationEllipsis/></PaginationItem>)
    if (totalPages>1) items.push(
      <PaginationItem key="last">
        <PaginationLink isActive={currentPage===totalPages} onClick={()=>handlePageChange(totalPages)}>
          {totalPages}
        </PaginationLink>
      </PaginationItem>
    )
    return items
  }

  const filteredTasks = tasks.filter(t =>
    (t.descripcion||"").toLowerCase().includes(searchTerm.toLowerCase())
  )
  const getFilterLabel = () => {
    switch(activeFilter) {
      case "daily": return "Today"
      case "weekly": return "This Week"
      case "monthly": return "This Month"
      case "custom":
        return customStartDate&&customEndDate
          ? `${format(customStartDate,"dd 'de' MMMM 'de' yyyy",{locale:es})} – ${format(customEndDate,"dd 'de' MMMM 'de' yyyy",{locale:es})}`
          : "Custom Period"
      case "specific-day":
        return specificDate?formatDateToSpanish(specificDate):"Specific Day"
      default: return "All Tasks"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage your work tasks</p>
        </div>
        <div className="flex gap-2">
          {selectMode ? (
            <>
              <Button variant="destructive" disabled={selectedCount===0} onClick={()=>setIsDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4"/> Delete Selected ({selectedCount})
              </Button>
              <Button variant="outline" onClick={toggleSelectMode}>Cancel</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={toggleSelectMode}>
                <CheckSquare className="mr-2 h-4 w-4"/> Select
              </Button>
              <Button variant="outline" onClick={()=>router.push("/tasks/upload-csv")}>
                <Upload className="mr-2 h-4 w-4"/> Upload CSV
              </Button>
              <Button onClick={()=>router.push("/tasks/new")}>
                <Plus className="mr-2 h-4 w-4"/> Add Task
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Goals Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">My Goals</h2>
        </div>
        {isLoadingGoals ? (
          <p>Loading goals…</p>
        ) : goals.length===0 ? (
          <p>No goals yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map(g=>(
              <Card key={g._id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={()=>router.push(`/goals/${g._id}`)}>
                <CardContent className="space-y-2">
                  <h3 className="text-lg font-medium">{g.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(g.startDate),"dd/MM/yyyy")} – {format(new Date(g.endDate),"dd/MM/yyyy")}
                  </p>
                  <div className="flex justify-between text-sm">
                    <span>${g.progress.achieved.toFixed(2)}</span>
                    <span>${g.targetAmount.toFixed(2)}</span>
                  </div>
                  <Progress value={g.progress.percent}/>
                  <div className="text-xs text-muted-foreground">{g.progress.percent}%</div>
                  <p className="text-sm">
                    {g.progress.days} days remaining • ~${g.progress.dailyTarget.toFixed(2)} per day
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tasks Card */}
      <Card>
        <CardContent className="p-6">
          {/* Filters Row */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between mb-4">
            <Tabs value={activeFilter} onValueChange={handleFilterChange} className="w-full md:w-auto">
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
                    <Filter className="h-4 w-4"/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator/>
                  <DropdownMenuItem onClick={()=>handleFilterChange("all")}>All Tasks</DropdownMenuItem>
                  <DropdownMenuItem onClick={()=>handleFilterChange("daily")}>Today</DropdownMenuItem>
                  <DropdownMenuItem onClick={()=>handleFilterChange("weekly")}>This Week</DropdownMenuItem>
                  <DropdownMenuItem onClick={()=>handleFilterChange("monthly")}>This Month</DropdownMenuItem>
                  <DropdownMenuSeparator/>
                  <DropdownMenuItem onClick={()=>setActiveFilter("custom")}>Custom Period</DropdownMenuItem>
                  <DropdownMenuItem onClick={()=>{ setIsCalendarOpen(true); setActiveFilter("specific-day") }}>
                    Specific Day
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
                <Input
                  placeholder="Search tasks..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={e=>setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Custom filter panel */}
          {activeFilter==="custom" && (
            <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4 p-4 border rounded-md bg-muted/20">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4"/>
                      {customStartDate?format(customStartDate,"dd 'de' MMMM 'de' yyyy",{locale:es}):"Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={customStartDate} onSelect={setCustomStartDate} initialFocus/>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4"/>
                      {customEndDate?format(customEndDate,"dd 'de' MMMM 'de' yyyy",{locale:es}):"Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={customEndDate} onSelect={setCustomEndDate} initialFocus/>
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={handleCustomDateFilter}>
                <Filter className="mr-2 h-4 w-4"/> Apply Filter
              </Button>
            </div>
          )}

          {/* Specific day filter */}
          {activeFilter==="specific-day" && (
            <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4 p-4 border rounded-md bg-muted/20">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Select Day</label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4"/>
                      {specificDate?formatDateToSpanish(specificDate):"Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={specificDate} onSelect={setSpecificDate} initialFocus/>
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={handleSpecificDayFilter}>
                <Filter className="mr-2 h-4 w-4"/> View Day's Tasks
              </Button>
            </div>
          )}

          {/* Title + page size */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{getFilterLabel()}</h2>
            {activeFilter!=="daily" && activeFilter!=="weekly" && activeFilter!=="monthly" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-[80px]"><SelectValue placeholder="20"/></SelectTrigger>
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

          {isLoadingTasks ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : filteredTasks.length===0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No tasks found for {getFilterLabel()}</p>
              <Button variant="outline" className="mt-4" onClick={()=>router.push("/tasks/new")}>
                <Plus className="mr-2 h-4 w-4"/> Add your first task
              </Button>
            </div>
          ) : (
            <>
              {/* Metrics */}
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
                    ${(totalAmount).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </div>
                </Card>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectMode && (
                        <TableHead className="w-12">
                          <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} aria-label="Select all tasks"/>
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
                    {filteredTasks.map(task => (
                      <TableRow key={task._id} className={task.selected ? "bg-muted/50":""}>
                        {selectMode && (
                          <TableCell className="w-12">
                            <Checkbox
                              checked={task.selected}
                              onCheckedChange={()=>toggleTaskSelection(task._id)}
                              aria-label={`Select task ${task.descripcion||""}`}
                            />
                          </TableCell>
                        )}
                        <TableCell>{safeFormatDate(task.fecha)}</TableCell>
                        <TableCell>{formatDuration(task.horas||0)}</TableCell>
                        <TableCell>
                          ${(task.monto||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{task.descripcion||""}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={()=>router.push(`/tasks/edit/${task._id}`)}>
                              <Pencil className="h-4 w-4"/><span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={()=>deleteTask(task._id)}>
                              <Trash2 className="h-4 w-4"/><span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages>1 && activeFilter!=="daily" && activeFilter!=="weekly" && activeFilter!=="monthly" && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage-1)*pageSize+1,totalTasks)} - {Math.min(currentPage*pageSize,totalTasks)} of {totalTasks} tasks
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious onClick={()=>handlePageChange(currentPage-1)} disabled={currentPage===1}/>
                      </PaginationItem>
                      {renderPaginationItems()}
                      <PaginationItem>
                        <PaginationNext onClick={()=>handlePageChange(currentPage+1)} disabled={currentPage===totalPages}/>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete Dialog */}
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingBulk}
              onClick={(e)=>{ e.preventDefault(); deleteSelectedTasks() }}
            >
              {isDeletingBulk ? "Deleting..." : "Delete Tasks"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
