"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Kanban,
  Activity,
  Stethoscope,
  DoorOpen,
  ArrowRight,
  ListTodo,
  FileText,
  Star,
  BookOpen,
  Image as ImageIcon,
  FileSignature,
  Search,
  MapPin,
  Plus,
  Bell,
  ChevronDown,
  ChevronRight,
  UserCircle,
  HelpCircle,
  Briefcase,
  Settings,
  ChevronLeft,
  Lock,
  Zap,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  Syringe,
  Camera,
  MessageCircle,
  X,
  CreditCard,
  Building2,
  ShieldCheck,
  Check,
  Loader2,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import NewAppointmentModal from "./NewAppointmentModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// --- TIPAGEM ---
interface EventData {
  id: string;
  patientName: string;
  procedure: string;
  timeStart: string;
  timeEnd: string;
  value: string;
  doc: string;
  room: string;
  status: "Confirmado" | "Concluído" | "Em Atendimento" | "Aguardando" | "Bloqueado" | string;
  col: number; // 0: Joana
  date?: string; // YYYY-MM-DD
  type?: string; // "BLOCK" para bloqueios
  blockReason?: string;
}

// ================= CONSTANTES E UTILS DA GRADE =================
const GRID_START = 8 * 60; // 08:00
const GRID_END = 19 * 60; // 19:00
const SLOT_MIN = 30; // linhas a cada 30 min
const SLOT_H = 56; // altura (px) de cada linha de 30 min
const PPM = SLOT_H / SLOT_MIN; // pixels por minuto
const TOTAL_SLOTS = (GRID_END - GRID_START) / SLOT_MIN;
const GRID_HEIGHT = TOTAL_SLOTS * SLOT_H;
const SLOT_INDEXES = Array.from({ length: TOTAL_SLOTS }, (_, i) => i);

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
const todayISO = () => toISO(new Date());

// Converte valores monetários em formato brasileiro ou numérico para centavos/unidade corretamente.
const parseCurrencyValue = (input: unknown): number => {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (typeof input !== "string" || !input.trim()) return 0;
  let value = input.replace(/R\$|\s/g, "").replace(/[^\d,.-]/g, "");
  if (!value || value === "-" || value === "." || value === ",") return 0;
  if (value.includes(",")) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if ((value.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(value)) {
    value = value.replace(/\./g, "");
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};
const formatLongDate = (d: Date) =>
  `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
const formatShortDate = (d: Date) =>
  `${WEEKDAYS[d.getDay()].split("-")[0]}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const formatDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}min` : `${h}h`;
};

const timeToPixels = (timeStr: string) => {
  if (!timeStr) return 0;
  return Math.max(0, (toMin(timeStr) - GRID_START) * PPM);
};

const calculateDurationPixels = (start: string, end: string) => {
  if (!start || !end) return SLOT_H;
  return Math.max(28, (toMin(end) - toMin(start)) * PPM);
};

// Distribui eventos sobrepostos em "faixas" lado a lado
function layoutEvents(list: EventData[]) {
  const sorted = [...list].sort(
    (a, b) => toMin(a.timeStart) - toMin(b.timeStart) || toMin(b.timeEnd) - toMin(a.timeEnd)
  );
  const result: Record<string, { lane: number; lanes: number }> = {};
  let cluster: EventData[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];
  const flush = () => {
    cluster.forEach((e) => (result[e.id].lanes = laneEnds.length));
    cluster = [];
    laneEnds = [];
  };
  sorted.forEach((ev) => {
    const s = toMin(ev.timeStart);
    const e = toMin(ev.timeEnd);
    if (cluster.length && s >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else {
      laneEnds[lane] = e;
    }
    result[ev.id] = { lane, lanes: 1 };
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, e);
  });
  flush();
  return result;
}

// ================= PRESETS DOS MODAIS =================
const BLOCK_PRESETS: { label: string; start?: string; end?: string; allDay?: boolean }[] = [
  { label: "Almoço", start: "12:00", end: "13:00" },
  { label: "Reunião" },
  { label: "Intervalo" },
  { label: "Manutenção" },
  { label: "Folga", allDay: true },
];

const inputCls =
  "w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-[13px] font-medium text-slate-900 outline-none transition-all";
const labelCls = "text-[11px] font-bold text-slate-500 uppercase tracking-widest";

export default function AgendaPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBlockTimeOpen, setIsBlockTimeOpen] = useState(false);
  const [isQuickFitOpen, setIsQuickFitOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<EventData | null>(null);
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false);
  const [editAppointmentData, setEditAppointmentData] = useState<EventData | null>(null);

  // Dia selecionado + relógio
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [nowMin, setNowMin] = useState(() => new Date().getHours() * 60 + new Date().getMinutes());
  const scrollRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const dragOffsetRef = useRef(0);

  // Estados da Integração
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<string[]>(["Confirmado", "Em Atendimento", "Aguardando", "Concluído"]);
  const [isSaving, setIsSaving] = useState(false);
  const [blockData, setBlockData] = useState({
    date: todayISO(),
    timeStart: "",
    timeEnd: "",
    reason: "",
    allDay: false,
  });

  // Estado para o Drag & Drop
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

  const selectedISO = toISO(selectedDate);
  const isToday = selectedISO === todayISO();

  // ================= INTEGRAÇÃO API =================
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/appointments`);
      if (!res.ok) throw new Error("Erro ao buscar agenda");
      const data = await res.json();
      setEvents(data.map((a: any) => ({ ...a, col: 0, date: a.date ?? todayISO() }))); // Força col 0 (Dra Joana)
    } catch (error) {
      console.error("API offline, carregando mock");
      const d = todayISO();
      setEvents([
        { id: "1", patientName: "Mariana Prado", procedure: "Full Face Harmonização", timeStart: "08:30", timeEnd: "10:00", value: "R$ 8.500", doc: "Dra. Joana", room: "Sala 01 VIP", status: "Concluído", col: 0, date: d },
        { id: "2", patientName: "Renata Silveira", procedure: "Avaliação 3D + Retoque Botox", timeStart: "10:30", timeEnd: "11:30", value: "", doc: "Dra. Joana", room: "Sala 01 VIP", status: "Concluído", col: 0, date: d },
        { id: "3", patientName: "Patrícia Neves", procedure: "Fios Silhouette Soft", timeStart: "09:00", timeEnd: "10:30", value: "R$ 4.200", doc: "Dra. Joana", room: "Sala 01 VIP", status: "Confirmado", col: 0, date: d },
        { id: "4", patientName: "Luciana Diniz", procedure: "Russian Lips Preenchimento", timeStart: "11:00", timeEnd: "12:00", value: "", doc: "Dra. Joana", room: "Sala 01 VIP", status: "Em Atendimento", col: 0, date: d },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Relógio (linha "agora" da grade)
  useEffect(() => {
    const tick = () => setNowMin(new Date().getHours() * 60 + new Date().getMinutes());
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  // Ao trocar de dia, posiciona o scroll (hoje: perto do horário atual)
  useEffect(() => {
    if (isLoading || !scrollRef.current) return;
    scrollRef.current.scrollTop = isToday ? Math.max(0, (nowMin - GRID_START) * PPM - 160) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedISO, isLoading]);

  // Atalhos: Esc fecha modais | ← → trocam o dia
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
        setIsBlockTimeOpen(false);
        setIsQuickFitOpen(false);
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (isModalOpen || isBlockTimeOpen || isQuickFitOpen) return;
      if (e.key === "ArrowLeft") setSelectedDate((d) => addDays(d, -1));
      if (e.key === "ArrowRight") setSelectedDate((d) => addDays(d, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen, isBlockTimeOpen, isQuickFitOpen]);

  // ================= DERIVADOS DO DIA =================
  const dayEvents = events.filter((e) => e.date === selectedISO);
  const dayAppointments = dayEvents.filter((e) => e.status !== "Bloqueado");
  const filteredEvents = dayEvents.filter((e) => e.status === "Bloqueado" || activeFilters.includes(e.status));
  const filteredAppointmentsCount = filteredEvents.filter((e) => e.status !== "Bloqueado").length;
  const layout = layoutEvents(filteredEvents);

  // ================= AÇÕES DA AGENDA =================
  const openEditAppointment = () => {
    if (!selectedAppointment || selectedAppointment.status === "Bloqueado") return;
    setEditAppointmentData({ ...selectedAppointment });
    setIsEditAppointmentOpen(true);
  };

  const saveAppointmentEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editAppointmentData) return;
    if (!editAppointmentData.patientName.trim() || !editAppointmentData.procedure.trim() || !editAppointmentData.date || !editAppointmentData.timeStart || !editAppointmentData.timeEnd) {
      toast.error("Preencha cliente, procedimento, data e horários.");
      return;
    }
    if (editAppointmentData.timeStart >= editAppointmentData.timeEnd) {
      toast.error("O horário final deve ser posterior ao horário inicial.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/appointments/${editAppointmentData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: editAppointmentData.patientName,
          procedure: editAppointmentData.procedure,
          date: editAppointmentData.date,
          timeStart: editAppointmentData.timeStart,
          timeEnd: editAppointmentData.timeEnd,
          value: editAppointmentData.value,
          doc: editAppointmentData.doc,
          room: editAppointmentData.room,
          status: editAppointmentData.status,
        }),
      });
      if (!res.ok) {
        let message = `Erro ${res.status} ao editar o agendamento.`;
        try { const body = await res.json(); message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message ?? message; } catch {}
        throw new Error(message);
      }
      const updated = { ...editAppointmentData };
      setEvents(prev => prev.map(event => event.id === updated.id ? updated : event));
      setSelectedAppointment(updated);
      setIsEditAppointmentOpen(false);
      toast.success("Agendamento atualizado com sucesso.");
      await fetchAppointments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível editar o agendamento.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAppointment = async () => {
    if (!selectedAppointment || selectedAppointment.status === "Bloqueado") return;
    if (!window.confirm(`Deseja realmente excluir o agendamento de ${selectedAppointment.patientName}?`)) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/appointments/${selectedAppointment.id}`, { method: "DELETE" });
      if (!res.ok) {
        let message = `Erro ${res.status} ao excluir o agendamento.`;
        try { const body = await res.json(); message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message ?? message; } catch {}
        throw new Error(message);
      }
      setEvents(prev => prev.filter(event => event.id !== selectedAppointment.id));
      setSelectedAppointment(null);
      toast.success("Agendamento excluído com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o agendamento.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFilter = (status: string) => {
    setActiveFilters(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  const shiftDay = (n: number) => setSelectedDate((d) => addDays(d, n));
  const goToday = () => setSelectedDate(new Date());

  // Criação genérica (API → fallback local)
  // Retorna true se salvou (API ou fallback local) e false se a API recusou o pedido
  const createEvent = async (ev: EventData, okMsg: string, localMsg: string): Promise<boolean> => {
    setIsSaving(true);
    try {
      let res: Response;
      try {
        res = await fetch(`${API_URL}/appointments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ev),
        });
      } catch {
        // API fora do ar: mantém só na tela
        setEvents((prev) => [...prev, ev]);
        toast?.success(localMsg);
        return true;
      }
      if (!res.ok) {
        let msg = `Erro ${res.status} ao salvar`;
        try {
          const m = (await res.json())?.message;
          msg = Array.isArray(m) ? m.join(", ") : m ?? msg;
        } catch {}
        toast?.error(msg);
        return false;
      }
      await fetchAppointments();
      toast?.success(okMsg);
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  // Chamado pelo modal de Novo Agendamento após salvar
  const handleAppointmentsCreated = async (local: EventData[], refetch: boolean, firstDate: Date) => {
    if (refetch) await fetchAppointments();
    if (local.length) setEvents((prev) => [...prev, ...local]);
    setSelectedDate(firstDate);
  };

  // ---------- BLOQUEAR HORÁRIO ----------
  const openBlockModal = () => {
    setBlockData({ date: selectedISO, timeStart: "", timeEnd: "", reason: "", allDay: false });
    setIsBlockTimeOpen(true);
  };

  const blockStart = blockData.allDay ? toTime(GRID_START) : blockData.timeStart;
  const blockEnd = blockData.allDay ? toTime(GRID_END) : blockData.timeEnd;
  const blockValid = !!blockStart && !!blockEnd && blockStart < blockEnd;
  const blockConflicts = blockValid
    ? events.filter(
        (e) =>
          e.date === blockData.date &&
          e.status !== "Bloqueado" &&
          toMin(e.timeStart) < toMin(blockEnd) &&
          toMin(e.timeEnd) > toMin(blockStart)
      )
    : [];

  const handleSaveBlock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!blockData.date) {
      toast?.error("Escolha a data do bloqueio.");
      return;
    }
    if (!blockStart || !blockEnd || !blockData.reason.trim()) {
      toast?.error("Preencha início, fim e motivo do bloqueio.");
      return;
    }
    if (blockStart >= blockEnd) {
      toast?.error("O horário de término deve ser posterior ao início.");
      return;
    }

    const blockedEvent: EventData = {
      id: `block-${Date.now()}`,
      patientName: "Bloqueado",
      procedure: blockData.reason.trim(),
      timeStart: blockStart,
      timeEnd: blockEnd,
      value: "",
      doc: "Dra. Joana",
      room: "Sala 01 VIP",
      status: "Bloqueado",
      type: "BLOCK",
      blockReason: blockData.reason.trim(),
      col: 0,
      date: blockData.date,
    };

    const savedBlock = await createEvent(blockedEvent, "Horário bloqueado com sucesso!", "Bloqueio salvo localmente.");
    if (!savedBlock) return;
    setSelectedDate(fromISO(blockData.date));
    setBlockData({ date: selectedISO, timeStart: "", timeEnd: "", reason: "", allDay: false });
    setIsBlockTimeOpen(false);
  };

  // ================= DRAG AND DROP =================
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedEventId(id);
    dragOffsetRef.current = e.clientY - e.currentTarget.getBoundingClientRect().top;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedEventId) return;

    const appt = events.find(ev => ev.id === draggedEventId);
    if (!appt) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const rawTop = e.clientY - rect.top - dragOffsetRef.current;

    const durationMins = toMin(appt.timeEnd) - toMin(appt.timeStart);

    // Alinha em blocos de 15 min e mantém dentro da grade
    let startMins = GRID_START + Math.round(rawTop / PPM / 15) * 15;
    startMins = Math.min(Math.max(startMins, GRID_START), GRID_END - durationMins);

    const newStart = toTime(startMins);
    const newEnd = toTime(startMins + durationMins);

    // Atualização Otimista
    setEvents(prev => prev.map(ev => ev.id === draggedEventId ? { ...ev, timeStart: newStart, timeEnd: newEnd } : ev));

    try {
      const res = await fetch(`${API_URL}/appointments/${draggedEventId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timeStart: newStart, timeEnd: newEnd })
      });
      if (!res.ok) {
        let msg = `Erro ${res.status} ao mover o agendamento`;
        try {
          const m = (await res.json())?.message;
          msg = Array.isArray(m) ? m.join(", ") : m ?? msg;
        } catch {}
        toast?.error(msg);
        fetchAppointments(); // volta ao estado real do servidor
      }
    } catch (error) {
      console.error("Erro ao sincronizar drag drop", error);
    }
    setDraggedEventId(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* ==================== SIDEBAR ==================== */}
      <aside className="w-[260px] min-w-[260px] shrink-0 bg-white border-r border-slate-200 flex flex-col z-20 h-full">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-6">
          <div className="flex items-center gap-3 text-blue-600 font-black text-xl tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="leading-none text-slate-900">HealthSystem</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">
                Clinical Suite
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between cursor-pointer group">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-blue-600 mb-0.5">
                Ellevare Estética Avançada
              </span>
              <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                Unidade Av Saudade (Matriz)
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 space-y-6">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">
              Visão Geral
            </span>
            <nav className="space-y-0.5">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
              <SidebarItem icon={Bell} label="Central de Notificações" />
            </nav>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">
              Operação
            </span>
            <nav className="space-y-0.5">
              <SidebarItem icon={Calendar} label="Agenda da Dra. Joana" active />
              <SidebarItem icon={Users} label="Clientes" href="/pacientes" />
              <SidebarItem icon={Kanban} label="CRM Kanban" href="/crm" />
              <SidebarItem icon={Stethoscope} label="Procedimentos" href="/procedimentos" />
              <SidebarItem icon={DoorOpen} label="Recursos" />
              
            </nav>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">
              Gestão Clínica
            </span>
            <nav className="space-y-0.5">
              <SidebarItem icon={FileText} label="Prontuários" href="/prontuarios" />
              <SidebarItem icon={Star} label="Avaliações Estéticas" href="/avaliacoes" />
              <SidebarItem icon={BookOpen} label="Protocolos" href="/protocolos" />
              <SidebarItem icon={ImageIcon} label="Fotos Clínicas" href="/fotos" />
              <SidebarItem icon={FileSignature} label="Termos & Documentos" href="/termos" />
            </nav>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 space-y-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <img
              src="https://i.pravatar.cc/150?img=5"
              alt="User"
              className="w-10 h-10 rounded-full border border-slate-200 shrink-0 object-cover"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold text-slate-800 leading-tight truncate">
                Dra. Joana Oliveira
              </span>
              <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                Diretora Médica & Sócia
              </span>
            </div>
            <Settings className="w-4 h-4 text-slate-400 ml-auto shrink-0 cursor-pointer hover:text-slate-600" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100/60">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
              Plano Enterprise
            </span>
            <button className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-700">
              <HelpCircle className="w-3.5 h-3.5" /> Suporte
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#f8fafc]">
        {/* HEADER GLOBAL */}
        <header className="h-[72px] shrink-0 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500 shrink-0">
              <span>Operação</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-bold">
                Agenda Pessoal
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 shrink-0"></div>
            <div className="relative w-[340px] shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar na agenda..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600 ml-2 shrink-0">
              <MapPin className="w-4 h-4" /> Unidade Av Saudade
              (Matriz)
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center relative cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200 bg-white shadow-sm">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </div>
            <HelpCircle className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-600 ml-1" />
            <img
              src="https://i.pravatar.cc/150?img=5"
              alt="Avatar"
              className="w-10 h-10 rounded-full border border-slate-200 ml-2 cursor-pointer object-cover shadow-sm"
            />
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* TOP CONTROLS */}
          <div className="px-8 pt-6 pb-4 shrink-0 bg-white border-b border-slate-200 z-10 shadow-sm relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-[26px] font-black text-slate-900 tracking-tight leading-none mb-1.5">
                  Agenda Clínica Exclusiva
                </h1>
                <p className="text-[13px] font-medium text-slate-500 uppercase tracking-widest">
                  Gestão de Horários • Dra. Joana Oliveira
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={openBlockModal} className="h-10 px-4 rounded-xl font-bold text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                  <Lock className="w-4 h-4 text-slate-400" /> Bloquear Horário
                </button>
                <button onClick={() => setIsQuickFitOpen(true)} className="h-10 px-4 rounded-xl font-bold text-xs text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-2 shadow-sm">
                  <Zap className="w-4 h-4 text-amber-500" /> Encaixe Rápido
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="h-10 px-6 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm ml-1"
                >
                  <Plus className="w-4 h-4" /> Novo Agendamento
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-inner">
                  <button
                    onClick={goToday}
                    className={`px-4 py-1.5 text-[13px] font-bold rounded-lg transition-colors ${isToday ? "text-slate-900 bg-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => shiftDay(-1)}
                    aria-label="Dia anterior"
                    className="px-3 py-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => shiftDay(1)}
                    aria-label="Próximo dia"
                    className="px-3 py-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => dateInputRef.current?.showPicker?.()}
                    aria-label="Escolher data"
                    className="text-slate-400 hover:text-blue-600 transition-colors relative"
                  >
                    <Calendar className="w-5 h-5" />
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={selectedISO}
                      onChange={(e) => e.target.value && setSelectedDate(fromISO(e.target.value))}
                      className="absolute left-0 top-full w-0 h-0 opacity-0 pointer-events-none"
                      tabIndex={-1}
                    />
                  </button>
                  <h2 className="text-[19px] font-black text-slate-900" suppressHydrationWarning>
                    {formatLongDate(selectedDate)}
                  </h2>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded ml-2" suppressHydrationWarning>
                    {dayAppointments.length} Atendimentos{isToday ? " Hoje" : ""}
                  </span>
                </div>
              </div>

              <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1.5 shrink-0">
                <button className="px-5 py-1.5 text-[13px] font-bold rounded-lg text-slate-500 hover:text-slate-700">
                  Diária
                </button>
                <button className="px-5 py-1.5 text-[13px] font-bold rounded-lg bg-white text-blue-600 shadow-sm flex items-center gap-2">
                  Dra. Joana <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                </button>
                <button className="px-5 py-1.5 text-[13px] font-bold rounded-lg text-slate-500 hover:text-slate-700">
                  Por Sala
                </button>
                <button className="px-5 py-1.5 text-[13px] font-bold rounded-lg text-slate-500 hover:text-slate-700">
                  Lista
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex ml-auto gap-3 shrink-0">
                <FilterPill
                  label={`Confirmados (${dayEvents.filter(e => e.status === "Confirmado").length})`}
                  active={activeFilters.includes("Confirmado")}
                  onClick={() => toggleFilter("Confirmado")}
                  color="text-slate-700 bg-slate-100 border-slate-200"
                />
                <FilterPill
                  label={`Em Atendimento (${dayEvents.filter(e => e.status === "Em Atendimento").length})`}
                  active={activeFilters.includes("Em Atendimento")}
                  onClick={() => toggleFilter("Em Atendimento")}
                  color={activeFilters.includes("Em Atendimento") ? "text-emerald-700 bg-emerald-100 border-emerald-200" : "text-slate-500 bg-white border-slate-200"}
                  dot="bg-emerald-500"
                />
                <FilterPill
                  label={`Aguardando (${dayEvents.filter(e => e.status === "Aguardando").length})`}
                  active={activeFilters.includes("Aguardando")}
                  onClick={() => toggleFilter("Aguardando")}
                  color={activeFilters.includes("Aguardando") ? "text-amber-700 bg-amber-50 border-amber-200" : "text-slate-500 bg-white border-slate-200"}
                  dot="bg-amber-500"
                />
                <FilterPill
                  label={`Concluídos (${dayEvents.filter(e => e.status === "Concluído").length})`}
                  active={activeFilters.includes("Concluído")}
                  onClick={() => toggleFilter("Concluído")}
                  color="text-slate-500 bg-white border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-4">
              
              <AgendaMetric
                title="Confirmados"
                value={dayEvents.filter(e => e.status === "Confirmado").length}
                suffix="pacientes"
                sub="Grade sólida"
                icon={<Calendar className="w-4 h-4" />}
              />
              <AgendaMetric
                title="Em Atendimento"
                value={`0${dayEvents.filter(e => e.status === "Em Atendimento").length}`}
                suffix="em curso"
                sub="Sala 01 VIP"
                icon={
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                }
                bg="bg-emerald-50"
                border="border-emerald-200/60"
                valColor="text-emerald-700"
                titleColor="text-emerald-600/80"
                subColor="text-emerald-600/80"
              />
              <AgendaMetric
                title="Aguardando"
                value={`0${dayEvents.filter(e => e.status === "Aguardando").length}`}
                suffix="no lounge"
                sub="Check-in validado"
                icon={<Clock className="w-4 h-4" />}
              />
              <AgendaMetric
                title="Slots Livres"
                value="05"
                suffix="horários"
                sub="Disponíveis à tarde"
                icon={<CheckCircle2 className="w-4 h-4" />}
              />
              <AgendaMetric
                title="Faturamento Previsto"
                value={`R$ ${dayAppointments.reduce((sum, e) => sum + parseCurrencyValue(e.value), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                sub="Meta diária superada"
                icon={<Briefcase className="w-4 h-4 text-blue-400" />}
                bg="bg-[#0f172a]"
                border="border-[#0f172a]"
                valColor="text-white"
                titleColor="text-slate-400"
                subColor="text-slate-400"
              />
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="flex-1 flex min-h-0 bg-white relative">
            {isLoading ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 z-50 bg-white/80">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="text-sm font-bold text-slate-600">Sincronizando Agenda...</span>
               </div>
            ) : null}

            <div ref={scrollRef} className="flex-1 flex flex-col min-w-0 overflow-auto custom-scrollbar">
              {/* Header Coluna Única */}
              <div className="flex sticky top-0 bg-white z-30 border-b border-slate-200 shadow-sm w-full">
                <div className="w-20 min-w-[80px] shrink-0 border-r border-slate-200 flex items-center justify-center bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    HORA
                  </span>
                </div>
                <ProfColumnHeader
                  name="Dra. Joana Oliveira"
                  role="SUÍTE VIP PREMIUM"
                  room="Sala 01 VIP"
                  pts={`${filteredAppointmentsCount} Atendimentos`}
                  avatar="https://i.pravatar.cc/150?img=5"
                  className="flex-1"
                />
              </div>

              {/* Corpo da Grelha */}
              <div className="flex w-full bg-white">
                {/* Eixo de horas */}
                <div className="w-20 min-w-[80px] shrink-0 border-r border-slate-200 bg-slate-50/60 pt-4 pb-10">
                  <div className="relative" style={{ height: GRID_HEIGHT }}>
                    {SLOT_INDEXES.map((i) => {
                      const mins = GRID_START + i * SLOT_MIN;
                      const isHour = mins % 60 === 0;
                      return (
                        <span
                          key={i}
                          className={`absolute right-3 -translate-y-1/2 leading-none tabular-nums ${isHour ? "text-[12px] font-bold text-slate-600" : "text-[10px] font-medium text-slate-300"}`}
                          style={{ top: i * SLOT_H }}
                        >
                          {toTime(mins)}
                        </span>
                      );
                    })}
                    {isToday && nowMin >= GRID_START && nowMin <= GRID_END && (
                      <span
                        className="absolute right-2 z-10 -translate-y-1/2 bg-rose-500 text-white text-[10px] font-bold rounded px-1.5 py-0.5 leading-none tabular-nums"
                        style={{ top: (nowMin - GRID_START) * PPM }}
                      >
                        {toTime(nowMin)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Área de eventos arrastáveis */}
                <div className="flex-1 min-w-0 pt-4 pb-10">
                  <div
                    className="relative"
                    style={{ height: GRID_HEIGHT }}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {/* Linhas da grade */}
                    {SLOT_INDEXES.map((i) => {
                      const isHour = (GRID_START + i * SLOT_MIN) % 60 === 0;
                      return (
                        <div
                          key={i}
                          className={`absolute inset-x-0 border-t ${isHour ? "border-slate-200" : "border-dashed border-slate-100"}`}
                          style={{ top: i * SLOT_H }}
                        />
                      );
                    })}
                    <div className="absolute inset-x-0 border-t border-slate-200" style={{ top: GRID_HEIGHT }} />

                    {/* Linha de "agora" */}
                    {isToday && nowMin >= GRID_START && nowMin <= GRID_END && (
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none"
                        style={{ top: (nowMin - GRID_START) * PPM }}
                      >
                        <div className="relative border-t-2 border-rose-500">
                          <span className="absolute -left-1 -top-[5px] w-2 h-2 rounded-full bg-rose-500" />
                        </div>
                      </div>
                    )}

                    {/* Estado vazio */}
                    {!isLoading && filteredEvents.length === 0 && (
                      <div className="absolute inset-x-0 top-24 flex flex-col items-center gap-1 text-center pointer-events-none">
                        <span className="text-sm font-bold text-slate-500">Nenhum compromisso neste dia</span>
                        <span className="text-xs font-medium text-slate-400">Use “Novo Agendamento” ou “Encaixe Rápido” para preencher a agenda.</span>
                      </div>
                    )}

                    {filteredEvents.map((event) => {
                      const top = timeToPixels(event.timeStart);
                      const height = calculateDurationPixels(event.timeStart, event.timeEnd);
                      const pos = layout[event.id] ?? { lane: 0, lanes: 1 };
                      const isBlock = event.status === "Bloqueado";
                      return (
                        <div
                          key={event.id}
                          draggable={!isBlock}
                          onDragStart={(e) => handleDragStart(e, event.id)}
                          style={{
                            top: `${top + 1}px`,
                            height: `${height - 2}px`,
                            left: `calc(${(pos.lane * 100) / pos.lanes}% + 8px)`,
                            width: `calc(${100 / pos.lanes}% - 12px)`,
                          }}
                          className="absolute z-10"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedAppointment(event)}
                            onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
                            aria-label={`Ver detalhes de ${event.patientName}`}
                            className={`w-full h-full text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${selectedAppointment?.id === event.id ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                          >
                            <EventCard
                              title={event.patientName}
                              procedure={event.procedure}
                              timeStart={event.timeStart}
                              timeEnd={event.timeEnd}
                              value={event.value}
                              status={event.status}
                              height={height}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* PAINEL LATERAL DE DETALHES DO AGENDAMENTO */}
            <div className="w-[360px] shrink-0 bg-white border-l border-slate-200 flex flex-col z-30 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] overflow-y-auto">
              {selectedAppointment ? (
                <div className="p-6 flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Detalhes do agendamento</p>
                      <h3 className="text-lg font-black text-slate-900 mt-1">{selectedAppointment.patientName}</h3>
                      <span className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLES[selectedAppointment.status]?.badge ?? DEFAULT_STATUS_STYLE.badge}`}>{selectedAppointment.status}</span>
                    </div>
                    <button type="button" onClick={() => setSelectedAppointment(null)} aria-label="Fechar detalhes" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-4">
                    <DetailRow label="Procedimento" value={selectedAppointment.procedure || "Não informado"} />
                    <DetailRow label="Data" value={selectedAppointment.date ? formatLongDate(fromISO(selectedAppointment.date)) : "Não informada"} />
                    <DetailRow label="Horário" value={`${selectedAppointment.timeStart} – ${selectedAppointment.timeEnd}`} />
                    <DetailRow label="Valor previsto" value={selectedAppointment.value || "Não informado"} />
                    <DetailRow label="Profissional" value={selectedAppointment.doc || "Não informada"} />
                    <DetailRow label="Sala" value={selectedAppointment.room || "Não informada"} />
                  </div>
                  {selectedAppointment.status !== "Bloqueado" && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <button type="button" onClick={openEditAppointment} className="h-10 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-700"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                      <button type="button" disabled={isSaving} onClick={deleteAppointment} className="h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-xs font-bold flex items-center justify-center gap-2 hover:bg-rose-100 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Excluir</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 mt-20">
                  <Calendar className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium">Selecione um atendimento para visualizar os detalhes aqui.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ==================== MODAL EDITAR AGENDAMENTO ==================== */}
      <AnimatePresence>
        {isEditAppointmentOpen && editAppointmentData && (
          <ModalShell onClose={() => setIsEditAppointmentOpen(false)} maxWidth="max-w-[520px]">
            <form onSubmit={saveAppointmentEdit} className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Editar agendamento</h2>
                  <p className="text-xs text-slate-500 mt-1">Altere os dados da marcação selecionada.</p>
                </div>
                <button type="button" onClick={() => setIsEditAppointmentOpen(false)} aria-label="Fechar edição" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-1.5"><label className={labelCls}>Cliente</label><input className={inputCls} value={editAppointmentData.patientName} onChange={e => setEditAppointmentData({ ...editAppointmentData, patientName: e.target.value })} required /></div>
              <div className="space-y-1.5"><label className={labelCls}>Procedimento</label><input className={inputCls} value={editAppointmentData.procedure} onChange={e => setEditAppointmentData({ ...editAppointmentData, procedure: e.target.value })} required /></div>
              <div className="space-y-1.5"><label className={labelCls}>Data</label><input className={inputCls} type="date" value={editAppointmentData.date ?? selectedISO} onChange={e => setEditAppointmentData({ ...editAppointmentData, date: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className={labelCls}>Início</label><input className={inputCls} type="time" value={editAppointmentData.timeStart} onChange={e => setEditAppointmentData({ ...editAppointmentData, timeStart: e.target.value })} required /></div>
                <div className="space-y-1.5"><label className={labelCls}>Fim</label><input className={inputCls} type="time" value={editAppointmentData.timeEnd} onChange={e => setEditAppointmentData({ ...editAppointmentData, timeEnd: e.target.value })} required /></div>
              </div>
              <div className="space-y-1.5"><label className={labelCls}>Valor</label><input className={inputCls} value={editAppointmentData.value} onChange={e => setEditAppointmentData({ ...editAppointmentData, value: e.target.value })} placeholder="R$ 0,00" /></div>
              <div className="space-y-1.5"><label className={labelCls}>Status</label><select className={inputCls} value={editAppointmentData.status} onChange={e => setEditAppointmentData({ ...editAppointmentData, status: e.target.value })}><option>Confirmado</option><option>Aguardando</option><option>Em Atendimento</option><option>Concluído</option></select></div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" disabled={isSaving} onClick={() => setIsEditAppointmentOpen(false)} className="h-10 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button type="submit" disabled={isSaving} className="h-10 px-5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar alterações</button>
              </div>
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ==================== MODAL NOVO AGENDAMENTO ==================== */}
      <NewAppointmentModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        events={events}
        nowMin={nowMin}
        onCreated={handleAppointmentsCreated}
      />

      {/* ==================== MODAL BLOQUEAR HORÁRIO ==================== */}
      <AnimatePresence>
        {isBlockTimeOpen && (
          <ModalShell onClose={() => setIsBlockTimeOpen(false)} maxWidth="max-w-[480px]">
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 shadow-sm">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">Bloquear horário</h2>
                  <p className="text-[12px] font-medium text-slate-500 mt-0.5">Dra. Joana Oliveira • Sala 01 VIP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBlockTimeOpen(false)}
                aria-label="Fechar"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="blockTimeForm" onSubmit={handleSaveBlock} className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto custom-scrollbar">
              {/* Motivo rápido */}
              <div className="space-y-2">
                <span className={labelCls}>Motivo</span>
                <div className="flex flex-wrap gap-2">
                  {BLOCK_PRESETS.map((p) => {
                    const active = blockData.reason === p.label;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() =>
                          setBlockData((b) => ({
                            ...b,
                            reason: p.label,
                            allDay: !!p.allDay,
                            ...(p.start ? { timeStart: p.start, timeEnd: p.end! } : {}),
                          }))
                        }
                        className={`h-9 px-3.5 rounded-full text-[12px] font-bold border transition-colors ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={blockData.reason}
                  onChange={(e) => setBlockData({ ...blockData, reason: e.target.value })}
                  type="text"
                  placeholder="Ou descreva o motivo (ex.: consulta médica)"
                  className={inputCls}
                />
              </div>

              {/* Data */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={labelCls}>Data</span>
                  <span className="text-[12px] font-bold text-slate-700" suppressHydrationWarning>
                    {blockData.date ? WEEKDAYS[fromISO(blockData.date).getDay()] : ""}
                  </span>
                </div>
                <input
                  type="date"
                  value={blockData.date}
                  onChange={(e) => setBlockData({ ...blockData, date: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Dia inteiro */}
              <button
                type="button"
                onClick={() => setBlockData((b) => ({ ...b, allDay: !b.allDay }))}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 px-4 py-3 transition-colors text-left"
                aria-pressed={blockData.allDay}
              >
                <div>
                  <p className="text-[13px] font-bold text-slate-900">Dia inteiro</p>
                  <p className="text-[11px] font-medium text-slate-500">Bloqueia toda a grade, das {toTime(GRID_START)} às {toTime(GRID_END)}</p>
                </div>
                <span className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${blockData.allDay ? "bg-slate-900" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${blockData.allDay ? "translate-x-4" : ""}`} />
                </span>
              </button>

              {/* Horários */}
              {!blockData.allDay && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={labelCls}>Início</label>
                      <input value={blockData.timeStart} onChange={(e) => setBlockData({ ...blockData, timeStart: e.target.value })} type="time" step={900} className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelCls}>Fim</label>
                      <input value={blockData.timeEnd} onChange={(e) => setBlockData({ ...blockData, timeEnd: e.target.value })} type="time" step={900} className={inputCls} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-400">Duração rápida</span>
                    {[30, 60, 120].map((d) => (
                      <button
                        key={d}
                        type="button"
                        disabled={!blockData.timeStart}
                        onClick={() => setBlockData((b) => ({ ...b, timeEnd: toTime(Math.min(toMin(b.timeStart) + d, 23 * 60 + 59)) }))}
                        className="h-7 px-2.5 rounded-lg text-[11px] font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {formatDuration(d)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo / alertas */}
              {blockValid ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 truncate" suppressHydrationWarning>
                      {formatShortDate(fromISO(blockData.date))} • {blockStart} – {blockEnd}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      {formatDuration(toMin(blockEnd) - toMin(blockStart))} indisponíveis para novos agendamentos
                    </p>
                  </div>
                </div>
              ) : (
                (blockData.timeStart && blockData.timeEnd && !blockData.allDay) && (
                  <p className="text-[12px] font-bold text-rose-600">O horário de término deve ser posterior ao início.</p>
                )
              )}

              {blockConflicts.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-amber-900">
                      {blockConflicts.length === 1 ? "1 atendimento já está marcado nesse período" : `${blockConflicts.length} atendimentos já estão marcados nesse período`}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {blockConflicts.slice(0, 3).map((c) => (
                        <li key={c.id} className="text-[11px] font-medium text-amber-800 truncate">
                          {c.timeStart} – {c.timeEnd} • {c.patientName}
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] font-medium text-amber-700 mt-1">O bloqueio não cancela esses atendimentos.</p>
                  </div>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-3">
              <button type="button" disabled={isSaving} onClick={() => setIsBlockTimeOpen(false)} className="h-10 px-4 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button form="blockTimeForm" type="submit" disabled={isSaving} className="h-10 px-5 rounded-xl text-[12px] font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm flex items-center gap-2 disabled:opacity-60 transition-colors">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />} Bloquear horário
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ==================== MODAL ENCAIXE RÁPIDO (mesmo fluxo, só clientes cadastrados) ==================== */}
      <NewAppointmentModal
        quick
        open={isQuickFitOpen}
        onClose={() => setIsQuickFitOpen(false)}
        selectedDate={selectedDate}
        events={events}
        nowMin={nowMin}
        onCreated={handleAppointmentsCreated}
      />

    </div>
  );
}

// --- SUBCOMPONENTS GERAIS ---

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 pb-3 last:border-b-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-[13px] font-semibold text-slate-800 mt-1 break-words">{value}</p>
    </div>
  );
}

function ModalShell({ onClose, maxWidth = "max-w-[480px]", children }: any) {
  return (
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
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.18 }}
        className={`relative w-full ${maxWidth} bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]`}
      >
        {children}
      </motion.div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, href }: any) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
    >
      <Icon
        className={`w-5 h-5 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`}
      />
      <span className="truncate">{label}</span>
    </a>
  );
}

function FilterPill({ label, active, color, border, dot, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`h-11 px-4 text-xs font-bold rounded-xl border ${border} ${color} flex items-center gap-2 transition-colors shadow-sm shrink-0 ${active ? 'ring-2 ring-offset-1 ring-current' : ''}`}
    >
      {dot && <div className={`w-2 h-2 rounded-full ${dot} shrink-0`}></div>}
      {label}
    </button>
  );
}

function AgendaMetric({
  title,
  value,
  sub,
  suffix,
  icon,
  bg = "bg-white",
  border = "border-slate-200/60",
  valColor = "text-slate-900",
  titleColor = "text-slate-400",
  subColor = "text-slate-400",
}: any) {
  return (
    <div
      className={`${bg} border ${border} rounded-2xl p-5 flex flex-col justify-between shadow-sm min-w-0 h-[110px]`}
    >
      <div className="flex justify-between items-center mb-1.5 gap-2">
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${titleColor} truncate`}
        >
          {title}
        </span>
        <div className={`text-slate-400 shrink-0`}>{icon}</div>
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span
            className={`text-2xl font-black ${valColor} leading-none truncate`}
          >
            {value}
          </span>
          {suffix && (
            <span className={`text-[10px] font-bold ${titleColor} truncate`}>
              {suffix}
            </span>
          )}
        </div>
        <p className={`text-[11px] font-medium mt-1.5 ${subColor} truncate`}>
          {sub}
        </p>
      </div>
    </div>
  );
}

function ProfColumnHeader({ name, role, room, pts, avatar, className }: any) {
  return (
    <div className={`min-w-[320px] shrink-0 p-4 bg-slate-50/30 flex items-center gap-4 relative ${className}`}>
      <img
        src={avatar}
        className="w-11 h-11 rounded-full border border-slate-200 object-cover shrink-0 shadow-sm"
        alt={name}
      />
      <div className="flex flex-col min-w-0">
        <span className="text-[14px] font-bold text-slate-900 leading-tight truncate">
          {name}
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">
          {role}
        </span>
      </div>
      <div className="ml-auto text-right shrink-0">
        <span className="text-[11px] font-bold text-slate-600 block leading-tight flex items-center gap-1 justify-end">
          <MapPin className="w-3 h-3 shrink-0" />{" "}
          <span className="truncate max-w-[80px]">{room}</span>
        </span>
        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1.5 inline-block border border-blue-100">
          {pts}
        </span>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, { bar: string; badge: string; card: string }> = {
  "Confirmado": { bar: "bg-blue-500", badge: "bg-blue-50 text-blue-600", card: "border-blue-200" },
  "Em Atendimento": { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-600", card: "border-emerald-200 bg-emerald-50/30" },
  "Aguardando": { bar: "bg-amber-500", badge: "bg-amber-50 text-amber-600", card: "border-amber-200" },
  "Concluído": { bar: "bg-slate-300", badge: "bg-slate-100 text-slate-600", card: "border-slate-200" },
};
const DEFAULT_STATUS_STYLE = { bar: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-600", card: "border-indigo-200" };

function EventCard({ title, procedure, timeStart, timeEnd, value, status, height = 96 }: any) {
  const isConcluido = status === "Concluído";
  const isBloqueado = status === "Bloqueado";
  const compact = height < 64;
  const hasValue = value && value !== "-";

  if (isBloqueado) {
    return (
      <div
        className="w-full h-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 px-3 flex items-center gap-2.5 overflow-hidden cursor-not-allowed"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 8px, rgba(148,163,184,0.14) 8px 16px)" }}
      >
        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-slate-600 truncate leading-tight">{procedure || title}</p>
          {!compact && (
            <p className="text-[11px] font-medium text-slate-400 leading-tight mt-0.5">Bloqueado • {timeStart} – {timeEnd}</p>
          )}
        </div>
        {compact && <span className="ml-auto text-[11px] font-bold text-slate-400 shrink-0 tabular-nums">{timeStart} – {timeEnd}</span>}
      </div>
    );
  }

  const s = STATUS_STYLES[status] ?? DEFAULT_STATUS_STYLE;

  return (
    <div
      className={`relative w-full h-full bg-white rounded-xl border flex overflow-hidden shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${s.card} ${isConcluido ? "opacity-70" : ""}`}
    >
      <div className={`w-1 shrink-0 ${s.bar}`}></div>
      {compact ? (
        <div className="flex-1 min-w-0 px-3 flex items-center gap-2">
          <h4 className="font-black text-[12px] text-slate-900 truncate">{title}</h4>
          <span className="text-[11px] font-medium text-slate-500 truncate hidden sm:inline">{procedure}</span>
          <span className="ml-auto text-[11px] font-bold text-slate-400 shrink-0 tabular-nums">{timeStart} – {timeEnd}</span>
        </div>
      ) : (
        <div className="flex-1 min-w-0 px-3.5 py-2.5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-black text-[13px] text-slate-900 leading-tight truncate">{title}</h4>
              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${s.badge}`}>
                {status}
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 leading-tight truncate mt-1">{procedure}</p>
          </div>
          <div className="flex justify-between items-end gap-2">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3" /> {timeStart} – {timeEnd}
            </span>
            {hasValue && (
              <span className="text-[12px] font-black text-slate-900 truncate">{value}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
