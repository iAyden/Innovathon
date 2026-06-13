"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UploadedFileItem {
  file: File;
  id: string;
  status: "idle" | "uploading" | "success" | "error";
}

interface UploadTicketProps {
  onUpload?: (files: File[]) => Promise<void>;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadTicket({ onUpload }: UploadTicketProps) {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles = Array.from(newFiles).filter(
      (file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE
    );

    const items: UploadedFileItem[] = validFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: "idle" as const,
    }));

    setFiles((prev) => [...prev, ...items]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setFiles((prev) =>
      prev.map((f) => ({ ...f, status: "uploading" as const }))
    );

    try {
      if (onUpload) {
        await onUpload(files.map((f) => f.file));
      } else {
        for (const item of files) {
          const body = new FormData();
          body.append("file", item.file);
          const response = await fetch(
            "/api/integrations/n8n/document-analysis",
            { method: "POST", body },
          );
          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error ?? "No se pudo procesar el documento.");
          }
        }
      }
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "success" as const }))
      );
    } catch {
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "error" as const }))
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir Comprobantes</CardTitle>
        <CardDescription>
          Arrastra tus facturas o tickets (PDF, JPG, PNG) para procesarlos con IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full transition-colors",
            isDragging ? "bg-primary/10" : "bg-muted"
          )}>
            <Upload className={cn(
              "w-5 h-5 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragging ? "Suelta los archivos aquí" : "Arrastra archivos aquí"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPG, PNG hasta 10MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(item.file.size)}
                  </p>
                </div>
                {item.status === "uploading" && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                )}
                {item.status === "success" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                {(item.status === "idle" || item.status === "error") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(item.id);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {files.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={isUploading || files.every((f) => f.status === "success")}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir {files.length} archivo{files.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setFiles([])}
              disabled={isUploading}
            >
              Limpiar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
