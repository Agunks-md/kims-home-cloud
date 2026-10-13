"use client";

import React, { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import DropZone from "@/components/DropZone";
import FileList from "@/components/FileList";
import { SearchIcon, CheckCircleIcon, AlertCircleIcon } from "@/components/Icons";
import type { FileRecord, StorageSummary } from "@/types";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

export default function Dashboard() {
  const [files, setFiles] = useState<(FileRecord & { drive_accounts?: { label: string } })[]>([]);
  const [total, setTotal] = useState(0);
  const [storage, setStorage] = useState<StorageSummary | null>(null);
  const [activeNav, setActiveNav] = useState("files");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    try {
      const params = new URLSearchParams({ folder_path: "/" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/files?${params}`);
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ponytail: silently fail, add retry logic when needed
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Fetch storage info
  const fetchStorage = useCallback(async () => {
    try {
      const res = await fetch("/api/storage");
      const data = await res.json();
      if (res.ok) setStorage(data);
    } catch {
      // ponytail: silently fail
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchStorage();
  }, [fetchFiles, fetchStorage]);

  // Upload handler
  const handleUpload = useCallback(
    async (selectedFiles: File[]) => {
      setUploading(true);
      let successCount = 0;

      for (const file of selectedFiles) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder_path", "/");

          const res = await fetch("/api/files/upload", { method: "POST", body: formData });
          const data = await res.json();

          if (res.ok) {
            successCount++;
          } else {
            addToast("error", `Gagal upload ${file.name}: ${data.error}`);
          }
        } catch {
          addToast("error", `Gagal upload ${file.name}`);
        }
      }

      if (successCount > 0) {
        addToast("success", `${successCount} file berhasil diupload`);
        fetchFiles();
        fetchStorage();
      }

      setUploading(false);
    },
    [addToast, fetchFiles, fetchStorage]
  );

  // Delete handler
  const handleDelete = useCallback(
    async (fileId: string) => {
      try {
        const res = await fetch(`/api/files?id=${fileId}`, { method: "DELETE" });
        if (res.ok) {
          addToast("success", "File berhasil dihapus");
          fetchFiles();
          fetchStorage();
        } else {
          const data = await res.json();
          addToast("error", data.error || "Gagal menghapus file");
        }
      } catch {
        addToast("error", "Gagal menghapus file");
      }
    },
    [addToast, fetchFiles, fetchStorage]
  );

  // Download handler
  const handleDownload = useCallback(
    async (fileId: string) => {
      try {
        const res = await fetch(`/api/files/download?id=${fileId}`);
        const data = await res.json();
        if (res.ok && data.url) {
          window.open(data.url, "_blank");
        } else {
          addToast("error", data.error || "Gagal mendapatkan link download");
        }
      } catch {
        addToast("error", "Gagal mendapatkan link download");
      }
    },
    [addToast]
  );

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => fetchFiles(), 300);
    return () => clearTimeout(timer);
  }, [search, fetchFiles]);

  return (
    <div className="app-layout">
      <Sidebar storage={storage} activeNav={activeNav} onNavChange={setActiveNav} />

      <main className="main-content">
        {/* Search bar */}
        <div style={{ marginBottom: "24px" }}>
          <div className="search-bar">
            <SearchIcon size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Cari file..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="search-input"
            />
          </div>
        </div>

        {/* Upload zone */}
        <div style={{ marginBottom: "32px" }}>
          <DropZone onUpload={handleUpload} uploading={uploading} />
        </div>

        {/* Upload progress indicator */}
        {uploading && (
          <div className="upload-progress" style={{ marginBottom: "24px" }}>
            <span className="upload-progress-name">Mengupload file...</span>
            <div className="upload-progress-bar">
              <div className="upload-progress-fill" style={{ width: "60%" }} />
            </div>
            <span className="upload-progress-status">Memproses...</span>
          </div>
        )}

        {/* File list */}
        <FileList
          files={files}
          total={total}
          onDelete={handleDelete}
          onDownload={handleDownload}
          loading={loading}
        />
      </main>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.type === "success" ? (
                <CheckCircleIcon size={18} />
              ) : (
                <AlertCircleIcon size={18} />
              )}
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
