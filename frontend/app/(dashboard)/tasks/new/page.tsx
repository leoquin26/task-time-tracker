"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface UserProfile {
  hourlyRate: number;
}

export default function NewTaskPage() {
  // Estado para el formulario clásico
  const [fecha, setFecha] = useState("");
  const [horas, setHoras] = useState(0);
  const [minutos, setMinutos] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [monto, setMonto] = useState(0);
  const [descripcion, setDescripcion] = useState("");

  // Estado para el texto a parsear
  const [rawText, setRawText] = useState("");

  // Estado para el usuario y carga
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const router = useRouter();
  const { toast } = useToast();

  // Cargar el perfil del usuario para obtener su tarifa por hora
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch("http://localhost:5000/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user profile");
        }

        const data = await response.json();
        setUserProfile(data);
      } catch (error) {
        toast.error("Error al cargar el perfil del usuario");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [toast]);

  // Calcular el monto basado en el tiempo y la tarifa por hora
  useEffect(() => {
    if (userProfile?.hourlyRate) {
      const totalHoras = horas + minutos / 60 + segundos / 3600;
      const calculatedAmount = totalHoras * userProfile.hourlyRate;
      setMonto(parseFloat(calculatedAmount.toFixed(2)));
    }
  }, [horas, minutos, segundos, userProfile]);

  // Manejar el envío del formulario clásico
  const handleSubmitClassic = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile?.hourlyRate) {
      toast.error("Debes configurar tu tarifa por hora en tu perfil");
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem("token");

    // Convertir horas, minutos y segundos a un valor decimal de horas
    const totalHoras = horas + minutos / 60 + segundos / 3600;

    try {
      const response = await fetch("http://localhost:5000/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fecha,
          horas: totalHoras,
          monto,
          descripcion,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      toast.success("Tarea creada correctamente");
      router.push("/tasks");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear la tarea"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar el envío del texto para parsear
  const handleSubmitRawText = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rawText.trim()) {
      toast.error("El texto no puede estar vacío");
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch("http://localhost:5000/api/tasks/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: rawText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to parse and create tasks");
      }

      toast.success("Tareas creadas correctamente");
      router.push("/tasks");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al procesar el texto"
      );
    } finally {
      setIsLoading(false);
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
                <CardDescription>
                  Ingresa los detalles de tu tarea
                </CardDescription>
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
                  <Input
                    id="fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tiempo</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="horas" className="text-xs">
                        Horas
                      </Label>
                      <Input
                        id="horas"
                        type="number"
                        min="0"
                        value={horas}
                        onChange={(e) =>
                          setHoras(parseInt(e.target.value) || 0)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="minutos" className="text-xs">
                        Minutos
                      </Label>
                      <Input
                        id="minutos"
                        type="number"
                        min="0"
                        max="59"
                        value={minutos}
                        onChange={(e) =>
                          setMinutos(parseInt(e.target.value) || 0)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="segundos" className="text-xs">
                        Segundos
                      </Label>
                      <Input
                        id="segundos"
                        type="number"
                        min="0"
                        max="59"
                        value={segundos}
                        onChange={(e) =>
                          setSegundos(parseInt(e.target.value) || 0)
                        }
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
                      ? `Calculado automáticamente usando tu tarifa de $${userProfile.hourlyRate}/hora`
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
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => router.back()}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || !userProfile?.hourlyRate}>
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
                  Pega el siguiente formato:
                  <br />
                  Task successfully submitted
                  <br />
                  You earned $15.26 for this task
                  <br />
                  Tasking time: 37 minutes 23 seconds at $24.50 / hour
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Task successfully submitted
You earned $15.26 for this task
Tasking time: 37 minutes 23 seconds at $24.50 / hour`}
                  rows={10}
                  required
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => router.back()}
                >
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
