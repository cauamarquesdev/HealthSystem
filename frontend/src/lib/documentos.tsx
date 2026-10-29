"use client";

/**
 * DOCUMENTOS — peça compartilhada entre a página interna (Termos & Documentos)
 * e a página pública de assinatura (/assinar/[token]).
 *
 * Salve em  src/lib/documentos.tsx  (ao lado de notificacoes.tsx).
 */

import React, { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import {
  CalendarCheck,
  Camera,
  ClipboardList,
  FileSignature,
  FileText,
  Scale,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   API PÚBLICA (sem login — usada pelo link de assinatura)
   ═══════════════════════════════════════════════════════════════ */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiPublicaError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiPublico<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const b = await res.json();
      msg = Array.isArray(b?.message) ? b.message.join(", ") : b?.message ?? msg;
    } catch {}
    throw new ApiPublicaError(msg, res.status);
  }
  const t = await res.text();
  return (t ? JSON.parse(t) : undefined) as T;
}

/* ═══════════════════════════════════════════════════════════════
   TIPOS DE DOCUMENTO
   ═══════════════════════════════════════════════════════════════ */

export type TipoDoc =
  | "TERMO_PROCEDIMENTO"
  | "TERMO_IMAGEM"
  | "TERMO_LGPD"
  | "ATESTADO"
  | "DECLARACAO"
  | "ORIENTACOES"
  | "CONTRATO"
  | "OUTRO";

export const TIPOS_DOC: Record<TipoDoc, { label: string; curto: string; icon: LucideIcon; tile: string }> = {
  TERMO_PROCEDIMENTO: { label: "Termo de procedimento", curto: "Procedimento", icon: Stethoscope, tile: "bg-blue-50 text-blue-600" },
  TERMO_IMAGEM: { label: "Uso de imagem", curto: "Imagem", icon: Camera, tile: "bg-violet-50 text-violet-600" },
  TERMO_LGPD: { label: "Termo LGPD", curto: "LGPD", icon: ShieldCheck, tile: "bg-emerald-50 text-emerald-600" },
  ATESTADO: { label: "Atestado", curto: "Atestado", icon: FileSignature, tile: "bg-rose-50 text-rose-600" },
  DECLARACAO: { label: "Declaração", curto: "Declaração", icon: CalendarCheck, tile: "bg-amber-50 text-amber-600" },
  ORIENTACOES: { label: "Orientações", curto: "Orientações", icon: ClipboardList, tile: "bg-sky-50 text-sky-600" },
  CONTRATO: { label: "Contrato", curto: "Contrato", icon: Scale, tile: "bg-slate-100 text-slate-600" },
  OUTRO: { label: "Outro", curto: "Outro", icon: FileText, tile: "bg-slate-100 text-slate-600" },
};

export const LISTA_TIPOS = Object.keys(TIPOS_DOC) as TipoDoc[];

/* ═══════════════════════════════════════════════════════════════
   VARIÁVEIS DOS MODELOS
   ═══════════════════════════════════════════════════════════════ */

export const VARIAVEIS_SISTEMA: { k: string; l: string }[] = [
  { k: "paciente.nome", l: "Nome do paciente" },
  { k: "paciente.cpf", l: "CPF do paciente" },
  { k: "paciente.nascimento", l: "Nascimento" },
  { k: "paciente.telefone", l: "Telefone" },
  { k: "paciente.email", l: "E-mail" },
  { k: "clinica.nome", l: "Nome da clínica" },
  { k: "profissional.nome", l: "Profissional (quem cria)" },
  { k: "data", l: "Data (dd/mm/aaaa)" },
  { k: "data.extenso", l: "Data por extenso" },
  { k: "hora", l: "Hora atual" },
];

const NOMES_SISTEMA = new Set(VARIAVEIS_SISTEMA.map((v) => v.k));
const REGEX_VAR = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export const extrairVariaveis = (texto: string): string[] => [...new Set([...texto.matchAll(REGEX_VAR)].map((m) => m[1]))];
export const variaveisCustom = (texto: string) => extrairVariaveis(texto).filter((v) => !NOMES_SISTEMA.has(v));

export function substituir(texto: string, ctx: Record<string, string>): string {
  return texto.replace(REGEX_VAR, (orig, nome: string) => (ctx[nome] !== undefined && ctx[nome] !== "" ? ctx[nome] : orig));
}

/** "profissional_registro" → "Profissional registro" (rótulo amigável do campo). */
export const rotuloVariavel = (v: string) => {
  const s = v.replace(/[._]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function contextoTempo(): Record<string, string> {
  const d = new Date();
  return {
    data: d.toLocaleDateString("pt-BR"),
    "data.extenso": d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }),
    hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

/* ═══════════════════════════════════════════════════════════════
   CPF
   ═══════════════════════════════════════════════════════════════ */

export const soDigitos = (v: string) => v.replace(/\D/g, "");

export function formatarCpf(v: string) {
  const d = soDigitos(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function cpfValido(v: string) {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (base: string, ini: number) => {
    const s = base.split("").reduce((a, d, i) => a + Number(d) * (ini - i), 0);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(c.slice(0, 9), 10) === Number(c[9]) && dv(c.slice(0, 10), 11) === Number(c[10]);
}

/* ═══════════════════════════════════════════════════════════════
   RENDERIZAÇÃO DO TEXTO  (# título · ## subtítulo · - lista · **negrito** · {{variável}})
   ═══════════════════════════════════════════════════════════════ */

const TOKENS = /(\*\*[^*]+\*\*|\{\{[^}]+\}\})/g;

function Inline({ txt }: { txt: string }) {
  return (
    <>
      {txt.split(TOKENS).map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("{{") && p.endsWith("}}"))
          return (
            <mark key={i} className="rounded bg-amber-100 px-1 font-semibold text-amber-800">
              {p}
            </mark>
          );
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

export function DocumentoRender({ texto, className = "" }: { texto: string; className?: string }) {
  const out: React.ReactNode[] = [];
  let itens: string[] = [];
  const fecharLista = (k: number) => {
    if (!itens.length) return;
    out.push(
      <ul key={`ul${k}`} className="ml-5 list-disc space-y-1">
        {itens.map((it, i) => (
          <li key={i}><Inline txt={it} /></li>
        ))}
      </ul>,
    );
    itens = [];
  };

  texto.replace(/\r/g, "").split("\n").forEach((l, i) => {
    if (/^\s*-\s+/.test(l)) {
      itens.push(l.replace(/^\s*-\s+/, ""));
      return;
    }
    fecharLista(i);
    if (/^#\s+/.test(l)) out.push(<h2 key={i} className="pb-1 pt-2 text-center text-base font-extrabold tracking-wide text-slate-900">{l.replace(/^#\s+/, "")}</h2>);
    else if (/^##\s+/.test(l)) out.push(<h3 key={i} className="pt-2 text-sm font-extrabold text-slate-900">{l.replace(/^##\s+/, "")}</h3>);
    else if (!l.trim()) out.push(<div key={i} className="h-2" />);
    else out.push(<p key={i}><Inline txt={l} /></p>);
  });
  fecharLista(9999);

  return <div className={`space-y-1.5 text-[13.5px] leading-relaxed text-slate-800 ${className}`}>{out}</div>;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Mesma sintaxe, em HTML (para a janela de impressão/PDF). */
export function textoParaHtml(texto: string): string {
  const inline = (t: string) => esc(t).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const out: string[] = [];
  let itens: string[] = [];
  const fechar = () => {
    if (itens.length) out.push(`<ul>${itens.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
    itens = [];
  };
  texto.replace(/\r/g, "").split("\n").forEach((l) => {
    if (/^\s*-\s+/.test(l)) return void itens.push(l.replace(/^\s*-\s+/, ""));
    fechar();
    if (/^#\s+/.test(l)) out.push(`<h1>${esc(l.replace(/^#\s+/, ""))}</h1>`);
    else if (/^##\s+/.test(l)) out.push(`<h2>${esc(l.replace(/^##\s+/, ""))}</h2>`);
    else if (!l.trim()) out.push("<br>");
    else out.push(`<p>${inline(l)}</p>`);
  });
  fechar();
  return out.join("");
}

/* ═══════════════════════════════════════════════════════════════
   CAMPO DE ASSINATURA (mouse, toque e caneta)
   ═══════════════════════════════════════════════════════════════ */

export type SignaturePadHandle = {
  limpar: () => void;
  /** true se ainda não há traço suficiente. */
  vazio: () => boolean;
  /** PNG em Data URL, ou null se estiver em branco. */
  dataUrl: () => string | null;
};

const W = 720;
const H = 240;

export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (temTraco: boolean) => void; className?: string }>(function SignaturePad({ onChange, className = "" }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const anterior = useRef<{ x: number; y: number } | null>(null);

  const ctx = useCallback(() => {
    const c = canvas.current?.getContext("2d");
    if (c) {
      c.strokeStyle = "#0f172a";
      c.fillStyle = "#0f172a";
      c.lineWidth = 3;
      c.lineCap = "round";
      c.lineJoin = "round";
    }
    return c ?? null;
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  const contarTinta = () => {
    const c = canvas.current?.getContext("2d");
    if (!c) return 0;
    const d = c.getImageData(0, 0, W, H).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
    return n;
  };

  useImperativeHandle(ref, () => ({
    limpar: () => {
      ctx()?.clearRect(0, 0, W, H);
      onChange?.(false);
    },
    vazio: () => contarTinta() < 150,
    dataUrl: () => (contarTinta() < 150 ? null : canvas.current?.toDataURL("image/png") ?? null),
  }));

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white ${className}`}>
      <canvas
        ref={canvas}
        width={W}
        height={H}
        className="block h-44 w-full cursor-crosshair touch-none sm:h-52"
        aria-label="Área para assinar com o dedo, mouse ou caneta"
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          desenhando.current = true;
          const p = pos(e);
          anterior.current = p;
          const c = ctx();
          if (c) {
            c.beginPath();
            c.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
            c.fill();
          }
          onChange?.(true);
        }}
        onPointerMove={(e) => {
          if (!desenhando.current) return;
          const p = pos(e);
          const a = anterior.current ?? p;
          const c = ctx();
          if (c) {
            c.beginPath();
            c.moveTo(a.x, a.y);
            c.quadraticCurveTo(a.x, a.y, (a.x + p.x) / 2, (a.y + p.y) / 2);
            c.stroke();
          }
          anterior.current = p;
        }}
        onPointerUp={() => {
          desenhando.current = false;
          anterior.current = null;
        }}
        onPointerCancel={() => {
          desenhando.current = false;
          anterior.current = null;
        }}
      />
      <div className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-slate-200" />
      <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-slate-400">Assine acima</p>
    </div>
  );
});

export const fmtDataHora = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(+d) ? "—" : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};