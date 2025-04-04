"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from 'lucide-react';
import { use } from 'react';

interface UserProfile {
  hourlyRate: number;
}

export default function EditTaskPage({ params }: { params: { id: string } }) {
  // Desenvuelve params con React.use()
  const unwrappedParams = use(params);
  const taskId = unwrappedParams.id;
  
  const [fecha, setFecha] = useState("");
  const [horas, setHoras] = useState(0);
  const [minutos, setMinutos] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [monto, setMonto] = useState(0);
  const [descripcion, setDescripcion] = useState("");
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar el perfil del usuario");
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    fetchUserProfile();
  }, [toast]);

  // Cargar los datos de la tarea
  useEffect(() => {
    const fetchTask = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch task");
        }

        const data = await response.json();
        
        // Format date for input field (YYYY-MM-DD)
        const formattedDate = new Date(data.fecha).toISOString().split("T")[0];
        setFecha(formattedDate);
        
        // Convertir horas decimales a horas, minutos y segundos
        const totalHoras = data.horas;
        const horasEnteras = Math.floor(totalHoras);
        const minutosDecimales = (totalHoras - horasEnteras) * 60;
        const minutosEnteros = Math.floor(minutosDecimales);
        const segundosEnteros = Math.round((minutosDecimales - minutosEnteros) * 60);
        
        setHoras(horasEnteras);
        setMinutos(minutosEnteros);
        setSegundos(segundosEnteros);
        
        setMonto(data.monto);
        setDescripcion(data.descripcion);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar la tarea");
        router.push("/tasks");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [taskId, router, toast]);

  // Calcular el monto basado en el tiempo y la tarifa por hora
  useEffect(() => {
    if (userProfile?.hourlyRate) {
      const totalHoras = horas + (minutos / 60) + (segundos / 3600);
      const calculatedAmount = totalHoras * userProfile.hourlyRate;
      setMonto(parseFloat(calculatedAmount.toFixed(2)));
    }
  }, [horas, minutos, segundos, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile?.hourlyRate) {
      toast.error("Debes configurar tu tarifa por hora en tu perfil");
      return;
    }
    
    setIsSaving(true);
    const token = localStorage.getItem("token");
    
    // Convertir horas, minutos y segundos a un valor decimal de horas
    const totalHoras = horas + (minutos / 60) + (segundos / 3600);

    try {
      const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: "PUT",
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
        throw new Error("Failed to update task");
      }

      toast.success("Tarea actualizada correctamente");
      
      router.push("/tasks");
    } catch (err) {
      toast.error( err instanceof Error ? err.message : "Error al actualizar la tarea");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Editar Tarea</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Detalles de la Tarea</CardTitle>
            <CardDescription>Actualiza los detalles de tu tarea</CardDescription>
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
                  para poder editar tareas.
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
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || !userProfile?.hourlyRate}
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}