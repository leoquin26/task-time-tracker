"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CalendarIcon, InfoIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface UserProfile {
  hourlyRate: number;
}

export default function NewTaskPage() {
  // Estados para el tiempo normal (tasking time)
  const [horas, setHoras] = useState(0);
  const [minutos, setMinutos] = useState(0);
  const [segundos, setSegundos] = useState(0);
  // Estados para el tiempo excedido
  const [exceedHoras, setExceedHoras] = useState(0);
  const [exceedMinutos, setExceedMinutos] = useState(0);
  const [exceedSegundos, setExceedSegundos] = useState(0);
  
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [monto, setMonto] = useState(0);
  const [descripcion, setDescripcion] = useState("");
  const [rawText, setRawText] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const router = useRouter();
  const { toast } = useToast();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Cargar perfil de usuario para obtener tarifa
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await fetch(`${apiUrl}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch user profile");
        }
        const data = await response.json();
        setUserProfile(data);
      } catch (err) {
        toast.error("Error al cargar el perfil del usuario");
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchUserProfile();
  }, [toast, apiUrl]);

  // Recalcular monto automáticamente al modificar los tiempos
  useEffect(() => {
    if (userProfile?.hourlyRate) {
      const fullRate = userProfile.hourlyRate;
      const normalTime = horas + (minutos / 60) + (segundos / 3600);
      const exceedTime = exceedHoras + (exceedMinutos / 60) + (exceedSegundos / 3600);
      const calculatedAmount = (normalTime * fullRate) + (exceedTime * fullRate * 0.3);
      setMonto(Number(calculatedAmount.toFixed(2)));
    }
  }, [horas, minutos, segundos, exceedHoras, exceedMinutos, exceedSegundos, userProfile]);

  // Manejar envío del formulario clásico
  const handleSubmitClassic = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile?.hourlyRate) {
      toast.error("Debes configurar tu tarifa por hora en tu perfil");
      return;
    }
    
    if (!fecha) {
      toast.error("Debes seleccionar una fecha");
      return;
    }
    
    setIsLoading(true);
    const token = localStorage.getItem("token");
    
    // Calcular tiempos en horas decimales
    const normalTime = horas + (minutos / 60) + (segundos / 3600);
    const exceedTime = exceedHoras + (exceedMinutos / 60) + (exceedSegundos / 3600);
    
    // Formatear la fecha como YYYY-MM-DD manteniendo el día seleccionado
    const formattedDate = format(fecha, "yyyy-MM-dd");
    
    try {
      const response = await fetch(`${apiUrl}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Enviamos el desglose del tiempo normal y excedido
        body: JSON.stringify({
          fecha: formattedDate,
          taskingHours: normalTime,
          exceedHours: exceedTime,
          descripcion,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create task");
      }
      
      toast.success("Tarea creada correctamente");
      router.push("/tasks");
    } catch (err) {
      toast.error("Error al crear la tarea");
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar envío del texto para parsear (sin cambios)
  const handleSubmitRawText = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rawText.trim()) {
      toast.error("El texto no puede estar vacío");
      return;
    }
    
    setIsLoading(true);
    const token = localStorage.getItem("token");
    
    try {
      const response = await fetch(`${apiUrl}/api/tasks/parse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: rawText }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to parse and create tasks");
      }
      
      toast.success("Tareas creadas correctamente");
      router.push("/tasks");
    } catch (err) {
      toast.error("Error al procesar el texto");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para manejar selección de fecha
  const handleDateSelect = (date: Date | undefined) => {
    setFecha(date);
    if (date) {
      console.log("Fecha seleccionada:", date);
      console.log("Fecha formateada:", format(date, "yyyy-MM-dd"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Nueva Tarea</h1>
      </div>
      
      <Tabs defaultValue="classic">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="classic">Formulario Clásico</TabsTrigger>
          <TabsTrigger value="text">Pegar Texto</TabsTrigger>
        </TabsList>
        
        <TabsContent value="classic">
          <Card>
            <form onSubmit={handleSubmitClassic}>
              <CardHeader>
                <CardTitle>Detalles de la Tarea</CardTitle>
                <CardDescription>Ingresa los detalles de tu tarea</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!userProfile?.hourlyRate && !isLoadingProfile && (
                  <Alert variant="destructive" className="mb-4">
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>
                      Debes configurar tu tarifa por hora en tu{" "}
                      <Button
                        variant="link"
                        className="h-auto p-0 text-destructive underline"
                        onClick={() => router.push("/profile")}
                      >
                        perfil
                      </Button>{" "}
                      para poder crear tareas.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="fecha"
                      >
                        {fecha ? format(fecha, "dd/MM/yyyy") : <span className="text-muted-foreground">Seleccionar fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fecha}
                        onSelect={handleDateSelect}
                        locale={es}
                        initialFocus
                        fixedWeeks
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Campos para Tiempo Normal */}
                <div className="space-y-2">
                  <Label>Tiempo Normal (horas, minutos, segundos)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="horas" className="text-xs">Horas</Label>
                      <Input
                        id="horas"
                        type="number"
                        min="0"
                        value={horas}
                        onChange={(e) => setHoras(parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="minutos" className="text-xs">Minutos</Label>
                      <Input
                        id="minutos"
                        type="number"
                        min="0"
                        max="59"
                        value={minutos}
                        onChange={(e) => setMinutos(parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="segundos" className="text-xs">Segundos</Label>
                      <Input
                        id="segundos"
                        type="number"
                        min="0"
                        max="59"
                        value={segundos}
                        onChange={(e) => setSegundos(parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>
                  </div>
                </div>
                
                {/* Campos para Tiempo Excedido */}
                <div className="space-y-2">
                  <Label>Tiempo Excedido (horas, minutos, segundos)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="exceedHoras" className="text-xs">Horas</Label>
                      <Input
                        id="exceedHoras"
                        type="number"
                        min="0"
                        value={exceedHoras}
                        onChange={(e) => setExceedHoras(parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="exceedMinutos" className="text-xs">Minutos</Label>
                      <Input
                        id="exceedMinutos"
                        type="number"
                        min="0"
                        max="59"
                        value={exceedMinutos}
                        onChange={(e) => setExceedMinutos(parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="exceedSegundos" className="text-xs">Segundos</Label>
                      <Input
                        id="exceedSegundos"
                        type="number"
                        min="0"
                        max="59"
                        value={exceedSegundos}
                        onChange={(e) => setExceedSegundos(parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto ($)</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={monto}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    {userProfile?.hourlyRate 
                      ? `Calculado automáticamente usando tu tarifa de $${userProfile.hourlyRate}/hora y tiempo excedido al 30% de esa tarifa`
                      : "Configura tu tarifa por hora en tu perfil para calcular el monto"}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
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
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !userProfile?.hourlyRate}
                >
                  {isLoading ? "Creando..." : "Crear Tarea"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="text">
          <Card>
            <form onSubmit={handleSubmitRawText}>
              <CardHeader>
                <CardTitle>Pegar Texto para Procesar</CardTitle>
                <CardDescription>
                  Pega el texto que contiene los detalles de tus tareas y el sistema lo procesará automáticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Pega aquí el texto con los detalles de tus tareas..."
                  rows={10}
                  required
                />
              </CardContent>
              <CardFooter className="flex justify-between pt-6">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Procesando..." : "Procesar Texto"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
