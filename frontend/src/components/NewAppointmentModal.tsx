"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Repeat,
  MessageCircle,
  UserPlus,
  Trash2,
  Save,
  ArrowRight,
  ExternalLink,
  Activity,
  Syringe,
  Building2,
  Wallet,
  Zap,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

/* ============================================================
 *  CONFIGURAÇÃO DA API  — ajuste aqui se seus endpoints forem outros
 * ============================================================ */
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const ENDPOINTS = {
  patients: "/api/patients", // clientes cadastrados (suporta ?q= no json-server)
  procedures: "/api/procedures", // catálogo de procedimentos
  appointments: "/api/appointments",
  professionals: "/api/appointments/professionals", // usuários reais (o id vai para a FK do agendamento)
};
const PATIENTS_PAGE = "/pacientes"; // rota de cadastro de clientes
const DRAFT_KEY = "agenda:new-appointment-draft:v1";

interface Professional {
  id: string;
  name: string;
  short: string;
  avatar: string;
}
const normalizeProfessional = (p: any): Professional => {
  const name = p.name ?? p.nome ?? p.fullName ?? p.user?.name ?? "Profissional";
  return { id: String(p.id), name, short: name.split(" ").slice(0, 2).join(" "), avatar: p.avatar ?? p.photo ?? p.foto ?? "" };
};
const ROOMS = ["Sala 01 VIP", "Sala 02 VIP"];
const GRID_START = 8 * 60;
const GRID_END = 19 * 60;

/* ============================================================
 *  TIPOS
 * ============================================================ */
export interface AgendaEvent {
  id: string;
  patientName: string;
  procedure: string;
  timeStart: string;
  timeEnd: string;
  value: string;
  doc: string;
  room: string;
  status: string;
  col: number;
  date?: string;
}

interface Patient {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  avatar: string;
  tier: string;
  lastVisit: string;
  allergies: string[];
  active: boolean;
}

interface Procedure {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  events: AgendaEvent[];
  nowMin: number;
  /** Modo "Encaixe rápido": começa hoje e já sugere o próximo horário livre */
  quick?: boolean;
  /** local: eventos que a API não aceitou (salvos só na tela) | refetch: houve sucesso na API */
  onCreated: (local: AgendaEvent[], refetch: boolean, firstDate: Date) => void;
}

/* ============================================================
 *  UTILS
 * ============================================================ */
const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};
const addMonths = (d: Date, n: number) => {
  const c = new Date(d);
  c.setMonth(c.getMonth() + n);
  return c;
};
const formatLongDate = (d: Date) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
const formatShort = (d: Date) =>
  `${WEEKDAYS[d.getDay()].split("-")[0].slice(0, 3)}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const formatDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}min` : `${h}h`;
};
const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n).replace(/\u00a0/g, " ");
const parseMoney = (s: string) => Number(String(s).replace(/\./g, "").replace(",", ".")) || 0;
const todayISO = () => toISO(new Date());

const maskCpf = (cpf: string) => {
  const d = (cpf || "").replace(/\D/g, "");
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : cpf || "CPF não informado";
};
const lastVisitLabel = (iso: string) => {
  if (!iso) return "Histórico não informado";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return "Última sessão: hoje";
  return `Última sessão: há ${days} ${days === 1 ? "dia" : "dias"}`;
};
const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

const normalizePatient = (p: any): Patient => {
  const raw = p.allergies ?? p.alergias ?? [];
  return {
    id: String(p.id),
    name: p.name ?? p.nome ?? p.fullName ?? "Sem nome",
    cpf: p.cpf ?? "",
    phone: p.phone ?? p.telefone ?? p.whatsapp ?? "",
    avatar: p.avatar ?? p.photo ?? p.foto ?? "",
    tier: p.tier ?? p.tags?.[0] ?? p.category ?? p.plano ?? "",
    lastVisit: p.lastVisit ?? p.ultimaSessao ?? "",
    allergies: Array.isArray(raw) ? raw : raw ? [String(raw)] : [],
    active: p.active !== false && p.ativo !== false,
  };
};

const normalizeProcedure = (p: any): Procedure => ({
  id: String(p.id),
  name: p.name ?? p.nome ?? "Procedimento",
  category: p.category ?? p.categoria ?? "Geral",
  duration: Number(p.duration ?? p.duracao ?? p.durationMin ?? 30) || 30,
  price: typeof (p.price ?? p.valor ?? p.preco) === "string" ? parseMoney(p.price ?? p.valor ?? p.preco) : Number(p.price ?? p.valor ?? p.preco ?? 0),
});

/* Dados de exemplo — usados SOMENTE se a API estiver offline */
const d = (days: number) => toISO(addDays(new Date(), -days));
const MOCK_PATIENTS: Patient[] = [
  { id: "p1", name: "Sofia Almeida", cpf: "12349211899", phone: "(11) 98234-9988", avatar: "https://i.pravatar.cc/150?img=4", tier: "VIP PRIME", lastVisit: d(180), allergies: [], active: true },
  { id: "p2", name: "Beatriz Moura", cpf: "98765432100", phone: "(11) 97711-2030", avatar: "https://i.pravatar.cc/150?img=47", tier: "VIP", lastVisit: d(32), allergies: ["Látex"], active: true },
  { id: "p3", name: "Camila Rocha", cpf: "45678912355", phone: "(11) 99120-4411", avatar: "", tier: "", lastVisit: d(9), allergies: [], active: true },
  { id: "p4", name: "Fernanda Lima", cpf: "32165498722", phone: "(11) 98877-6655", avatar: "https://i.pravatar.cc/150?img=32", tier: "VIP", lastVisit: "", allergies: ["Lidocaína"], active: false },
];
const MOCK_PROCEDURES: Procedure[] = [
  { id: "m1", name: "Harmonização Facial Full Face", category: "Injetáveis", duration: 60, price: 5200 },
  { id: "m2", name: "Toxina Botulínica (3 Áreas)", category: "Injetáveis", duration: 30, price: 1600 },
  { id: "m3", name: "Preenchimento Labial", category: "Injetáveis", duration: 45, price: 1800 },
  { id: "m4", name: "Bioestimulador de Colágeno", category: "Injetáveis", duration: 60, price: 3200 },
  { id: "m5", name: "Fios de PDO", category: "Lifting", duration: 90, price: 4200 },
  { id: "m6", name: "Limpeza de Pele Premium", category: "Facial", duration: 60, price: 450 },
  { id: "m7", name: "Peeling Químico", category: "Facial", duration: 45, price: 680 },
  { id: "m8", name: "Avaliação Clínica", category: "Consulta", duration: 30, price: 250 },
];

const STEPS = [
  { n: 1, label: "Cliente" },
  { n: 2, label: "Procedimentos" },
  { n: 3, label: "Horário" },
  { n: 4, label: "Confirmação" },
];

const labelCls = "text-[10px] font-bold text-slate-400 uppercase tracking-widest";
const inputCls =
  "w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-[13px] font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400";

type RepeatEvery = "none" | "7" | "14" | "monthly";
const REPEAT_OPTIONS: { v: RepeatEvery; label: string }[] = [
  { v: "none", label: "Não repetir" },
  { v: "7", label: "Toda semana" },
  { v: "14", label: "A cada 15 dias" },
  { v: "monthly", label: "Todo mês" },
];

/* ============================================================
 *  COMPONENTES AUXILIARES
 * ============================================================ */
function Avatar({ src, name, size = 44 }: { src?: string; name: string; size?: number }) {
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover border border-slate-100 shrink-0" />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 font-black text-[13px] flex items-center justify-center shrink-0 border border-blue-100"
    >
      {initials(name)}
    </div>
  );
}

function Toggle({ checked, onChange, title, desc, icon }: any) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 text-left transition-colors"
    >
      <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-bold text-slate-900">{title}</span>
        <span className="block text-[11px] font-medium text-slate-500">{desc}</span>
      </span>
      <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${checked ? "bg-blue-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

/* ============================================================
 *  MODAL
 * ============================================================ */
export default function NewAppointmentModal({ open, onClose, selectedDate, events, nowMin, quick = false, onCreated }: Props) {
  const draftKey = quick ? `${DRAFT_KEY}:quick` : DRAFT_KEY;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Cliente
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // Procedimentos
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [procLoading, setProcLoading] = useState(false);
  const [procQuery, setProcQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [discount, setDiscount] = useState<{ type: "percent" | "value"; amount: string }>({ type: "percent", amount: "" });

  // Horário
  const [date, setDate] = useState<Date>(selectedDate);
  const [slot, setSlot] = useState("");
  const [slotStep, setSlotStep] = useState<30 | 15>(30);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [profError, setProfError] = useState("");
  const [room, setRoom] = useState(ROOMS[0]);
  const [status, setStatus] = useState<"Confirmado" | "Aguardando">("Confirmado");
  const [repeat, setRepeat] = useState<{ every: RepeatEvery; count: number }>({ every: "none", count: 4 });

  // Detalhes finais
  const [notes, setNotes] = useState("");
  const [deposit, setDeposit] = useState("");
  const [reminder, setReminder] = useState(true);

  const [draft, setDraft] = useState<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ---------- reset ao abrir ---------- */
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setPatient(null);
    setPatientQuery("");
    setSelectedIds([]);
    setDiscount({ type: "percent", amount: "" });
    setProcQuery("");
    setCategory("Todos");
    setDate(quick ? new Date() : selectedDate);
    setSlot("");
    setSlotStep(30);
    setRoom(ROOMS[0]);
    setStatus("Confirmado");
    setRepeat({ every: "none", count: 4 });
    setNotes("");
    setDeposit("");
    setReminder(true);
    try {
      const raw = localStorage.getItem(draftKey);
      setDraft(raw ? JSON.parse(raw) : null);
    } catch {
      setDraft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ---------- busca de clientes (somente cadastrados) ---------- */
  useEffect(() => {
    if (!open || step !== 1) return;
    const ctrl = new AbortController();
    const q = patientQuery.trim();
    const t = setTimeout(async () => {
      setPatientsLoading(true);
      try {
        const url = `${API}${ENDPOINTS.patients}?_limit=8${q ? `&q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error("Falha ao buscar clientes");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data ?? [];
        const low = q.toLowerCase();
        const digits = q.replace(/\D/g, "");
        setPatientResults(
          list
            .map(normalizePatient)
            .filter(
              (p: Patient) =>
                !q ||
                p.name.toLowerCase().includes(low) ||
                (digits && p.cpf.replace(/\D/g, "").includes(digits)) ||
                (digits && p.phone.replace(/\D/g, "").includes(digits))
            )
            .slice(0, 8)
        );
        setOffline(false);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        const low = q.toLowerCase();
        const digits = q.replace(/\D/g, "");
        setPatientResults(
          MOCK_PATIENTS.filter(
            (p) => !q || p.name.toLowerCase().includes(low) || (digits && p.cpf.includes(digits)) || (digits && p.phone.replace(/\D/g, "").includes(digits))
          )
        );
        setOffline(true);
      } finally {
        if (!ctrl.signal.aborted) setPatientsLoading(false);
      }
    }, q ? 250 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [open, step, patientQuery]);

  useEffect(() => setActiveIdx(0), [patientResults]);

  useEffect(() => {
    if (open && step === 1 && !patient) setTimeout(() => searchRef.current?.focus(), 150);
  }, [open, step, patient]);

  /* ---------- catálogo de procedimentos ---------- */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setProcLoading(true);
      try {
        const res = await fetch(`${API}${ENDPOINTS.procedures}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const list = (Array.isArray(data) ? data : data.data ?? []).filter((p: any) => p.active !== false && p.ativo !== false);
        if (!cancelled) setProcedures(list.map(normalizeProcedure));
      } catch {
        if (!cancelled) setProcedures(MOCK_PROCEDURES);
      } finally {
        if (!cancelled) setProcLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  /* ---------- profissionais reais do banco ---------- */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}${ENDPOINTS.professionals}`);
        if (!res.ok) throw new Error(`Não foi possível carregar profissionais (HTTP ${res.status}). Confira ENDPOINTS.professionals.`);
        const data = await res.json();
        const list = (Array.isArray(data) ? data : data.data ?? [])
          .filter((p: any) => p.active !== false && p.ativo !== false)
          .map(normalizeProfessional);
        if (!list.length) throw new Error("Nenhum profissional cadastrado no banco.");
        if (cancelled) return;
        setProfessionals(list);
        setProfError("");
        setProfessionalId((cur) => (list.some((p: Professional) => p.id === cur) ? cur : (list.find((p: Professional) => /joana/i.test(p.name)) ?? list[0]).id));
      } catch (err: any) {
        if (cancelled) return;
        if (err instanceof TypeError) {
          // API fora do ar: permite agendar só na tela (o POST também vai falhar e cair no fallback local)
          const fb = { id: "local", name: "Dra. Joana Oliveira", short: "Dra. Joana", avatar: "https://i.pravatar.cc/150?img=5" };
          setProfessionals([fb]);
          setProfessionalId("local");
          setProfError("");
        } else {
          setProfessionals([]);
          setProfessionalId("");
          setProfError(err?.message ?? "Erro ao carregar profissionais.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  /* ---------- derivados ---------- */
  const professional = professionals.find((p) => p.id === professionalId) ?? null;
  const chosen = selectedIds.map((id) => procedures.find((p) => p.id === id)).filter(Boolean) as Procedure[];
  const totalDur = chosen.reduce((s, p) => s + p.duration, 0);
  const subtotal = chosen.reduce((s, p) => s + p.price, 0);
  const discAmount = parseMoney(discount.amount);
  const discountValue = Math.min(subtotal, Math.max(0, discount.type === "percent" ? (subtotal * Math.min(discAmount, 100)) / 100 : discAmount));
  const total = subtotal - discountValue;
  const depositValue = Math.min(total, parseMoney(deposit));
  const dur = totalDur || 30;

  const categories = ["Todos", ...Array.from(new Set(procedures.map((p) => p.category)))];
  const filteredProcs = procedures.filter(
    (p) => (category === "Todos" || p.category === category) && p.name.toLowerCase().includes(procQuery.trim().toLowerCase())
  );

  const isFree = (iso: string, startMin: number, duration: number) => {
    const end = startMin + duration;
    if (end > GRID_END) return false;
    if (iso === todayISO() && startMin < nowMin) return false;
    return !events.some((e) => e.date === iso && toMin(e.timeStart) < end && toMin(e.timeEnd) > startMin);
  };

  const slots: number[] = [];
  for (let m = GRID_START; m + dur <= GRID_END; m += slotStep) slots.push(m);
  const dateISO = toISO(date);
  const anyFreeToday = slots.some((m) => isFree(dateISO, m, dur));

  // se o horário escolhido deixou de ser válido (trocou dia/procedimento), limpa
  useEffect(() => {
    if (slot && !isFree(dateISO, toMin(slot), dur)) setSlot("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateISO, dur, events]);

  const occurrences =
    slot && totalDur
      ? Array.from({ length: repeat.every === "none" ? 1 : repeat.count }, (_, i) => {
          const dt = repeat.every === "monthly" ? addMonths(date, i) : addDays(date, i * (repeat.every === "none" ? 0 : Number(repeat.every)));
          const iso = toISO(dt);
          return { date: dt, iso, free: isFree(iso, toMin(slot), totalDur) };
        })
      : [];
  const freeOccurrences = occurrences.filter((o) => o.free);
  const blockedOccurrences = occurrences.filter((o) => !o.free);

  const findNextFree = () => {
    for (let i = 0; i <= 45; i++) {
      const dt = addDays(new Date(), i);
      const iso = toISO(dt);
      for (let m = GRID_START; m + dur <= GRID_END; m += 30) {
        if (isFree(iso, m, dur)) {
          setDate(dt);
          setSlot(toTime(m));
          return;
        }
      }
    }
    toast?.error("Nenhum horário livre nos próximos 45 dias.");
  };

  // Encaixe rápido: ao chegar no passo do horário, já escolhe o primeiro horário livre
  useEffect(() => {
    if (open && quick && step === 3 && !slot && totalDur) findNextFree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quick, step, totalDur]);

  const valid: Record<number, boolean> = {
    1: !!patient,
    2: chosen.length > 0,
    3: !!slot && !!room && !!professional,
    4: freeOccurrences.length > 0,
  };
  const canGo = (n: number) => n <= step || [1, 2, 3].filter((x) => x < n).every((x) => valid[x]);
  const hint =
    step === 1 ? "Selecione um cliente cadastrado" : step === 2 ? "Escolha ao menos um procedimento" : step === 3 ? (profError || "Escolha um horário disponível") : "";

  /* ---------- ações ---------- */
  const toggleProc = (id: string) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const saveDraft = () => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ patient, selectedIds, discount, dateISO, slot, room, status, notes, reminder, deposit, repeat, step })
      );
      toast?.success("Rascunho salvo neste dispositivo.");
      onClose();
    } catch {
      toast?.error("Não foi possível salvar o rascunho.");
    }
  };

  const restoreDraft = () => {
    if (!draft) return;
    setPatient(draft.patient ?? null);
    setSelectedIds(draft.selectedIds ?? []);
    setDiscount(draft.discount ?? { type: "percent", amount: "" });
    if (draft.dateISO && draft.dateISO >= todayISO()) setDate(fromISO(draft.dateISO));
    setSlot(draft.slot ?? "");
    setRoom(draft.room ?? ROOMS[0]);
    setStatus(draft.status ?? "Confirmado");
    setNotes(draft.notes ?? "");
    setReminder(draft.reminder ?? true);
    setDeposit(draft.deposit ?? "");
    setRepeat(draft.repeat ?? { every: "none", count: 4 });
    setStep(draft.step ?? 1);
    setDraft(null);
    toast?.success("Rascunho restaurado.");
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setDraft(null);
  };

  const handleConfirm = async () => {
    if (!patient || !professional || !chosen.length || !slot || !freeOccurrences.length) return;
    setSaving(true);
    const start = toMin(slot);
    const stamp = Date.now();
    const evs = freeOccurrences.map((o, i) => ({
      id: `apt-${stamp}-${i}`,
      patientId: patient.id,
      patientName: patient.name,
      procedure: chosen.map((p) => p.name).join(" + "),
      procedureId: chosen[0].id,
      procedureIds: chosen.map((p) => p.id),
      timeStart: slot,
      timeEnd: toTime(start + totalDur),
      value: formatBRL(total),
      valueNumber: total,
      discount: discountValue,
      deposit: depositValue,
      doc: professional.short,
      professionalId: professional.id,
      room,
      status,
      col: 0,
      date: o.iso,
      notes: notes.trim(),
      reminder,
      sessionIndex: i + 1,
      sessionsTotal: freeOccurrences.length,
    })) as AgendaEvent[];

    type Result = { kind: "ok" } | { kind: "network" } | { kind: "http"; msg: string };
    const results: Result[] = await Promise.all(
      evs.map(async (ev): Promise<Result> => {
        try {
          const res = await fetch(`${API}${ENDPOINTS.appointments}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ev),
          });
          if (res.ok) return { kind: "ok" };
          let msg = `Erro ${res.status} ao salvar`;
          try {
            const m = (await res.json())?.message;
            msg = Array.isArray(m) ? m.join(", ") : m ?? msg;
          } catch {}
          return { kind: "http", msg };
        } catch {
          return { kind: "network" }; // API fora do ar
        }
      })
    );
    const okCount = results.filter((r) => r.kind === "ok").length;
    const localEvs = evs.filter((_, i) => results[i].kind === "network");
    const httpErr = results.find((r): r is { kind: "http"; msg: string } => r.kind === "http");

    // A API respondeu com erro e nada foi salvo: mantém o modal aberto e mostra o motivo real
    if (httpErr && okCount === 0 && localEvs.length === 0) {
      toast?.error(`Não foi possível agendar: ${httpErr.msg}`);
      setSaving(false);
      return;
    }

    onCreated(localEvs, okCount > 0, freeOccurrences[0].date);

    if (httpErr) {
      toast?.error(`Algumas sessões não foram salvas: ${httpErr.msg}`);
    } else if (localEvs.length) {
      toast?.success("API offline: agendamento salvo apenas localmente.");
    } else {
      toast?.success(evs.length > 1 ? `${evs.length} sessões agendadas com sucesso!` : "Agendamento confirmado com sucesso!");
    }
    if (blockedOccurrences.length) {
      toast?.message?.(`${blockedOccurrences.length} data(s) ocupada(s) foram ignoradas.`);
    }
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setSaving(false);
    onClose();
  };

  const next = () => (step < 4 ? valid[step] && setStep(step + 1) : handleConfirm());

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, patientResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = patientResults[activeIdx];
      if (p && p.active) setPatient(p);
    }
  };

  /* ============================================================
   *  RENDER
   * ============================================================ */
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Novo agendamento clínico"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-[1000px] max-h-[94vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* ============ HEADER ============ */}
            <div className="px-7 pt-6 pb-5 border-b border-slate-100 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-[11px] font-bold text-blue-600">{quick ? "O próximo horário livre é sugerido automaticamente" : "Agendamento com disponibilidade em tempo real"}</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{quick ? "Encaixe rápido" : "Novo agendamento clínico"}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-colors"
                >
                  Esc <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-2 mt-5">
                {STEPS.map((s, i) => {
                  const done = s.n < step && valid[s.n];
                  const current = s.n === step;
                  const enabled = canGo(s.n);
                  return (
                    <React.Fragment key={s.n}>
                      <button
                        type="button"
                        disabled={!enabled}
                        onClick={() => setStep(s.n)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border transition-colors ${
                          current ? "bg-blue-50 border-blue-100" : "border-transparent hover:bg-slate-50"
                        } ${!enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            done ? "bg-slate-900 text-white" : current ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {done ? <Check className="w-3.5 h-3.5" /> : s.n}
                        </span>
                        <span className={`text-[12px] font-bold ${current ? "text-blue-900" : "text-slate-700"}`}>{s.label}</span>
                      </button>
                      {i < STEPS.length - 1 && <span className="h-px flex-1 max-w-[40px] bg-slate-200" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ============ BODY ============ */}
            <div className="flex-1 min-h-0 flex bg-slate-50/60">
              {/* ---------- Conteúdo do passo ---------- */}
              <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar p-7">
                {/* ===== PASSO 1: CLIENTE ===== */}
                {step === 1 && (
                  <div className="space-y-5">
                    {draft && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-center gap-3">
                        <Save className="w-4 h-4 text-blue-600 shrink-0" />
                        <p className="text-[12px] font-bold text-blue-900 flex-1">Você tem um rascunho de agendamento salvo.</p>
                        <button onClick={restoreDraft} className="text-[12px] font-bold text-blue-700 hover:underline">Retomar</button>
                        <button onClick={discardDraft} className="text-[12px] font-bold text-slate-500 hover:underline">Descartar</button>
                      </div>
                    )}

                    {patient ? (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className={labelCls}>Cliente selecionado</span>
                          <button onClick={() => setPatient(null)} className="text-[12px] font-bold text-blue-600 hover:text-blue-700">
                            Alterar cliente
                          </button>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                          <Avatar src={patient.avatar} name={patient.name} size={56} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-black text-slate-900 text-[16px]">{patient.name}</h3>
                              {patient.tier && (
                                <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">{patient.tier}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[12px] font-medium text-slate-500 flex-wrap">
                              <span>CPF {maskCpf(patient.cpf)}</span>
                              <span className="text-slate-300">•</span>
                              <span>{patient.phone || "Sem telefone"}</span>
                              <span className="text-slate-300">•</span>
                              <span>{lastVisitLabel(patient.lastVisit)}</span>
                            </div>
                          </div>
                        </div>
                        {patient.allergies.length > 0 && (
                          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 flex gap-3">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[12px] font-bold text-rose-900">Atenção: alergias registradas</p>
                              <p className="text-[12px] font-medium text-rose-800">{patient.allergies.join(", ")}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className={`${labelCls} block mb-3`}>Buscar cliente cadastrado</span>
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            ref={searchRef}
                            value={patientQuery}
                            onChange={(e) => setPatientQuery(e.target.value)}
                            onKeyDown={onSearchKey}
                            placeholder="Nome, CPF ou telefone"
                            className={`${inputCls} pl-10`}
                          />
                          {patientsLoading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
                        </div>

                        {offline && (
                          <p className="mt-2 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Não foi possível conectar à API. Exibindo clientes de exemplo.
                          </p>
                        )}

                        <p className={`${labelCls} mt-5 mb-2`}>{patientQuery.trim() ? "Resultados" : "Clientes recentes"}</p>
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
                          {patientResults.map((p, i) => (
                            <button
                              key={p.id}
                              type="button"
                              disabled={!p.active}
                              onClick={() => setPatient(p)}
                              onMouseEnter={() => setActiveIdx(i)}
                              className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors ${
                                !p.active ? "opacity-50 cursor-not-allowed" : i === activeIdx ? "bg-blue-50/60" : "hover:bg-slate-50"
                              }`}
                            >
                              <Avatar src={p.avatar} name={p.name} size={40} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-bold text-slate-900 truncate">{p.name}</span>
                                  {p.tier && <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">{p.tier}</span>}
                                  {!p.active && <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Cadastro inativo</span>}
                                </div>
                                <p className="text-[11px] font-medium text-slate-500 truncate">
                                  CPF {maskCpf(p.cpf)} • {p.phone || "Sem telefone"}
                                </p>
                              </div>
                              {p.allergies.length > 0 && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" aria-label="Possui alergias" />}
                              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                            </button>
                          ))}
                          {!patientsLoading && patientResults.length === 0 && (
                            <div className="px-5 py-8 text-center">
                              <p className="text-[13px] font-bold text-slate-700">Nenhum cliente encontrado</p>
                              <p className="text-[12px] font-medium text-slate-500 mt-1">Só é possível agendar clientes já cadastrados.</p>
                              <a
                                href={PATIENTS_PAGE}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 mt-4 h-9 px-4 rounded-xl text-[12px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                              >
                                <UserPlus className="w-4 h-4" /> Cadastrar cliente <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-slate-400 mt-3">Use ↑ ↓ para navegar e Enter para selecionar.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== PASSO 2: PROCEDIMENTOS ===== */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input value={procQuery} onChange={(e) => setProcQuery(e.target.value)} placeholder="Buscar procedimento" className={`${inputCls} pl-10`} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCategory(c)}
                          className={`h-8 px-3.5 rounded-full text-[12px] font-bold border transition-colors ${
                            category === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
                      {procLoading && (
                        <div className="p-8 flex justify-center">
                          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                        </div>
                      )}
                      {!procLoading &&
                        filteredProcs.map((p) => {
                          const on = selectedIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleProc(p.id)}
                              aria-pressed={on}
                              className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors ${on ? "bg-blue-50/60" : "hover:bg-slate-50"}`}
                            >
                              <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"}`}>
                                {on && <Check className="w-3.5 h-3.5 text-white" />}
                              </span>
                              <span className="w-8 h-8 rounded-lg bg-slate-100 text-blue-600 flex items-center justify-center shrink-0">
                                {p.category === "Injetáveis" ? <Syringe className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-bold text-slate-900 truncate">{p.name}</span>
                                <span className="block text-[11px] font-medium text-slate-500">
                                  {p.category} • {formatDuration(p.duration)}
                                </span>
                              </span>
                              <span className="text-[13px] font-black text-slate-900">{formatBRL(p.price)}</span>
                            </button>
                          );
                        })}
                      {!procLoading && filteredProcs.length === 0 && (
                        <p className="px-5 py-8 text-center text-[13px] font-medium text-slate-500">Nenhum procedimento encontrado.</p>
                      )}
                    </div>

                    {chosen.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={labelCls}>Desconto (opcional)</span>
                          <div className="flex bg-slate-100 rounded-lg p-0.5">
                            {(["percent", "value"] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setDiscount((x) => ({ ...x, type: t }))}
                                className={`px-3 h-7 rounded-md text-[12px] font-bold transition-colors ${discount.type === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                              >
                                {t === "percent" ? "%" : "R$"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          inputMode="decimal"
                          value={discount.amount}
                          onChange={(e) => setDiscount((x) => ({ ...x, amount: e.target.value.replace(/[^\d.,]/g, "") }))}
                          placeholder={discount.type === "percent" ? "Ex.: 10" : "Ex.: 200,00"}
                          className={inputCls}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ===== PASSO 3: HORÁRIO ===== */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <span className={`${labelCls} block mb-2`}>Profissional</span>
                        {professional ? (
                          <div className="flex items-center gap-3">
                            <Avatar src={professional.avatar} name={professional.name} size={36} />
                            <div className="min-w-0 flex-1">
                              {professionals.length > 1 ? (
                                <select
                                  value={professionalId}
                                  onChange={(e) => setProfessionalId(e.target.value)}
                                  className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-[13px] font-bold text-slate-900 outline-none focus:border-blue-500"
                                >
                                  {professionals.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-[13px] font-bold text-slate-900 truncate">{professional.name}</p>
                              )}
                              <p className="text-[11px] font-medium text-slate-500 mt-0.5">Profissional responsável</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[12px] font-bold text-rose-600">{profError || "Carregando profissionais..."}</p>
                        )}
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <span className={`${labelCls} block mb-2`}>Sala</span>
                        <div className="flex gap-2">
                          {ROOMS.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setRoom(r)}
                              className={`flex-1 h-10 rounded-xl text-[12px] font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                                room === r ? "border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-500/10" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5" /> {r.replace("Sala ", "")}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Data */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className={labelCls}>Data e horário</span>
                        <button type="button" onClick={findNextFree} className="text-[12px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" /> Próximo horário livre
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={dateISO <= todayISO()}
                          onClick={() => setDate((x) => addDays(x, -1))}
                          aria-label="Dia anterior"
                          className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <input
                          type="date"
                          min={todayISO()}
                          value={dateISO}
                          onChange={(e) => e.target.value && setDate(fromISO(e.target.value))}
                          className={`${inputCls} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={() => setDate((x) => addDays(x, 1))}
                          aria-label="Próximo dia"
                          className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[12px] font-bold text-slate-700" suppressHydrationWarning>
                        {formatLongDate(date)} • duração {formatDuration(dur)}
                      </p>
                    </div>

                    {/* Grade de slots */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-white border border-slate-300" />Livre</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-200" />Ocupado</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-600" />Selecionado</span>
                        </div>
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                          {([30, 15] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSlotStep(s)}
                              className={`px-2.5 h-7 rounded-md text-[11px] font-bold transition-colors ${slotStep === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                            >
                              {s} min
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                        {slots.map((m) => {
                          const t = toTime(m);
                          const free = isFree(dateISO, m, dur);
                          const active = slot === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              disabled={!free}
                              onClick={() => setSlot(t)}
                              className={`h-10 rounded-xl text-[13px] font-bold tabular-nums border transition-all ${
                                active
                                  ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/30"
                                  : free
                                  ? "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                                  : "bg-slate-100 border-slate-100 text-slate-300 line-through cursor-not-allowed"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                      {!anyFreeToday && (
                        <p className="mt-2 text-[12px] font-bold text-rose-600">Sem horários livres para {formatDuration(dur)} neste dia. Escolha outra data.</p>
                      )}
                    </div>

                    {/* Status + recorrência */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <span className={`${labelCls} block mb-2`}>Status inicial</span>
                        <div className="flex bg-slate-100 rounded-xl p-1">
                          {(["Confirmado", "Aguardando"] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setStatus(s)}
                              className={`flex-1 h-9 rounded-lg text-[12px] font-bold transition-colors ${status === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <span className={`${labelCls} block mb-2`}>Repetição</span>
                        <div className="flex gap-2">
                          <select
                            value={repeat.every}
                            onChange={(e) => setRepeat((r) => ({ ...r, every: e.target.value as RepeatEvery }))}
                            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-700 outline-none focus:border-blue-500"
                          >
                            {REPEAT_OPTIONS.map((o) => (
                              <option key={o.v} value={o.v}>{o.label}</option>
                            ))}
                          </select>
                          {repeat.every !== "none" && (
                            <select
                              value={repeat.count}
                              onChange={(e) => setRepeat((r) => ({ ...r, count: Number(e.target.value) }))}
                              className="w-24 h-10 px-3 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-700 outline-none focus:border-blue-500"
                              aria-label="Número de sessões"
                            >
                              {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                                <option key={n} value={n}>{n}x</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>

                    {repeat.every !== "none" && slot && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <Repeat className="w-4 h-4 text-slate-400" />
                          <span className="text-[12px] font-bold text-slate-800">Sessões previstas às {slot}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {occurrences.map((o, i) => (
                            <span
                              key={o.iso}
                              className={`px-2.5 h-7 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border ${
                                o.free ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200 line-through"
                              }`}
                              title={o.free ? "Disponível" : "Horário ocupado — será ignorado"}
                            >
                              {i + 1}ª • {formatShort(o.date)}
                            </span>
                          ))}
                        </div>
                        {blockedOccurrences.length > 0 && (
                          <p className="text-[11px] font-medium text-amber-700 mt-3">
                            {blockedOccurrences.length} data(s) ocupada(s) não serão agendadas.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ===== PASSO 4: CONFIRMAÇÃO ===== */}
                {step === 4 && patient && (
                  <div className="space-y-5">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
                      {[
                        { n: 1, title: "Cliente", body: `${patient.name} • ${patient.phone || "Sem telefone"}` },
                        { n: 2, title: "Procedimentos", body: `${chosen.map((p) => p.name).join(", ")} • ${formatDuration(totalDur)}` },
                        {
                          n: 3,
                          title: "Horário",
                          body: `${formatShort(date)} às ${slot} • ${room}${repeat.every !== "none" ? ` • ${freeOccurrences.length} sessões` : ""}`,
                        },
                      ].map((r) => (
                        <div key={r.n} className="flex items-center gap-4 px-4 py-3.5">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={labelCls}>{r.title}</p>
                            <p className="text-[13px] font-bold text-slate-900 truncate" suppressHydrationWarning>{r.body}</p>
                          </div>
                          <button onClick={() => setStep(r.n)} className="text-[12px] font-bold text-blue-600 hover:text-blue-700">Editar</button>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className={labelCls}>Sinal / entrada (opcional)</label>
                        <div className="relative">
                          <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            inputMode="decimal"
                            value={deposit}
                            onChange={(e) => setDeposit(e.target.value.replace(/[^\d.,]/g, ""))}
                            placeholder="0,00"
                            className={`${inputCls} pl-10`}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className={labelCls}>Comunicação</span>
                        <Toggle
                          checked={reminder}
                          onChange={setReminder}
                          title="Lembrete por WhatsApp"
                          desc="Confirmação e aviso antes da sessão"
                          icon={<MessageCircle className="w-4 h-4" />}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className={labelCls}>Observações internas</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Ex.: paciente prefere atendimento no fim da manhã; trazer exames recentes."
                        className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-[13px] font-medium text-slate-900 outline-none transition-all resize-none placeholder:text-slate-400"
                      />
                      <p className="text-[11px] font-medium text-slate-400 text-right">{notes.length}/500</p>
                    </div>

                    {blockedOccurrences.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[12px] font-medium text-amber-900">
                          {blockedOccurrences.length} data(s) da repetição estão ocupadas e serão ignoradas. {freeOccurrences.length} sessão(ões) serão criadas.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ---------- Voucher (resumo ao vivo) ---------- */}
              <aside className="hidden md:flex w-[310px] shrink-0 p-5 pl-0">
                <div className="w-full bg-[#0B0F19] rounded-2xl p-5 text-white flex flex-col shadow-xl overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-start mb-5">
                    <h3 className="font-bold text-[14px]">Resumo do agendamento</h3>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                        slot ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-700/40 text-slate-400 border-slate-600"
                      }`}
                    >
                      {slot ? "Horário reservado" : "Em preenchimento"}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-medium text-slate-300" suppressHydrationWarning>{formatLongDate(date)}</p>
                      <h4 className="text-[30px] font-black leading-none mt-1 tabular-nums">{slot || "--:--"}</h4>
                      <p className="text-[10px] font-medium text-slate-400 mt-1">
                        {slot && totalDur ? `Término previsto: ${toTime(toMin(slot) + totalDur)} (${formatDuration(totalDur)})` : "Escolha procedimentos e horário"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 mt-5 pt-4 space-y-2.5 text-[11px]">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Cliente</span>
                      <span className="font-bold text-right truncate">{patient?.name ?? "—"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Especialista</span>
                      <span className="font-bold text-right">{professional?.name ?? "—"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Sala</span>
                      <span className="font-bold text-right">{room}</span>
                    </div>
                    {repeat.every !== "none" && slot && (
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-400">Sessões</span>
                        <span className="font-bold text-right">{freeOccurrences.length}x</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-700 mt-4 pt-4 flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Procedimentos</p>
                    {chosen.length === 0 ? (
                      <p className="text-[11px] text-slate-500">Nenhum selecionado.</p>
                    ) : (
                      <ul className="space-y-2">
                        {chosen.map((p) => (
                          <li key={p.id} className="flex items-start justify-between gap-2 text-[11px]">
                            <span className="text-slate-200 flex-1">{p.name}</span>
                            <span className="font-bold shrink-0">{formatBRL(p.price)}</span>
                            <button onClick={() => toggleProc(p.id)} aria-label={`Remover ${p.name}`} className="text-slate-500 hover:text-rose-400 shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {chosen.length > 0 && (
                    <div className="border-t border-slate-700 mt-4 pt-4 space-y-1.5 text-[11px]">
                      <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="font-bold">{formatBRL(subtotal)}</span></div>
                      {discountValue > 0 && (
                        <div className="flex justify-between"><span className="text-slate-400">Desconto</span><span className="font-bold text-emerald-400">− {formatBRL(discountValue)}</span></div>
                      )}
                      {depositValue > 0 && (
                        <div className="flex justify-between"><span className="text-slate-400">Sinal</span><span className="font-bold">{formatBRL(depositValue)}</span></div>
                      )}
                      <div className="flex justify-between items-baseline pt-1.5">
                        <span className="text-slate-300 font-bold">Total{repeat.every !== "none" && freeOccurrences.length > 1 ? " por sessão" : ""}</span>
                        <span className="text-[18px] font-black">{formatBRL(total)}</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700 mt-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${patient?.allergies.length ? "bg-rose-500/20" : "bg-emerald-500/20"}`}>
                      {patient?.allergies.length ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white leading-tight">
                        {!patient ? "Aguardando cliente" : patient.allergies.length ? "Alergias registradas" : "Sem alergias ativas"}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 truncate">
                        {patient?.allergies.length ? patient.allergies.join(", ") : "Verificação de prontuário"}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            {/* ============ FOOTER ============ */}
            <div className="px-7 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {step > 1 ? (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                ) : (
                  <button onClick={onClose} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                )}
                {!valid[step] && hint && <span className="text-[12px] font-medium text-slate-400 truncate hidden lg:inline">{hint}</span>}
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={saveDraft}
                  disabled={saving || (!patient && selectedIds.length === 0)}
                  className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Salvar rascunho
                </button>
                <button
                  onClick={next}
                  disabled={saving || !valid[step]}
                  className="h-10 px-6 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 4 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  {step === 4 ? (freeOccurrences.length > 1 ? `Confirmar ${freeOccurrences.length} sessões` : quick ? "Confirmar encaixe" : "Confirmar agendamento") : "Continuar"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}