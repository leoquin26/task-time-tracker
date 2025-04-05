"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Filter, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Task interface
interface Task {
  _id: string;
  fecha: string;
  horas: number;
  monto: number;
  descripcion: string;
}

// Helper function to convert decimal hours to a formatted duration string "Xh Ym Zs"
function formatDuration(decimalHours: number): string {
  const totalSeconds = Math.round(decimalHours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  let parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined);
  const [totalHours, setTotalHours] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const fetchTasks = async (filter = "all") => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    let url = `${apiUrl}/api/tasks`;

    // Determine URL based on filter
    if (filter === "daily") {
      url = `${apiUrl}/api/tasks/filter/daily`;
    } else if (filter === "weekly") {
      url = `${apiUrl}/api/tasks/filter/weekly`;
    } else if (filter === "monthly") {
      url = `${apiUrl}/api/tasks/filter/monthly`;
    } else if (filter === "custom" && customStartDate && customEndDate) {
      const formattedStartDate = format(customStartDate, "yyyy-MM-dd");
      const formattedEndDate = format(customEndDate, "yyyy-MM-dd");
      url = `${apiUrl}/api/tasks?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
    } else if (filter === "specific-day" && specificDate) {
      const formattedDate = format(specificDate, "yyyy-MM-dd");
      const nextDay = addDays(new Date(formattedDate), 1);
      const formattedNextDay = format(nextDay, "yyyy-MM-dd");
      url = `${apiUrl}/api/tasks?startDate=${formattedDate}&endDate=${formattedNextDay}`;
    }

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      const data = await response.json();
      setTasks(data);

      // Calculate totals
      const hours = data.reduce((sum: number, task: Task) => sum + task.horas, 0);
      const amount = data.reduce((sum: number, task: Task) => sum + task.monto, 0);
      setTotalHours(parseFloat(hours.toFixed(2)));
      setTotalAmount(parseFloat(amount.toFixed(2)));
    } catch (error) {
      toast.error("Error loading tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (value: string) => {
    setActiveFilter(value);
    fetchTasks(value);
  };

  const handleCustomDateFilter = () => {
    if (customStartDate && customEndDate) {
      setActiveFilter("custom");
      fetchTasks("custom");
    } else {
      toast.error("Please select a start and end date");
    }
  };

  const handleSpecificDayFilter = () => {
    if (specificDate) {
      setActiveFilter("specific-day");
      fetchTasks("specific-day");
      setIsCalendarOpen(false);
    } else {
      toast.error("Please select a date");
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${apiUrl}/api/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete task");
      toast.success("Task deleted successfully");
      fetchTasks(activeFilter);
    } catch (error) {
      toast.error("Error deleting task");
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTasks = tasks.filter((task) =>
    task.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Convert a Date to a readable string in English
  const formatDateToEnglish = (date: Date) => {
    return format(date, "MMMM do, yyyy");
  };

  const getFilterLabel = () => {
    switch (activeFilter) {
      case "daily":
        return "Today";
      case "weekly":
        return "This Week";
      case "monthly":
        return "This Month";
      case "custom":
        return customStartDate && customEndDate
          ? `${format(customStartDate, "MM/dd/yyyy")} to ${format(customEndDate, "MM/dd/yyyy")}`
          : "Custom Period";
      case "specific-day":
        return specificDate
          ? formatDateToEnglish(specificDate)
          : "Specific Day";
      default:
        return "All Tasks";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage your work tasks</p>
        </div>
        <Button onClick={() => router.push("/tasks/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
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
                  <DropdownMenuItem onClick={() => handleFilterChange("all")}>
                    All Tasks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("daily")}>
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("weekly")}>
                    This Week
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("monthly")}>
                    This Month
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveFilter("custom")}>
                    Custom Period
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setIsCalendarOpen(true);
                    setActiveFilter("specific-day");
                  }}>
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
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {customStartDate ? (
                        format(customStartDate, "MM/dd/yyyy")
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
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {customEndDate ? (
                        format(customEndDate, "MM/dd/yyyy")
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
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {specificDate ? (
                          formatDateToEnglish(specificDate) // You may update this function to English as needed
                        ) : (
                          <span>Select date</span>
                        )}
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
            <h2 className="text-xl font-semibold">
              {getFilterLabel()}
            </h2>
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
                  <div className="text-2xl font-bold">{filteredTasks.length}</div>
                </Card>
                <Card className="p-4 bg-muted/50">
                  <div className="font-medium text-sm text-muted-foreground">Total Duration</div>
                  <div className="text-2xl font-bold">{formatDuration(totalHours)}</div>
                </Card>
                <Card className="p-4 bg-muted/50">
                  <div className="font-medium text-sm text-muted-foreground">Total Earned</div>
                  <div className="text-2xl font-bold">${totalAmount}</div>
                </Card>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task._id}>
                        <TableCell>{format(new Date(task.fecha), "MM/dd/yyyy")}</TableCell>
                        <TableCell>{formatDuration(task.horas)}</TableCell>
                        <TableCell>${task.monto.toFixed(2)}</TableCell>
                        <TableCell className="max-w-xs truncate">{task.descripcion}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/tasks/edit/${task._id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTask(task._id)}
                            >
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
