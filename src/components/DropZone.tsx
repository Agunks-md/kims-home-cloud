"use client";

import React, { useCallback, useRef, useState } from "react";
import { UploadIcon } from "./Icons";

interface DropZoneProps {
  onUpload: (files: File[]) => void;
  uploading: boolean;
}

export default function DropZone({ onUpload, uploading }: DropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (uploading) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onUpload(files);
    },
    [onUpload, uploading]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (uploading) return;
      const files = Array.from(e.target.files || []);
      if (files.length > 0) onUpload(files);
      // Reset input agar file yang sama bisa dipilih lagi
      e.target.value = "";
    },
    [onUpload, uploading]
  );

  return (
    <div
      className={`dropzone ${dragActive ? "active" : ""}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleChange}
        style={{ display: "none" }}
        id="file-upload-input"
      />
      <UploadIcon size={48} className="dropzone-icon" />
      <p className="dropzone-text">
        {uploading
          ? "Sedang mengupload..."
          : dragActive
          ? "Lepaskan file di sini"
          : "Seret & lepaskan file, atau klik untuk memilih"}
      </p>
      <p className="dropzone-hint">Mendukung semua jenis file</p>
    </div>
  );
}
