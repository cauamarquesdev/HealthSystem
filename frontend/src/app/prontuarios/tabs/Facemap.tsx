"use client";

import React, { useRef } from "react";

export interface Application {
  id: string;
  x: number | null; // 0–100 (% do mapa); null = sem posição no mapa
  y: number | null;
  region: string;
  product: string;
  amount: string;
  unit: "U" | "mL";
  lot: string;
  expiry: string;
  note: string;
}

/** Sugere a região anatômica a partir da posição clicada (valores em % do mapa). */
export function regionAt(x: number, y: number): string {
  const dx = Math.abs(x - 50);
  if (y < 27) return "Testa";
  if (y < 33) return dx < 9 ? "Glabela" : "Sobrancelha";
  if (y < 46) return dx < 12 ? "Dorso nasal" : dx > 30 ? "Região periorbital lateral" : "Região periorbital";
  if (y < 62) return dx < 10 ? "Nariz" : dx < 30 ? "Malar" : "Têmpora / face lateral";
  if (y < 68) return dx < 12 ? "Região perioral superior" : dx < 26 ? "Sulco nasogeniano" : "Bochecha";
  if (y < 76) return dx < 18 ? "Lábios" : dx < 32 ? "Comissura / linha de marionete" : "Masseter";
  if (y < 90) return dx < 16 ? "Mento" : "Mandíbula";
  return "Submento";
}

export function FaceMap({
  points,
  onAdd,
  onSelect,
  activeId,
  readOnly,
  width = 300,
}: {
  points: Application[];
  onAdd?: (x: number, y: number) => void;
  onSelect?: (id: string) => void;
  activeId?: string | null;
  readOnly?: boolean;
  width?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const placed = (points ?? []).filter(
  (p) => p.x !== null && p.y !== null
);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly || !onAdd || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    onAdd(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  return (
    <svg
      ref={ref}
      viewBox="0 0 300 380"
      width={width}
      onClick={handleClick}
      role="img"
      aria-label="Mapa facial frontal. Clique para registrar um ponto de aplicação."
      className={`select-none ${readOnly ? "" : "cursor-crosshair"}`}
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <defs>
        <linearGradient id="faceFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>
      <rect width="300" height="380" rx="20" fill="#ffffff" />
      {/* pescoço */}
      <path d="M118 322 L110 378 M182 322 L190 378" stroke="#cbd5e1" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* orelhas */}
      <path d="M70 150 C54 146 48 178 66 194 M230 150 C246 146 252 178 234 194" stroke="#cbd5e1" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* rosto */}
      <path
        d="M150 28 C98 28 70 76 70 150 C70 215 86 268 112 308 C128 332 140 346 150 346 C160 346 172 332 188 308 C214 268 230 215 230 150 C230 76 202 28 150 28 Z"
        fill="url(#faceFill)"
        stroke="#94a3b8"
        strokeWidth="1.8"
      />
      {/* linhas-guia dos terços faciais */}
      <g stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 5">
        <line x1="78" y1="112" x2="222" y2="112" />
        <line x1="78" y1="222" x2="222" y2="222" />
      </g>
      {/* sobrancelhas */}
      <path d="M96 126 C108 114 130 114 141 124 M159 124 C170 114 192 114 204 126" stroke="#64748b" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* olhos */}
      <path d="M100 152 C110 142 130 142 140 152 C130 161 110 161 100 152 Z M160 152 C170 142 190 142 200 152 C190 161 170 161 160 152 Z" fill="#ffffff" stroke="#64748b" strokeWidth="1.6" />
      <circle cx="120" cy="152" r="4" fill="#475569" />
      <circle cx="180" cy="152" r="4" fill="#475569" />
      {/* nariz */}
      <path d="M150 160 C149 182 145 200 140 212 M134 214 C141 225 159 225 166 214" stroke="#94a3b8" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* lábios */}
      <path d="M122 262 C134 252 146 256 150 258 C154 256 166 252 178 262 C166 270 134 270 122 262 Z" fill="#fde2e4" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M126 267 C140 288 160 288 174 267" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

      {/* pontos */}
      {placed.map((p, i) => {
        const cx = (p.x! / 100) * 300;
        const cy = (p.y! / 100) * 380;
        const active = activeId === p.id;
        const n = points.indexOf(p) + 1;
        return (
          <g
            key={p.id}
            transform={`translate(${cx} ${cy})`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(p.id);
            }}
            className={onSelect ? "cursor-pointer" : ""}
          >
            {active && <circle r="15" fill="#2563eb" opacity="0.18" />}
            <circle r="10" fill={active ? "#1d4ed8" : "#2563eb"} stroke="#ffffff" strokeWidth="2" />
            <text textAnchor="middle" dy="3.6" fontSize="10" fontWeight="800" fill="#ffffff">
              {n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
export default FaceMap;