"use client";

import React from "react";

interface StorageBarProps {
  usedBytes: number;
  totalBytes: number;
  label?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function StorageBar({ usedBytes, totalBytes, label }: StorageBarProps) {
  const percent = totalBytes > 0 ? Math.min((usedBytes / totalBytes) * 100, 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {label && <span className="storage-label">{label}</span>}
      <div className="storage-bar-container">
        <div className="storage-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="storage-info">
        <span className="storage-used">{formatBytes(usedBytes)} terpakai</span>
        <span className="storage-total">{formatBytes(totalBytes)}</span>
      </div>
    </div>
  );
}

export { formatBytes };
