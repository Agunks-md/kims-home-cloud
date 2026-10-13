"use client";

import React from "react";
import StorageBar, { formatBytes } from "./StorageBar";
import { CloudIcon, FolderIcon, HardDriveIcon, SettingsIcon, TrashIcon } from "./Icons";
import type { DriveAccountUsage, StorageSummary } from "@/types";

interface SidebarProps {
  storage: StorageSummary | null;
  activeNav: string;
  onNavChange: (nav: string) => void;
}

const NAV_ITEMS = [
  { key: "files", label: "Semua File", icon: FolderIcon },
  { key: "storage", label: "Penyimpanan", icon: HardDriveIcon },
  { key: "trash", label: "Sampah", icon: TrashIcon },
  { key: "settings", label: "Pengaturan", icon: SettingsIcon },
];

export default function Sidebar({ storage, activeNav, onNavChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand">
        <div className="brand-icon">
          <CloudIcon size={22} />
        </div>
        <span className="brand-name">Kims Home Cloud</span>
      </div>

      {/* Storage Overview */}
      <div className="storage-section">
        <StorageBar
          usedBytes={storage?.used_bytes ?? 0}
          totalBytes={storage?.total_bytes ?? 0}
          label="Unified Storage"
        />

        {/* Per-account breakdown */}
        {storage && storage.accounts.length > 0 && (
          <div className="account-list">
            {storage.accounts.map((acc: DriveAccountUsage) => (
              <div key={acc.id} className="account-badge">
                <span className="account-badge-label">{acc.label}</span>
                <span className="account-badge-usage">
                  {formatBytes(acc.used_bytes)} / {formatBytes(acc.total_bytes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="nav-section">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${activeNav === item.key ? "active" : ""}`}
            onClick={() => onNavChange(item.key)}
          >
            <item.icon size={18} className="nav-icon" />
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
