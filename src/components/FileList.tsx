"use client";

import React from "react";
import { getFileIcon, DownloadIcon, TrashIcon } from "./Icons";
import { formatBytes } from "./StorageBar";
import type { FileRecord } from "@/types";

interface FileListProps {
  files: (FileRecord & { drive_accounts?: { label: string } })[];
  total: number;
  onDelete: (fileId: string) => void;
  onDownload: (fileId: string) => void;
  loading: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FileList({ files, total, onDelete, onDownload, loading }: FileListProps) {
  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Memuat file...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="file-grid-header">
        <h2 className="file-grid-title">File Saya</h2>
        <span className="file-count">{total} file</span>
      </div>

      {files.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="empty-state-icon">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <h3 className="empty-state-title">Belum ada file</h3>
          <p className="empty-state-desc">
            Upload file pertama Anda dengan drag & drop atau klik area upload di atas.
          </p>
        </div>
      ) : (
        <div className="file-list">
          {/* Header row */}
          <div className="file-row file-row-header">
            <span></span>
            <span>Nama</span>
            <span>Ukuran</span>
            <span>Tanggal</span>
            <span>Aksi</span>
          </div>

          {/* File rows */}
          {files.map((file) => (
            <div key={file.id} className="file-row">
              <div className="file-icon">{getFileIcon(file.mime_type)}</div>
              <div>
                <div className="file-name" title={file.file_name}>
                  {file.file_name}
                </div>
                {file.drive_accounts && (
                  <span className="file-meta">{file.drive_accounts.label}</span>
                )}
              </div>
              <span className="file-meta">{formatBytes(file.size)}</span>
              <span className="file-meta">{formatDate(file.created_at)}</span>
              <div className="file-actions">
                <button
                  className="file-action-btn"
                  onClick={() => onDownload(file.id)}
                  title="Download"
                >
                  <DownloadIcon size={16} />
                </button>
                <button
                  className="file-action-btn danger"
                  onClick={() => onDelete(file.id)}
                  title="Hapus"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
