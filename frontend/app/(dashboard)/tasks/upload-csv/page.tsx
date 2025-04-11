"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export default function UploadCsvPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    message: string;
    deletedCount?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        toast.error("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
      setDeleteResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type !== "text/csv" && !droppedFile.name.endsWith(".csv")) {
        toast.error("Please select a CSV file");
        return;
      }
      setFile(droppedFile);
      setUploadResult(null);
      setDeleteResult(null);
    }
  };

  // Función para subir el CSV y crear tareas
  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a CSV file first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    // Simular progreso para mejor experiencia de usuario
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        const newProgress = prev + 5;
        return newProgress >= 90 ? 90 : newProgress;
      });
    }, 100);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");
      const response = await fetch(`${apiUrl}/api/csv/upload-csv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload CSV");
      }

      setUploadResult({
        success: true,
        message: data.message,
        count: data.count,
      });

      toast.success(`CSV processed successfully. ${data.count} tasks created.`);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to upload CSV",
      });

      toast.error("Error uploading CSV");
    } finally {
      setIsUploading(false);
      // Reiniciar el progreso después de mostrar el estado completado
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Función para eliminar tareas basadas en los itemID contenidos en el CSV
  const handleDeleteTasksFromCsv = async () => {
    if (!file) {
      toast.error("Please select a CSV file first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setDeleteResult(null);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        const newProgress = prev + 5;
        return newProgress >= 90 ? 90 : newProgress;
      });
    }, 100);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");
      const response = await fetch(`${apiUrl}/api/csv/delete-tasks-from-csv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete tasks from CSV");
      }

      setDeleteResult({
        success: true,
        message: data.message,
        deletedCount: data.deletedCount,
      });

      toast.success(`CSV processed. ${data.deletedCount} tasks were deleted.`);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(100);

      setDeleteResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete tasks from CSV",
      });

      toast.error("Error deleting tasks from CSV");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const resetFileInput = () => {
    setFile(null);
    setUploadResult(null);
    setDeleteResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Upload CSV for Tasks</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV Upload</CardTitle>
          <CardDescription>
            Upload a CSV file to add multiple tasks at once or delete tasks based on CSV data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instrucciones de formato para el CSV */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>CSV Format Requirements</AlertTitle>
            <AlertDescription className="text-sm">
              Your CSV file must include the following columns:
              <ul className="list-disc pl-5">
                <li>
                  <strong>workDate</strong> - Date in YYYY-MM-DD format
                </li>
                <li>
                  <strong>itemID</strong> - Unique identifier for the task
                </li>
                <li>
                  <strong>duration</strong> - Time format like "1h 30m 45s"
                </li>
                <li>
                  <strong>rateApplied</strong> - Rate format like "$24.50/hr"
                </li>
                <li>
                  <strong>payout</strong> - Amount format like "$16.33"
                </li>
                <li>
                  <strong>payType</strong> - Type (prepay, overtime, missionReward, etc.)
                </li>
                <li>
                  <strong>projectName</strong> - Name of the project
                </li>
                <li>
                  <strong>status</strong> - Status of the task
                </li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Área para subir el archivo CSV */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${file ? "border-primary" : "border-border"} transition-colors duration-200 cursor-pointer`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              {file ? file.name : "Drag & drop your CSV file here"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {file
                ? `${(file.size / 1024).toFixed(2)} KB - Selected`
                : "or click to browse files"}
            </p>
            {file && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  resetFileInput();
                }}
                disabled={isUploading}
              >
                Change File
              </Button>
            )}
          </div>

          {/* Indicador de progreso */}
          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Mostrar resultado de la operación de subida */}
          {uploadResult && (
            <Alert variant={uploadResult.success ? "default" : "destructive"}>
              {uploadResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle>{uploadResult.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription className="text-sm">
                {uploadResult.success
                  ? `${uploadResult.message}. ${uploadResult.count} tasks created.`
                  : uploadResult.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Mostrar resultado de la eliminación de tareas */}
          {deleteResult && (
            <Alert variant={deleteResult.success ? "default" : "destructive"}>
              {deleteResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle>{deleteResult.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription className="text-sm">
                {deleteResult.success
                  ? `${deleteResult.message}. ${deleteResult.deletedCount} tasks were deleted.`
                  : deleteResult.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between pt-6">
          <Button variant="outline" onClick={() => router.push("/tasks")}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? "Processing..." : "Upload CSV"}
            </Button>
            <Button onClick={handleDeleteTasksFromCsv} disabled={!file || isUploading}>
              {isUploading ? "Processing..." : "Delete Tasks from CSV"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
