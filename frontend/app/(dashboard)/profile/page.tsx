"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface User {
  _id: string;
  username: string;
  email: string;
  hourlyRate: number;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingDates, setIsUpdatingDates] = useState(false);
  const { toast } = useToast();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch(`${apiUrl}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        setUser(data);
        setUsername(data.username);
        setEmail(data.email);
        setHourlyRate(data.hourlyRate.toString());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al cargar el perfil");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${apiUrl}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          email,
          hourlyRate: Number(hourlyRate),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await response.json();
      setUser(data.user);
      
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  // Función para llamar al endpoint de ajuste de fechas de tasks.
  const handleUpdateTasksDates = async () => {
    setIsUpdatingDates(true);
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${apiUrl}/api/tasks/adjust-dates`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update tasks dates");
      }

      const data = await response.json();
      toast.success(`Fechas actualizadas correctamente: ${data.message}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar fechas de tareas");
    } finally {
      setIsUpdatingDates(false);
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground py-2">
          Manage your account settings
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription className="py-4">Update your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                This rate will be used to calculate your earnings
              </p>
            </div>
          </CardContent>
          <CardFooter className="pt-6">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Nueva sección para actualizar las fechas de las tasks */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Update Tasks Dates</CardTitle>
          <CardDescription>
            Adjust all your tasks (except the latest one) by subtracting one day to correct the dates.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={handleUpdateTasksDates} disabled={isUpdatingDates}>
            {isUpdatingDates ? "Updating..." : "Update Tasks Dates"}
          </Button>
        </CardFooter>
      </Card> */}
    </div>
  );
}
