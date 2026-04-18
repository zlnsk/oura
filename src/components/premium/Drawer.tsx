"use client";

import { useEffect, type ReactNode } from "react";

export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`scandi-drawer-mask ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`scandi-drawer ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
      >
        <div className="drawer-head">
          <div>
            <div className="label" style={{ marginBottom: 4 }}>Detail</div>
            <h3 style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>{title}</h3>
            {subtitle && <div className="meta" style={{ marginTop: 6 }}>{subtitle}</div>}
          </div>
          <button className="close" onClick={onClose} aria-label="Close detail">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}

export function KVRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="row">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}
