"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Filter, CalendarDays } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Task {
  _id: string;
  fecha: string;
  horas: number;
  monto: number;
  descripcion: string;
}

export default function TasksPage() {
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

  const fetchTasks = async (filter = "all") => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    let url = "https://task-time-tracker-xi.vercel.app/api/tasks";
    
    // Determinar la URL basada en el filtro
    if (filter === "daily") {
      url = "https://task-time-tracker-xi.vercel.app/api/tasks/filter/daily";
    } else if (filter === "weekly") {
      url = "https://task-time-tracker-xi.vercel.app/api/tasks/filter/weekly";
    } else if (filter === "monthly") {
      url = "https://task-time-tracker-xi.vercel.app/api/tasks/filter/monthly";
    } else if (filter === "custom" && customStartDate && customEndDate) {
      const formattedStartDate = format(customStartDate, "yyyy-MM-dd");
      const formattedEndDate = format(customEndDate, "yyyy-MM-dd");
      url = `https://task-time-tracker-xi.vercel.app/api/tasks?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
    } else if (filter === "specific-day" && specificDate) {
      // Para filtrar por un día específico, usamos el mismo día como inicio y fin
      const formattedDate = format(specificDate, "yyyy-MM-dd");
      // Añadimos un día al final para incluir todo el día seleccionado
      const nextDay = addDays(new Date(formattedDate), 1);
      const formattedNextDay = format(nextDay, "yyyy-MM-dd");
      url = `https://task-time-tracker-xi.vercel.app/api/tasks?startDate=${formattedDate}&endDate=${formattedNextDay}`;
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
      
      // Calcular totales
      const hours = data.reduce((sum: number, task: Task) => sum + task.horas, 0);
      const amount = data.reduce((sum: number, task: Task) => sum + task.monto, 0);
      
      setTotalHours(parseFloat(hours.toFixed(2)));
      setTotalAmount(parseFloat(amount.toFixed(2)));
    } catch (error) {
      toast.error("Error al cargar las tareas");
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
      toast.error("Por favor selecciona fechas de inicio y fin");
    }
  };

  const handleSpecificDayFilter = () => {
    if (specificDate) {
      setActiveFilter("specific-day");
      fetchTasks("specific-day");
      setIsCalendarOpen(false);
    } else {
      toast.error("Por favor selecciona una fecha");
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarea?")) {
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`https://task-time-tracker-xi.vercel.app/api/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      toast.success("Tarea eliminada correctamente");
      
      // Refrescar la lista de tareas con el filtro actual
      fetchTasks(activeFilter);
    } catch (error) {
      toast.error("Error al eliminar la tarea");
    }
  };

  useEffect(() => {
    fetchTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTasks = tasks.filter((task) =>
    task.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDateToSpanish = (date: Date) => {
    const day = date.getDate();
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
  };

  const getFilterLabel = () => {
    switch (activeFilter) {
      case "daily":
        return "Hoy";
      case "weekly":
        return "Esta Semana";
      case "monthly":
        return "Este Mes";
      case "custom":
        return customStartDate && customEndDate 
          ? `${format(customStartDate, "dd/MM/yyyy")} a ${format(customEndDate, "dd/MM/yyyy")}`
          : "Período personalizado";
      case "specific-day":
        return specificDate 
          ? formatDateToSpanish(specificDate)
          : "Día específico";
      default:
        return "Todas las Tareas";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground">Administra tus tareas de trabajo</p>
        </div>
        <Button onClick={() => router.push("/tasks/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Tarea
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
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="daily">Hoy</TabsTrigger>
                <TabsTrigger value="weekly">Semana</TabsTrigger>
                <TabsTrigger value="monthly">Mes</TabsTrigger>
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
                  <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleFilterChange("all")}>
                    Todas las tareas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("daily")}>
                    Hoy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("weekly")}>
                    Esta semana
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("monthly")}>
                    Este mes
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveFilter("custom")}>
                    Período personalizado
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setIsCalendarOpen(true);
                    setActiveFilter("specific-day");
                  }}>
                    Día específico
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tareas..."
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
                <label className="text-sm font-medium">Fecha Inicio</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {customStartDate ? (
                        format(customStartDate, "dd/MM/yyyy")
                      ) : (
                        <span>Seleccionar fecha</span>
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
                <label className="text-sm font-medium">Fecha Fin</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {customEndDate ? (
                        format(customEndDate, "dd/MM/yyyy")
                      ) : (
                        <span>Seleccionar fecha</span>
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
                Aplicar Filtro
              </Button>
            </div>
          )}
          
          {activeFilter === "specific-day" && (
            <div className="flex flex-col space-y-4 mb-4 p-4 border rounded-md bg-muted/20">
              <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium">Seleccionar Día</label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {specificDate ? (
                          formatDateToSpanish(specificDate)
                        ) : (
                          <span>Seleccionar fecha</span>
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
                  Ver Tareas del Día
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
              <p className="text-muted-foreground">No se encontraron tareas para {getFilterLabel()}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/tasks/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar tu primera tarea
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card className="p-4 bg-muted/50">
                  <div className="font-medium text-sm text-muted-foreground">Total de Tareas</div>
                  <div className="text-2xl font-bold">{filteredTasks.length}</div>
                </Card>
                <Card className="p-4 bg-muted/50">
                  <div className="font-medium text-sm text-muted-foreground">Total de Horas</div>
                  <div className="text-2xl font-bold">{totalHours}h</div>
                </Card>
                <Card className="p-4 bg-muted/50">
                  <div className="font-medium text-sm text-muted-foreground">Total Ganado</div>
                  <div className="text-2xl font-bold">${totalAmount}</div>
                </Card>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task._id}>
                        <TableCell>{format(new Date(task.fecha), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{task.horas.toFixed(2)}h</TableCell>
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
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTask(task._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
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