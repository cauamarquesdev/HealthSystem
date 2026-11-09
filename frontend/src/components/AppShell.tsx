"use client";

/**
 * APP SHELL ÚNICO — sidebar + topbar + menu do perfil, usado por TODOS os módulos.
 *
 * Salve em  src/lib/app-shell.tsx  (ao lado de notificacoes.tsx e documentos.tsx).
 *
 * Uso em qualquer página:
 *   <AppShell trilha={["Gestão Clínica", "Protocolos"]} busca={{ valor, onChange, placeholder: "Buscar…" }} acoes={<MeusBotoes />}>
 *     <ConteudoDaPagina />
 *   </AppShell>
 *
 * O usuário logado (nome, cargo, foto) vem do backend (GET /perfil) e fica numa sessão compartilhada:
 * trocar a foto ou o nome atualiza o sistema inteiro, inclusive em outras abas do navegador.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Columns3,
  Eye,
  EyeOff,
  FileSignature,
  Image as ImageIcon,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  PenLine,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Stethoscope,
  Trash2,
  Upload,
  User,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { api, NotificationBell } from "../lib/notificacoes";
import { SignaturePad } from "../lib/documentos";
import type { SignaturePadHandle } from "../lib/documentos";

/* ═══════════════════════════════════════════════════════════════
   CONFIG — ajuste aqui, uma única vez, para o sistema inteiro
   ═══════════════════════════════════════════════════════════════ */

export const ROTA_LOGIN = "/login";
export const ROTA_CONFIGURACOES = "/configuracoes";
/** Chaves do localStorage onde o login guarda o token (apagadas ao sair). */
const TOKEN_KEYS = ["token", "accessToken"];

export const NAV: { section: string; items: { label: string; href: string; icon: React.ReactNode }[] }[] = [
  {
    section: "Visão geral",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { label: "Central de Notificações", href: "/notificacoes", icon: <Bell size={18} /> },
    ],
  },
  {
    section: "Operação",
    items: [
      { label: "Agenda", href: "/", icon: <CalendarDays size={18} /> },
      { label: "Clientes", href: "/pacientes", icon: <Users size={18} /> },
      { label: "CRM Kanban", href: "/crm", icon: <Columns3 size={18} /> },
      { label: "Procedimentos", href: "/procedimentos", icon: <Stethoscope size={18} /> },
      { label: "Recursos", href: "/recursos", icon: <Boxes size={18} /> },
    ],
  },
  {
    section: "Gestão clínica",
    items: [
      { label: "Prontuários", href: "/prontuarios", icon: <ClipboardList size={18} /> },
      { label: "Avaliações Estéticas", href: "/avaliacoes", icon: <Star size={18} /> },
      { label: "Protocolos", href: "/protocolos", icon: <BookOpen size={18} /> },
      { label: "Fotos Clínicas", href: "/fotos", icon: <ImageIcon size={18} /> },
      { label: "Termos & Documentos", href: "/documentos", icon: <FileSignature size={18} /> },
    ],
  },
  {
    section: "Financeiro",
    items: [
      { label: "Financeiro", href: "/financeiro", icon: <Landmark size={18} /> },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   TIPOS E SESSÃO
   ═══════════════════════════════════════════════════════════════ */

export type Clinica = {
  id: string;
  nome: string;
  documento?: string | null;
  unidade?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  horario?: string | null;
  logo?: string | null;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: string;
  telefone?: string | null;
  cargo?: string | null;
  registroTipo?: string | null;
  registroNumero?: string | null;
  registroUf?: string | null;
  bio?: string | null;
  avatar?: string | null;
  rubrica?: string | null;
  clinica: Clinica;
};

type Patch = Partial<Omit<Usuario, "clinica">> & { clinica?: Partial<Clinica> };

/** Cópia da sessão acessível fora de componentes (funções de impressão, valores iniciais de formulário…). */
let atual: Usuario | null = null;

export const nomeUsuario = () => atual?.nome ?? "";
export const cargoUsuario = () => atual?.cargo ?? "";
export const rubricaUsuario = () => atual?.rubrica ?? null;
export const nomeClinica = () => atual?.clinica.nome ?? "Clínica";
export const unidadeNome = () => atual?.clinica.unidade || atual?.clinica.nome || "";
/** Ex.: "CRM 12345/MG" (vazio se o profissional não preencheu). */
export const registroProfissional = () => {
  if (!atual?.registroTipo || !atual.registroNumero) return "";
  return `${atual.registroTipo} ${atual.registroNumero}${atual.registroUf ? `/${atual.registroUf}` : ""}`;
};

type Ctx = {
  /** false quando não há SessaoProvider acima (o AppShell cria um sozinho). */
  ativo: boolean;
  usuario: Usuario | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  atualizarLocal: (patch: Patch) => void;
  sair: () => Promise<void>;
};

const SessaoCtx = createContext<Ctx>({
  ativo: false,
  usuario: null,
  carregando: true,
  erro: null,
  recarregar: async () => {},
  atualizarLocal: () => {},
  sair: async () => {},
});

export const useSessao = () => useContext(SessaoCtx);

/** Nome da clínica que se atualiza sozinho quando a sessão muda (use em títulos e cabeçalhos das páginas). */
export function NomeClinica() {
  const { usuario } = useSessao();
  return <>{usuario?.clinica.nome ?? ""}</>;
}

/**
 * Monte no layout raiz (junto do NotificacoesProvider) para a sessão persistir entre as páginas:
 *   <SessaoProvider><NotificacoesProvider>{children}</NotificacoesProvider></SessaoProvider>
 */
export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const canal = useRef<BroadcastChannel | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const u = await api<Usuario>("/perfil");
      atual = u;
      setUsuario(u);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar o perfil");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  // Outras abas do navegador avisam quando o perfil muda
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const c = new BroadcastChannel("hs-sessao");
    canal.current = c;
    c.onmessage = () => void recarregar();
    return () => c.close();
  }, [recarregar]);

  const atualizarLocal = useCallback((patch: Patch) => {
    setUsuario((u) => {
      if (!u) return u;
      const { clinica, ...resto } = patch;
      const novo: Usuario = { ...u, ...resto, clinica: { ...u.clinica, ...(clinica ?? {}) } };
      atual = novo;
      return novo;
    });
    canal.current?.postMessage("atualizou");
  }, []);

  const sair = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" }); // opcional: ignorado se o seu backend não tiver
    } catch {}
    try {
      TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {}
    atual = null;
    window.location.href = ROTA_LOGIN;
  }, []);

  const valor = useMemo<Ctx>(
    () => ({ ativo: true, usuario, carregando, erro, recarregar, atualizarLocal, sair }),
    [usuario, carregando, erro, recarregar, atualizarLocal, sair],
  );
  return <SessaoCtx.Provider value={valor}>{children}</SessaoCtx.Provider>;
}

/* ═══════════════════════════════════════════════════════════════
   UTILIDADES E UI BASE
   ═══════════════════════════════════════════════════════════════ */

const iniciais = (nome = "") =>
  nome
    .replace(/^(Dra?\.)\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const ROTULO_ROLE: Record<string, string> = { ADMIN: "Administrador", PROFESSIONAL: "Profissional de saúde", RECEPTIONIST: "Recepção" };
const CONSELHOS = ["CRM", "CRO", "COREN", "CREFITO", "CRBM", "CRF", "CRN", "CRP", "OUTRO"];
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

function formatarTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function Avatar({ nome, foto, size = 36 }: { nome: string; foto?: string | null; size?: number }) {
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto} alt={nome} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-blue-700" style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden>
      {iniciais(nome) || <User size={size * 0.45} />}
    </span>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";
const btnBlue =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60";
const eyebrow = "text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500";

function IconBtn({ label, onClick, children, expanded }: { label: string; onClick: () => void; children: React.ReactNode; expanded?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-haspopup={expanded === undefined ? undefined : "menu"}
      aria-expanded={expanded}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      {children}
    </button>
  );
}

function Campo({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

function Aviso({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${tipo === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
      {tipo === "ok" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </p>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EDITOR DE FOTO (recorte circular com zoom, arrastar e câmera)
   ═══════════════════════════════════════════════════════════════ */

const V = 280; // área visível (px)
const K = 2; // nitidez do canvas de pré-visualização
const SAIDA = 256; // lado da foto final

function AlterarFotoModal({ onClose }: { onClose: () => void }) {
  const { usuario, atualizarLocal } = useSessao();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"salvar" | "remover" | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const arrasto = useRef<{ x: number; y: number } | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  const escalaDe = useCallback((i: HTMLImageElement, z: number) => (V / Math.min(i.naturalWidth, i.naturalHeight)) * z, []);

  const limitar = useCallback(
    (o: { x: number; y: number }, z: number, i: HTMLImageElement | null = img) => {
      if (!i) return { x: 0, y: 0 };
      const e = escalaDe(i, z);
      const mx = Math.max(0, (i.naturalWidth * e - V) / 2);
      const my = Math.max(0, (i.naturalHeight * e - V) / 2);
      return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
    },
    [img, escalaDe],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    g.setTransform(K, 0, 0, K, 0, 0);
    g.fillStyle = "#f1f5f9";
    g.fillRect(0, 0, V, V);
    if (!img) return;
    const e = escalaDe(img, zoom);
    const w = img.naturalWidth * e;
    const h = img.naturalHeight * e;
    g.drawImage(img, V / 2 - w / 2 + off.x, V / 2 - h / 2 + off.y, w, h);
  }, [img, zoom, off, escalaDe]);

  const escolher = (f?: File) => {
    if (!f) return;
    setErr(null);
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setErr("Use uma imagem JPG, PNG ou WebP.");
    if (f.size > 15 * 1024 * 1024) return setErr("A imagem passa de 15 MB.");
    const url = URL.createObjectURL(f);
    const i = new window.Image();
    i.onload = () => {
      URL.revokeObjectURL(url);
      setImg(i);
      setZoom(1);
      setOff({ x: 0, y: 0 });
    };
    i.onerror = () => {
      URL.revokeObjectURL(url);
      setErr("Não foi possível abrir a imagem.");
    };
    i.src = url;
  };

  const ajustarZoom = (z: number) => {
    const nz = Math.min(4, Math.max(1, z));
    setZoom(nz);
    setOff((o) => limitar(o, nz));
  };

  const exportar = (qualidade: number) => {
    if (!img) return "";
    const out = document.createElement("canvas");
    out.width = SAIDA;
    out.height = SAIDA;
    const g = out.getContext("2d");
    if (!g) return "";
    const f = SAIDA / V;
    const e = escalaDe(img, zoom);
    const w = img.naturalWidth * e;
    const h = img.naturalHeight * e;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, SAIDA, SAIDA);
    g.drawImage(img, (V / 2 - w / 2 + off.x) * f, (V / 2 - h / 2 + off.y) * f, w * f, h * f);
    return out.toDataURL("image/jpeg", qualidade);
  };

  const salvar = async () => {
    if (!img) return setErr("Escolha uma foto primeiro.");
    setBusy("salvar");
    setErr(null);
    try {
      let dataUrl = exportar(0.88);
      if (dataUrl.length > 150_000) dataUrl = exportar(0.7);
      await api("/perfil/avatar", { method: "PUT", body: JSON.stringify({ avatar: dataUrl }) });
      atualizarLocal({ avatar: dataUrl });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível salvar a foto.");
    } finally {
      setBusy(null);
    }
  };

  const remover = async () => {
    setBusy("remover");
    setErr(null);
    try {
      await api("/perfil/avatar", { method: "DELETE" });
      atualizarLocal({ avatar: null });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível remover a foto.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()} role="dialog" aria-modal="true" aria-label="Alterar foto">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Alterar foto</h2>
            <p className="mt-0.5 text-xs text-slate-500">Arraste para enquadrar e use o zoom. A foto aparece em todo o sistema.</p>
          </div>
          <IconBtn label="Fechar" onClick={onClose}><X size={18} /></IconBtn>
        </div>

        <div className="mx-auto grid place-items-center">
          <div
            className="relative cursor-grab overflow-hidden rounded-full ring-4 ring-slate-100 active:cursor-grabbing"
            style={{ width: V, height: V, touchAction: "none" }}
            onPointerDown={(e) => {
              if (!img) return;
              arrasto.current = { x: e.clientX - off.x, y: e.clientY - off.y };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => arrasto.current && setOff(limitar({ x: e.clientX - arrasto.current.x, y: e.clientY - arrasto.current.y }, zoom))}
            onPointerUp={() => (arrasto.current = null)}
            onWheel={(e) => img && ajustarZoom(zoom - e.deltaY * 0.002)}
          >
            <canvas ref={canvas} width={V * K} height={V * K} style={{ width: V, height: V }} aria-label="Pré-visualização da foto" />
            {!img && (
              <div className="absolute inset-0 grid place-items-center">
                <Avatar nome={usuario?.nome ?? ""} foto={usuario?.avatar} size={V} />
              </div>
            )}
          </div>
        </div>

        {img && (
          <div className="mt-4 flex items-center gap-3">
            <ZoomOut size={15} className="text-slate-400" />
            <input type="range" min={1} max={4} step={0.02} value={zoom} onChange={(e) => ajustarZoom(Number(e.target.value))} aria-label="Zoom" className="flex-1 accent-blue-600" />
            <ZoomIn size={15} className="text-slate-400" />
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className={btnGhost} onClick={() => arquivo.current?.click()}><Upload size={14} /> Escolher arquivo</button>
          <button className={btnGhost} onClick={() => camera.current?.click()}><Camera size={14} /> Tirar foto</button>
        </div>
        <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={camera} type="file" accept="image/*" capture="user" hidden onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />

        {err && <div className="mt-3"><Aviso tipo="erro">{err}</Aviso></div>}

        <div className="mt-5 flex items-center justify-between gap-2">
          {usuario?.avatar ? (
            <button className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50" onClick={() => void remover()} disabled={!!busy}>
              {busy === "remover" ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Remover foto
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button className={btnGhost} onClick={onClose} disabled={!!busy}>Cancelar</button>
            <button className={btnBlue} onClick={() => void salvar()} disabled={!img || !!busy}>
              {busy === "salvar" && <Loader2 size={15} className="animate-spin" />} Salvar foto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GAVETA "MEU PERFIL" (Dados · Segurança · Assinatura)
   ═══════════════════════════════════════════════════════════════ */

type AbaPerfil = "Dados" | "Segurança" | "Assinatura";

function forcaSenha(s: string) {
  let n = 0;
  if (s.length >= 8) n++;
  if (s.length >= 12) n++;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) n++;
  if (/\d/.test(s)) n++;
  if (/[^A-Za-z0-9]/.test(s)) n++;
  const nivel = Math.min(4, n);
  return { nivel, rotulo: ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"][nivel], cor: ["bg-rose-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"][nivel] };
}

function AbaDados({ onAlterarFoto }: { onAlterarFoto: () => void }) {
  const { usuario, atualizarLocal } = useSessao();
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [telefone, setTelefone] = useState(usuario?.telefone ?? "");
  const [cargo, setCargo] = useState(usuario?.cargo ?? "");
  const [tipo, setTipo] = useState(usuario?.registroTipo ?? "");
  const [numero, setNumero] = useState(usuario?.registroNumero ?? "");
  const [uf, setUf] = useState(usuario?.registroUf ?? "");
  const [bio, setBio] = useState(usuario?.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "erro"; s: string } | null>(null);

  if (!usuario) return null;

  const salvar = async () => {
    setMsg(null);
    if (nome.trim().length < 3) return setMsg({ t: "erro", s: "Informe seu nome completo." });
    setBusy(true);
    try {
      const u = await api<Usuario>("/perfil", {
        method: "PATCH",
        body: JSON.stringify({ nome, telefone: telefone || null, cargo: cargo || null, registroTipo: tipo || null, registroNumero: numero || null, registroUf: uf || null, bio: bio || null }),
      });
      atualizarLocal(u);
      setMsg({ t: "ok", s: "Perfil atualizado." });
    } catch (e) {
      setMsg({ t: "erro", s: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onAlterarFoto} className="group relative rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" aria-label="Alterar foto">
          <Avatar nome={usuario.nome} foto={usuario.avatar} size={84} />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-slate-900/50 text-white opacity-0 transition group-hover:opacity-100"><Camera size={22} /></span>
        </button>
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold text-slate-900">{usuario.nome}</p>
          <p className="text-xs text-slate-500">{ROTULO_ROLE[usuario.role] ?? usuario.role} · {usuario.clinica.nome}</p>
          <button className="mt-2 text-xs font-bold text-blue-600 hover:underline" onClick={onAlterarFoto}>Alterar foto</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nome completo *" className="sm:col-span-2"><input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
        <Campo label="Telefone"><input className={inputCls} inputMode="tel" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))} /></Campo>
        <Campo label="Cargo / especialidade"><input className={inputCls} placeholder="Ex.: Dermatologista" value={cargo} onChange={(e) => setCargo(e.target.value)} /></Campo>
        <div className="grid grid-cols-[110px_1fr_80px] gap-2 sm:col-span-2">
          <Campo label="Conselho">
            <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">—</option>
              {CONSELHOS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo label="Nº de registro"><input className={inputCls} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex.: 148.920" /></Campo>
          <Campo label="UF">
            <select className={inputCls} value={uf} onChange={(e) => setUf(e.target.value)}>
              <option value="">—</option>
              {UFS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Campo>
        </div>
        <Campo label="Mini bio" hint={`${bio.length}/500 · aparece no seu perfil`} className="sm:col-span-2">
          <textarea rows={3} maxLength={500} className={inputCls} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Formação, áreas de atuação…" />
        </Campo>
        <Campo label="E-mail" hint="Para alterar, use a aba Segurança" className="sm:col-span-2"><input className={inputCls} value={usuario.email} disabled /></Campo>
      </div>

      {msg && <Aviso tipo={msg.t}>{msg.s}</Aviso>}
      <button className={btnBlue} onClick={() => void salvar()} disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} Salvar alterações</button>
    </div>
  );
}

function AbaSeguranca() {
  const { usuario, atualizarLocal } = useSessao();
  const [novoEmail, setNovoEmail] = useState("");
  const [senhaEmail, setSenhaEmail] = useState("");
  const [msgEmail, setMsgEmail] = useState<{ t: "ok" | "erro"; s: string } | null>(null);
  const [busyEmail, setBusyEmail] = useState(false);

  const [atualSenha, setAtualSenha] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [ver, setVer] = useState(false);
  const [msgSenha, setMsgSenha] = useState<{ t: "ok" | "erro"; s: string } | null>(null);
  const [busySenha, setBusySenha] = useState(false);

  const forca = forcaSenha(nova);

  const alterarEmail = async () => {
    setMsgEmail(null);
    if (!novoEmail.trim()) return setMsgEmail({ t: "erro", s: "Informe o novo e-mail." });
    if (!senhaEmail) return setMsgEmail({ t: "erro", s: "Informe sua senha atual para confirmar." });
    setBusyEmail(true);
    try {
      const r = await api<{ email: string }>("/perfil/email", { method: "POST", body: JSON.stringify({ senha: senhaEmail, novoEmail }) });
      atualizarLocal({ email: r.email });
      setNovoEmail("");
      setSenhaEmail("");
      setMsgEmail({ t: "ok", s: "E-mail alterado. Use o novo e-mail no próximo login." });
    } catch (e) {
      setMsgEmail({ t: "erro", s: e instanceof Error ? e.message : "Não foi possível alterar o e-mail." });
    } finally {
      setBusyEmail(false);
    }
  };

  const alterarSenha = async () => {
    setMsgSenha(null);
    if (!atualSenha) return setMsgSenha({ t: "erro", s: "Informe a senha atual." });
    if (nova.length < 8 || !/[A-Za-z]/.test(nova) || !/\d/.test(nova)) return setMsgSenha({ t: "erro", s: "A nova senha precisa ter 8+ caracteres, com letras e números." });
    if (nova !== confirma) return setMsgSenha({ t: "erro", s: "A confirmação não confere com a nova senha." });
    setBusySenha(true);
    try {
      await api("/perfil/senha", { method: "POST", body: JSON.stringify({ senhaAtual: atualSenha, novaSenha: nova }) });
      setAtualSenha("");
      setNova("");
      setConfirma("");
      setMsgSenha({ t: "ok", s: "Senha alterada com sucesso." });
    } catch (e) {
      setMsgSenha({ t: "erro", s: e instanceof Error ? e.message : "Não foi possível alterar a senha." });
    } finally {
      setBusySenha(false);
    }
  };

  const tipoSenha = ver ? "text" : "password";

  return (
    <div className="space-y-7">
      <section className="space-y-3" aria-label="Alterar e-mail">
        <h3 className="text-sm font-extrabold text-slate-900">E-mail de acesso</h3>
        <p className="text-xs text-slate-500">Atual: <strong className="text-slate-700">{usuario?.email}</strong></p>
        <Campo label="Novo e-mail"><input type="email" className={inputCls} value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} autoComplete="email" /></Campo>
        <Campo label="Senha atual (para confirmar)"><input type="password" className={inputCls} value={senhaEmail} onChange={(e) => setSenhaEmail(e.target.value)} autoComplete="current-password" /></Campo>
        {msgEmail && <Aviso tipo={msgEmail.t}>{msgEmail.s}</Aviso>}
        <button className={btnGhost} onClick={() => void alterarEmail()} disabled={busyEmail}>{busyEmail && <Loader2 size={14} className="animate-spin" />} Alterar e-mail</button>
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-6" aria-label="Alterar senha">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">Senha</h3>
          <button type="button" className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={() => setVer((v) => !v)}>{ver ? <EyeOff size={13} /> : <Eye size={13} />} {ver ? "Ocultar" : "Mostrar"}</button>
        </div>
        <Campo label="Senha atual"><input type={tipoSenha} className={inputCls} value={atualSenha} onChange={(e) => setAtualSenha(e.target.value)} autoComplete="current-password" /></Campo>
        <Campo label="Nova senha"><input type={tipoSenha} className={inputCls} value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" /></Campo>
        {nova && (
          <div>
            <div className="flex gap-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < forca.nivel ? forca.cor : "bg-slate-200"}`} />)}
            </div>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">Força: {forca.rotulo} · mínimo 8 caracteres com letras e números</p>
          </div>
        )}
        <Campo label="Confirmar nova senha"><input type={tipoSenha} className={inputCls} value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" /></Campo>
        {msgSenha && <Aviso tipo={msgSenha.t}>{msgSenha.s}</Aviso>}
        <button className={btnGhost} onClick={() => void alterarSenha()} disabled={busySenha}>{busySenha ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Alterar senha</button>
      </section>
    </div>
  );
}

function AbaAssinatura() {
  const { usuario, atualizarLocal } = useSessao();
  const pad = useRef<SignaturePadHandle>(null);
  const [temTraco, setTemTraco] = useState(false);
  const [busy, setBusy] = useState<"salvar" | "remover" | null>(null);
  const [msg, setMsg] = useState<{ t: "ok" | "erro"; s: string } | null>(null);

  const salvar = async () => {
    setMsg(null);
    const sig = pad.current?.dataUrl();
    if (!sig) return setMsg({ t: "erro", s: "Desenhe sua assinatura no quadro." });
    setBusy("salvar");
    try {
      const u = await api<Usuario>("/perfil", { method: "PATCH", body: JSON.stringify({ rubrica: sig }) });
      atualizarLocal(u);
      pad.current?.limpar();
      setTemTraco(false);
      setMsg({ t: "ok", s: "Assinatura salva." });
    } catch (e) {
      setMsg({ t: "erro", s: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setBusy(null);
    }
  };

  const remover = async () => {
    setBusy("remover");
    setMsg(null);
    try {
      const u = await api<Usuario>("/perfil", { method: "PATCH", body: JSON.stringify({ rubrica: null }) });
      atualizarLocal(u);
      setMsg({ t: "ok", s: "Assinatura removida." });
    } catch (e) {
      setMsg({ t: "erro", s: e instanceof Error ? e.message : "Não foi possível remover." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">Sua rubrica aparece automaticamente ao imprimir <strong>atestados</strong> e <strong>declarações</strong> em Termos & Documentos.</p>

      <div>
        <p className={`${eyebrow} mb-2`}>Assinatura atual</p>
        {usuario?.rubrica ? (
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={usuario.rubrica} alt="Sua assinatura" className="h-20 max-w-[60%] object-contain" />
            <button className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50" onClick={() => void remover()} disabled={!!busy}>
              {busy === "remover" ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Remover
            </button>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Você ainda não cadastrou sua assinatura.</p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className={eyebrow}>{usuario?.rubrica ? "Substituir assinatura" : "Desenhar assinatura"}</p>
          <button type="button" className="text-xs font-semibold text-blue-600 hover:underline" onClick={() => { pad.current?.limpar(); setTemTraco(false); }}>Limpar</button>
        </div>
        <SignaturePad ref={pad} onChange={setTemTraco} />
      </div>

      {msg && <Aviso tipo={msg.t}>{msg.s}</Aviso>}
      <button className={btnBlue} onClick={() => void salvar()} disabled={!temTraco || !!busy}>{busy === "salvar" && <Loader2 size={15} className="animate-spin" />} <PenLine size={15} /> Salvar assinatura</button>
    </div>
  );
}

function PerfilDrawer({ abaInicial, onClose, onAlterarFoto }: { abaInicial: AbaPerfil; onClose: () => void; onAlterarFoto: () => void }) {
  const { usuario } = useSessao();
  const [aba, setAba] = useState<AbaPerfil>(abaInicial);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[85] flex justify-end bg-slate-900/30 backdrop-blur-[1px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Meu perfil">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Meu perfil</h2>
            <p className="mt-0.5 text-xs text-slate-500">Seus dados, segurança e assinatura</p>
          </div>
          <IconBtn label="Fechar" onClick={onClose}><X size={18} /></IconBtn>
        </div>
        <nav className="flex gap-1 border-b border-slate-100 px-4 pt-2" role="tablist">
          {(["Dados", "Segurança", "Assinatura"] as const).map((a) => (
            <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className={`rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition ${aba === a ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{a}</button>
          ))}
        </nav>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!usuario ? <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-slate-300" /></div> : aba === "Dados" ? <AbaDados onAlterarFoto={onAlterarFoto} /> : aba === "Segurança" ? <AbaSeguranca /> : <AbaAssinatura />}
        </div>
      </aside>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MENU DA ENGRENAGEM / AVATAR
   ═══════════════════════════════════════════════════════════════ */

function PerfilMenu({ posicao, gatilho, onPerfil, onFoto }: { posicao: "cima" | "baixo"; gatilho: (p: { aberto: boolean; alternar: () => void }) => React.ReactNode; onPerfil: () => void; onFoto: () => void }) {
  const { usuario, sair } = useSessao();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const item = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600";

  return (
    <div ref={ref} className="relative">
      {gatilho({ aberto, alternar: () => setAberto((v) => !v) })}
      {aberto && (
        <div role="menu" className={`absolute z-[80] w-[264px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.16)] ${posicao === "cima" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2"}`}>
          <div className="border-b border-slate-100 px-3 pb-3 pt-2">
            <p className="truncate text-sm font-extrabold text-slate-900">{usuario?.nome ?? "—"}</p>
            <p className="truncate text-xs text-slate-500">{usuario?.cargo || ROTULO_ROLE[usuario?.role ?? ""] || ""}</p>
          </div>
          <div className="py-1.5">
            <button role="menuitem" className={item} onClick={() => { setAberto(false); onPerfil(); }}><User size={16} className="text-slate-400" /> Meu Perfil</button>
            <button role="menuitem" className={item} onClick={() => { setAberto(false); onFoto(); }}><Camera size={16} className="text-slate-400" /> Alterar Foto</button>
            <Link role="menuitem" href={ROTA_CONFIGURACOES} className={item} onClick={() => setAberto(false)}><Settings size={16} className="text-slate-400" /> Configurações</Link>
          </div>
          <div className="border-t border-slate-100 pt-1.5">
            <button role="menuitem" className={`${item} !text-rose-600 hover:!bg-rose-50`} onClick={() => void sair()}><LogOut size={16} /> Sair do sistema</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APP SHELL
   ═══════════════════════════════════════════════════════════════ */

export type AppShellProps = {
  children: React.ReactNode;
  /** Migalhas do topo, ex.: ["Gestão Clínica", "Protocolos"]. O último item fica em destaque. */
  trilha: string[];
  /** Busca do topo (opcional). O atalho "/" foca o campo. */
  busca?: { valor: string; onChange: (v: string) => void; placeholder: string };
  /** Botões extras à esquerda do sino (ex.: "Novo agendamento"). */
  acoes?: React.ReactNode;
};

function ShellInterno({ children, trilha, busca, acoes }: AppShellProps) {
  const { usuario } = useSessao();
  const pathname = usePathname() ?? "";
  const [menuMobile, setMenuMobile] = useState(false);
  const [perfil, setPerfil] = useState<AbaPerfil | null>(null);
  const [foto, setFoto] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

  const nome = usuario?.nome ?? "";
  const clinica = usuario?.clinica;
  const unidade = clinica?.unidade || clinica?.nome || "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const digitando = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.key === "/" && !digitando && !e.ctrlKey && !e.metaKey && busca) {
        e.preventDefault();
        buscaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busca]);

  const abrirPerfil = () => setPerfil("Dados");
  const abrirFoto = () => setFoto(true);

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">
      {menuMobile && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setMenuMobile(false)} aria-hidden />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[232px] shrink-0 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${menuMobile ? "translate-x-0" : "-translate-x-full"}`} aria-label="Navegação principal">
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><Activity size={20} /></span>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight text-slate-900">HealthSystem</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Clinical Suite</p>
          </div>
        </div>

        <div className="flex w-full items-center gap-2.5 border-y border-slate-100 px-5 py-3">
          {clinica?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clinica.logo} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] font-semibold text-blue-600">{clinica?.nome ?? "\u00A0"}</span>
            <span className="block truncate text-[13px] font-semibold text-slate-800">{unidade || "\u00A0"}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-slate-400" aria-hidden />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.section} className="mb-5">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.section}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link href={item.href} onClick={() => setMenuMobile(false)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}>
                        <span className={active ? "text-blue-600" : "text-slate-400"}>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <PerfilMenu
            posicao="cima"
            onPerfil={abrirPerfil}
            onFoto={abrirFoto}
            gatilho={({ aberto, alternar }) => (
              <div className="flex items-center gap-2">
                <button type="button" onClick={alternar} aria-expanded={aberto} aria-haspopup="menu" className="-m-1 flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                  <Avatar nome={nome} foto={usuario?.avatar} size={36} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-bold text-slate-900">{nome || "\u00A0"}</span>
                    <span className="block truncate text-[11px] text-blue-600">{usuario?.cargo || ROTULO_ROLE[usuario?.role ?? ""] || "\u00A0"}</span>
                  </span>
                </button>
                <IconBtn label="Configurações da conta" onClick={alternar} expanded={aberto}><Settings size={16} /></IconBtn>
              </div>
            )}
          />
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Plano Enterprise</span>
            <button className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"><CircleHelp size={13} /> Suporte</button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[62px] shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-50 lg:hidden" onClick={() => setMenuMobile(true)} aria-label="Abrir menu"><Menu size={20} /></button>

          <nav aria-label="Trilha" className="hidden items-center gap-2 text-[13px] sm:flex">
            {trilha.map((t, i) => (
              <React.Fragment key={t + i}>
                {i > 0 && <span className="text-slate-300">›</span>}
                <span className={i === trilha.length - 1 ? "font-bold text-slate-900" : "text-slate-500"}>{t}</span>
              </React.Fragment>
            ))}
          </nav>

          {busca && (
            <div className="relative hidden w-full max-w-[300px] md:block">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input ref={buscaRef} value={busca.valor} onChange={(e) => busca.onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-[13px] placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder={busca.placeholder} aria-label={busca.placeholder} />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 px-1.5 text-[10px] font-semibold text-slate-400">/</kbd>
            </div>
          )}

          <span className="hidden items-center gap-1.5 text-[13px] font-semibold text-blue-600 lg:flex"><MapPin size={15} /> {unidade}</span>

          <div className="ml-auto flex items-center gap-2">
            {acoes}
            <NotificationBell />
            <button className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-50" aria-label="Ajuda"><CircleHelp size={18} /></button>
            <PerfilMenu
              posicao="baixo"
              onPerfil={abrirPerfil}
              onFoto={abrirFoto}
              gatilho={({ aberto, alternar }) => (
                <button type="button" onClick={alternar} aria-expanded={aberto} aria-haspopup="menu" aria-label="Menu do perfil" className="rounded-full ring-2 ring-transparent transition hover:ring-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                  <Avatar nome={nome} foto={usuario?.avatar} size={36} />
                </button>
              )}
            />
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">{children}</div>
      </div>

      {perfil && <PerfilDrawer abaInicial={perfil} onClose={() => setPerfil(null)} onAlterarFoto={abrirFoto} />}
      {foto && <AlterarFotoModal onClose={() => setFoto(false)} />}
    </div>
  );
}

/** O shell que todos os módulos importam. Cria a sessão sozinho se o layout raiz não montou o SessaoProvider. */
export function AppShell(props: AppShellProps) {
  const { ativo } = useSessao();
  return ativo ? (
    <ShellInterno {...props} />
  ) : (
    <SessaoProvider>
      <ShellInterno {...props} />
    </SessaoProvider>
  );
}