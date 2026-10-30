"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Calendar, Users, Kanban, Activity, Stethoscope, DoorOpen, ListTodo, FileText, Star, BookOpen, Image as ImageIcon, FileSignature, Search, MapPin, Plus, Bell, ChevronDown, ChevronRight, UserCircle, HelpCircle, Briefcase, Settings, Download, Filter, MoreVertical, Network, Tag, Palette, Sparkles, ShieldCheck, TrendingUp, Clock, MessageCircle, CheckCircle2, AlertCircle, ChevronLeft, Edit3, CreditCard, Building2, CheckSquare, Lock, X, Camera, Phone, Mail, AlertTriangle, HeartPulse, Syringe, Loader2, Trash2
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function ClientesPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  
  // ESTADOS DOS MODAIS
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isProntuarioOpen, setIsProntuarioOpen] = useState(false);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [prontuarioTab, setProntuarioTab] = useState("resumo");

  // ESTADOS DE FILTRO E SELEÇÃO
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [checkedPatients, setCheckedPatients] = useState<string[]>([]);

  // ESTADOS DO FORMULÁRIO (NOVO OU EDIÇÃO)
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", cpf: "", birthDate: "", phone: "", email: "", hasWhatsapp: true,
    tags: [] as string[], fototipo: "", skinTendency: "", allergies: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  // TAGS DISPONÍVEIS
  const AVAILABLE_TAGS = [
    "VIP PRIME", "LEAD QUENTE", "BOTOX PREVENTIVO", 
    "HARMONIZAÇÃO", "LASER / FOTONA", "MELASMA", "RETORNO"
  ];

  const FOTOTIPOS = [
    "Fitzpatrick I (Pele muito clara)", "Fitzpatrick II (Pele clara)", 
    "Fitzpatrick III (Pele morena clara)", "Fitzpatrick IV (Pele morena moderada)", 
    "Fitzpatrick V (Pele morena escura)", "Fitzpatrick VI (Pele negra)"
  ];

  // FUNÇÃO PARA ALTERNAR TAGS
  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag) 
        : [...prev.tags, tag]
    }));
  };

  // BUSCAR DADOS DO BANCO (GET)
  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/patients`);
      if (!res.ok) throw new Error("Falha ao carregar o banco de dados.");
      const data = await res.json();
      setPatients(data);
      if (data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].id);
      }
    } catch (error) {
      console.error("Falha ao carregar o banco de dados.", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // ABRIR MODAL PARA NOVO PACIENTE (Limpa os campos)
  const handleOpenNewPatient = () => {
    setEditingPatientId(null);
    setFormData({ name: "", cpf: "", birthDate: "", phone: "", email: "", hasWhatsapp: true, tags: [], fototipo: "", skinTendency: "", allergies: "" });
    setIsNewPatientModalOpen(true);
  };

  // ABRIR MODAL PARA EDIÇÃO (Preenche os campos)
  const handleEditPatient = (e: React.MouseEvent, patient: any) => {
    e.stopPropagation();
    setEditingPatientId(patient.id);
    
    // Formata a data de nascimento para o input type="date"
    let formattedDate = "";
    if (patient.birthDate) {
      const d = new Date(patient.birthDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split('T')[0];
      }
    }

    setFormData({
      name: patient.name || "",
      cpf: patient.cpf || "",
      birthDate: formattedDate,
      phone: patient.phone || "",
      email: patient.email || "",
      hasWhatsapp: patient.hasWhatsapp ?? true,
      tags: patient.tags || [],
      fototipo: patient.fototipo || "",
      skinTendency: patient.skinTendency || "",
      allergies: patient.allergies || "" // Mapeado allergies ou alergias dependendo de como salvou
    });
    setIsNewPatientModalOpen(true);
  };

  // SALVAR PACIENTE (POST OU PATCH)
  const handleSavePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        cpf: formData.cpf.trim(),
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        hasWhatsapp: formData.hasWhatsapp,
        tags: formData.tags,
        fototipo: formData.fototipo,
        skinTendency: formData.skinTendency.trim(),
        allergies: formData.allergies.trim(),
      };

      const url = editingPatientId 
        ? `${API_URL}/patients/${editingPatientId}` 
        : `${API_URL}/patients`;
      
      const method = editingPatientId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erro ao salvar paciente.");
      }

      const savedPatient = await res.json();
      
      if (editingPatientId) {
        setPatients(prev => prev.map(p => p.id === editingPatientId ? { ...p, ...savedPatient } : p));
      } else {
        setPatients(prev => [savedPatient, ...prev]);
        setSelectedPatientId(savedPatient.id ?? savedPatient._id ?? null);
      }

      setIsNewPatientModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar paciente:", error);
      alert("Não foi possível salvar o paciente. Verifique os dados e a conexão com a API.");
    } finally {
      setIsSaving(false);
    }
  };

  // DELETAR PACIENTE
  const handleDeletePatient = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja excluir este paciente permanentemente?")) return;

    try {
      // Usando a rota de batch que estava no seu controller do NestJS
      const res = await fetch(`${API_URL}/patients/batch`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] })
      });

      if (!res.ok) throw new Error("Erro ao excluir");

      setPatients(prev => prev.filter(p => p.id !== id));
      if (selectedPatientId === id) setSelectedPatientId(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Não foi possível excluir o paciente.");
    }
  };

  // FILTRAGEM DINÂMICA
  const filteredPatients = patients.filter(p => {
    if (activeFilter === "Todos") return true;
    if (activeFilter === "VIP Prime") return (p.tags || []).includes("VIP PRIME");
    if (activeFilter === "Ativos Recentes") return p.active === true || (p.tags || []).includes("ATIVO");
    if (activeFilter === "Inativos") return p.active === false || (p.tags || []).includes("INATIVO");
    return true; 
  });

  // SELEÇÃO MÚLTIPLA
  const handleToggleCheck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    setCheckedPatients(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  // EXPORTAR EXCEL
  const handleExportExcel = () => {
    const csvRows = [
      ["ID", "Nome", "CPF", "Telefone", "E-mail", "LTV Total", "Ultima Visita"],
      ...filteredPatients.map(p => [
        p.pacId || p.id,
        p.name,
        p.cpf || "-",
        p.phone || "-",
        p.email || "-",
        p.ltv || "0",
        p.lastVisit || "-"
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Clientes_${activeFilter.replace(" ", "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activePatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      
      {/* ==================== SIDEBAR ==================== */}
      <aside className="w-[260px] min-w-[260px] shrink-0 bg-[#f8fafc] border-r border-slate-200 flex flex-col z-20 h-full">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-6 bg-white">
          <div className="flex items-center gap-3 text-blue-600 font-black text-xl tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="leading-none text-slate-900">HealthSystem</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Clinical Suite</span>
            </div>
          </div>

          <div className="flex items-center justify-between cursor-pointer group">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-blue-600 mb-0.5">Ellevare Estética Avançada</span>
              <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Unidade Av (Matriz)</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 space-y-6 bg-white">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">Visão Geral</span>
            <nav className="space-y-0.5">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
              <SidebarItem icon={Bell} label="Central de Notificações" href="/notificacoes" />
            </nav>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">Operação</span>
            <nav className="space-y-0.5">
              <SidebarItem icon={Calendar} label="Agenda" href="/" />
              <SidebarItem icon={Users} label="Clientes" active href="/pacientes" />
              <SidebarItem icon={Kanban} label="CRM Kanban" href="/crm" />
              <SidebarItem icon={Stethoscope} label="Procedimentos" href="/procedimentos" />
              <SidebarItem icon={DoorOpen} label="Recursos" href="/recursos" />
            </nav>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">Gestão Clínica</span>
            <nav className="space-y-0.5">
              <SidebarItem icon={FileText} label="Prontuários" href="/prontuarios" />
              <SidebarItem icon={Star} label="Avaliações Estéticas" href="/avaliacoes" />
              <SidebarItem icon={BookOpen} label="Protocolos" href="/protocolos" />
              <SidebarItem icon={ImageIcon} label="Fotos Clínicas" href="/fotos" />
              <SidebarItem icon={FileSignature} label="Termos & Documentos" href="/documentos" />
            </nav>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 space-y-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <img src="https://i.pravatar.cc/150?img=5" alt="User" className="w-10 h-10 rounded-full border border-slate-200 shrink-0 object-cover" />
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold text-slate-800 leading-tight truncate">Dra. Joana Oliveira</span>
              <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Diretora Médica & Sócia</span>
            </div>
            <Settings className="w-4 h-4 text-slate-400 ml-auto shrink-0 cursor-pointer hover:text-slate-600" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100/60">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200/50">Plano Enterprise</span>
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
              <span className="text-slate-900 font-bold">Clientes</span>
            </div>
            <div className="h-6 w-px bg-slate-200 shrink-0"></div>
            <div className="relative w-[340px] shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Pesquisar..." className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:border-blue-500 transition-colors shadow-sm" />
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 ml-2 shrink-0">
              <MapPin className="w-4 h-4 text-blue-600" /> Unidade Av Saudade (Matriz)
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <button onClick={() => setIsNewSaleOpen(true)} className="h-10 px-5 rounded-xl font-bold text-[13px] text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Nova Venda
            </button>
            <button onClick={handleOpenNewPatient} className="h-10 px-6 rounded-xl font-bold text-[13px] text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Paciente
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center relative cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200 bg-white shadow-sm">
              <Bell className="w-4 h-4 text-slate-600" />
            </div>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* TOP CONTROLS */}
          <div className="px-8 pt-6 pb-4 shrink-0 bg-white border-b border-slate-200 z-10 shadow-sm relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-[26px] font-black text-slate-900 tracking-tight leading-none mb-2">
                  Gestão de Clientes & Base de Pacientes 360º
                </h1>
                <p className="text-[13px] font-medium text-slate-500">
                  Visão consolidada de relacionamento, segmentação clínica por LTV, histórico de procedimentos e cadastros.
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={handleExportExcel} className="h-9 px-5 rounded-xl font-bold text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm justify-center w-full">
                  <Download className="w-3.5 h-3.5" /> Exportar Relatório
                </button>
                <button className="h-9 px-5 rounded-xl font-bold text-xs text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-2 shadow-sm justify-center w-full">
                  <Network className="w-3.5 h-3.5" /> Segmentação RFV / IA
                </button>
              </div>
            </div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <MetricCard title="TOTAL DE PACIENTES" value={patients.length.toString()} icon={<Users className="w-4 h-4"/>} isPositive />
              <MetricCard title="BASE ATIVA (180D)" value={patients.filter(p => p.active !== false).length} icon={<Activity className="w-4 h-4"/>} />
              <MetricCard title="LTV MÉDIO GERAL" value={`R$ ${Math.round(patients.reduce((sum, p) => sum + (parseFloat(p.ltv?.replace('.','').replace(',','.') || "0")), 0) / Math.max(1, patients.length))}`} icon={<TrendingUp className="w-4 h-4"/>} />
              <MetricCard title="PACIENTES VIP PRIME" value={patients.filter(p => (p.tags||[]).includes("VIP PRIME")).length} icon={<ShieldCheck className="w-4 h-4"/>} isPositive />
              <MetricCard title="CICLO DE RETOQUE" value="67" icon={<Clock className="w-4 h-4"/>} />
            </div>

            {/* FILTERS */}
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                <div className="relative w-64 shrink-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Buscar pacientes..." className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] focus:outline-none focus:border-blue-500 transition-colors shadow-sm" />
                </div>
                <FilterPill label={`Todos (${patients.length})`} active={activeFilter === "Todos"} onClick={() => setActiveFilter("Todos")} />
                <FilterPill label={`VIP Prime (${patients.filter(p => (p.tags||[]).includes("VIP PRIME")).length})`} active={activeFilter === "VIP Prime"} onClick={() => setActiveFilter("VIP Prime")} />
                <FilterPill label="Ativos Recentes" active={activeFilter === "Ativos Recentes"} onClick={() => setActiveFilter("Ativos Recentes")} />
                <FilterPill label="Inativos" active={activeFilter === "Inativos"} onClick={() => setActiveFilter("Inativos")} />
              </div>
            </div>
          </div>

          {/* SPLIT WORKSPACE: LIST + DETAILS */}
          <div className="flex-1 flex min-h-0 bg-[#f8fafc] p-6 gap-6">
            
            {/* LEFT PANE: LISTAGEM VINCULADA AO BANCO DE DADOS */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-w-0 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <h2 className="text-[15px] font-bold text-slate-900">Listagem de Pacientes</h2>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{filteredPatients.length} resultados</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
                  Ordenar por: <span className="text-slate-900 flex items-center gap-1 cursor-pointer">Última Visita <ChevronDown className="w-3.5 h-3.5"/></span>
                </div>
              </div>

              <div className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-4 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                <div className="w-4"></div>
                <div>PACIENTE & CADASTRO</div>
                <div>SEGMENTAÇÃO & TAGS</div>
                <div className="text-right">LTV ACUMULADO</div>
                <div className="pl-4">ÚLTIMA VISITA</div>
                <div className="w-16">AÇÕES</div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {isLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 text-slate-500 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-sm font-bold text-slate-600">Sincronizando Banco de Dados...</span>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <UserCircle className="w-12 h-12 opacity-50" />
                    <span className="text-sm font-bold">Nenhum paciente encontrado.</span>
                  </div>
                ) : (
                  filteredPatients.map((p) => (
                    <div key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-5 border-b border-slate-50 items-center cursor-pointer transition-colors group ${p.id === selectedPatientId ? "bg-blue-50/30" : "hover:bg-slate-50"}`}>
                      <div className="w-4">
                        <input 
                          type="checkbox" 
                          checked={checkedPatients.includes(p.id)} 
                          onChange={() => {}} 
                          onClick={(e) => handleToggleCheck(e, p.id)} 
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer" 
                        />
                      </div>
                      <div className="flex items-center gap-4 min-w-0">
                        <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-bold text-slate-900 leading-tight truncate">{p.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold text-slate-400">{p.pacId || "-"}</span>
                            <span className="text-slate-300 text-[10px]">•</span>
                            <span className="text-[10px] font-medium text-slate-500">{p.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(p.tags || []).map((tag: string, i: number) => (
                          <span key={i} className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${tag === 'ATIVO' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-blue-600 border-blue-200"}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-black text-slate-900 block">R$ {p.ltv || "0,00"}</span>
                        <span className="text-[10px] font-medium text-slate-500 mt-0.5 block">{p.contracts || "0 contratos"}</span>
                      </div>
                      <div className="pl-4">
                        <span className="text-[11px] font-bold text-slate-700 block">{p.lastVisit || "-"}</span>
                        <span className="text-[10px] font-medium text-slate-500 truncate block w-32 mt-0.5">{p.lastProc || "-"}</span>
                      </div>
                      {/* Ações de Hover */}
                      <div className="w-16 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleEditPatient(e, p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit3 className="w-4 h-4"/></button>
                        <button onClick={(e) => handleDeletePatient(e, p.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              <div className="p-5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                <span className="text-[12px] font-medium text-slate-500">Mostrando <span className="font-bold text-slate-700">1 a {filteredPatients.length}</span> de {filteredPatients.length} pacientes</span>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
                    Itens por página: 
                    <select className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none font-bold text-slate-700 shadow-sm">
                      <option>25 por página</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANE: DETALHES DINÂMICOS (Visão 360) */}
            <div className="w-[420px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              {activePatient ? (
                <>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    
                    {/* Header Profiler */}
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex gap-4">
                        <div className="relative">
                          <img src={activePatient.avatar} alt={activePatient.name} className="w-20 h-20 rounded-full border border-slate-200 object-cover shadow-sm" />
                          {(activePatient.tags || []).some((t:string) => t.includes('VIP')) && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white"><Star className="w-3 h-3 fill-current" /></div>
                          )}
                        </div>
                        <div className="pt-1">
                          <h2 className="text-[20px] font-black text-slate-900 flex items-center gap-1.5 leading-tight">{activePatient.name} <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" /></h2>
                          <div className="flex items-center gap-2 mt-2">
                            {(activePatient.tags || []).map((tag: string, i: number) => (
                              <span key={i} className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{tag}</span>
                            ))}
                          </div>
                          <span className="text-[11px] font-bold text-slate-400 block mt-2">{activePatient.pacId} {activePatient.age}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-8">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-bold text-slate-800 flex items-center gap-3"><Phone className="w-4.5 h-4.5 text-slate-400"/> {activePatient.phone}</span>
                        {activePatient.hasWhatsapp && <button className="bg-[#128C7E] text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1.5 shadow-sm hover:bg-[#075E54] transition-colors"><MessageCircle className="w-4 h-4"/> WhatsApp</button>}
                      </div>
                      <div className="flex items-center gap-3 text-[13px] font-medium text-slate-600">
                        <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0"/> {activePatient.email || "Sem e-mail"}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8">
                      <div className="flex justify-between items-center mb-5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Perfil Clínico</span>
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5"/> LGPD OK</span>
                      </div>
                      <div className="grid grid-cols-2 gap-5 border-b border-slate-200/60 pb-5 mb-5">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Fototipo Cutâneo</span>
                          <span className="text-[13px] font-bold text-slate-800 block">{activePatient.fototipo || "-"}</span>
                          <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">{activePatient.skinTendency || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Alergias</span>
                          <span className={`text-[13px] font-bold block ${activePatient.alergias?.includes('Alergia') ? 'text-rose-600' : 'text-emerald-600'}`}>{activePatient.alergias || "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-5 mb-8">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-4">Financeiro</span>
                      <div className="flex justify-between items-end mb-5">
                        <span className="text-[13px] font-medium text-slate-600">LTV Total:</span>
                        <span className="text-[22px] font-black text-slate-900">R$ {activePatient.ltvTotal || "0,00"}</span>
                      </div>
                    </div>

                  </div>

                  {/* Detail Footer Actions */}
                  <div className="p-6 border-t border-slate-100 bg-white shrink-0 space-y-4">
                    <button 
                      onClick={() => setIsProntuarioOpen(true)}
                      className="w-full h-12 bg-[#0B0F19] hover:bg-slate-800 text-white text-[13px] font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                    >
                      <Briefcase className="w-4 h-4" /> Abrir Prontuário Completo
                    </button>
                  </div>
                </>
              ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <UserCircle className="w-12 h-12 opacity-50" />
                    <span className="text-sm font-bold text-slate-500">Selecione um paciente</span>
                 </div>
              )}
            </div>

          </div>

        </div>
      </main>

      {/* ==================== MODAL DE NOVA VENDA ==================== */}
      <AnimatePresence>
        {isNewSaleOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewSaleOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Lançar Nova Venda</h2>
                  <p className="text-[13px] font-medium text-slate-500 mt-0.5">Registre um novo contrato ou procedimento pago.</p>
                </div>
                <button onClick={() => setIsNewSaleOpen(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paciente</label>
                  <input type="text" placeholder="Buscar paciente..." className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Procedimento / Plano</label>
                  <select className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] text-slate-700 focus:outline-none focus:border-blue-500">
                    <option>Selecione...</option>
                    <option>Harmonização Full Face</option>
                    <option>Toxina Botulínica</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Forma de Pagamento</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500">
                      <input type="radio" name="payment" className="text-blue-600 focus:ring-blue-500" />
                      <span className="text-[12px] font-bold text-slate-700">Cartão de Crédito</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500">
                      <input type="radio" name="payment" className="text-blue-600 focus:ring-blue-500" />
                      <span className="text-[12px] font-bold text-slate-700">PIX</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setIsNewSaleOpen(false)} className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md">Confirmar Venda</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MODAL NOVO PACIENTE 360º ==================== */}
      <AnimatePresence>
        {isNewPatientModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isSaving && setIsNewPatientModalOpen(false)} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 30 }} 
              transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
              className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* HEADER LUXUOSO */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <UserCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Cadastro Clínico 360º</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {editingPatientId ? "Editar Paciente" : "Novo Paciente"}
                    </h2>
                  </div>
                </div>
                <button 
                  disabled={isSaving}
                  onClick={() => setIsNewPatientModalOpen(false)} 
                  className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* BODY COM LAYOUT DIVIDIDO */}
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row bg-[#f8fafc]">
                
                {/* COLUNA ESQUERDA: FOTO E CONTATOS */}
                <div className="w-full md:w-[320px] bg-white border-r border-slate-100 p-8 shrink-0 flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center group cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all relative overflow-hidden mb-6 shadow-sm">
                    <Camera className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors z-10 mb-1" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center group-hover:text-blue-600">Adicionar<br/>Foto</span>
                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5"/> Celular <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        type="text" placeholder="(00) 00000-0000" 
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer group bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg">
                        <input type="checkbox" checked={formData.hasWhatsapp} onChange={(e) => setFormData({...formData, hasWhatsapp: e.target.checked})} className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-emerald-300 cursor-pointer" />
                        <span className="text-[11px] font-bold text-emerald-700">Número possui WhatsApp</span>
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5"/> E-mail
                      </label>
                      <input 
                        value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                        type="email" placeholder="paciente@email.com" 
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA: DADOS E PERFIL CLÍNICO */}
                <div className="flex-1 p-8">
                  <form id="newPatientForm" onSubmit={handleSavePatient} className="space-y-8 max-w-2xl">
                    
                    {/* SESSÃO 1: IDENTIDADE */}
                    <div>
                      <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-slate-200 pb-2">
                        <UserCircle className="w-4 h-4 text-blue-600" /> Dados Pessoais
                      </h3>
                      <div className="space-y-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">Nome Completo <span className="text-rose-500">*</span></label>
                          <input 
                            required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                            type="text" placeholder="Ex: Maria Carolina Silva" 
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-[14px] font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5"/> CPF</label>
                            <input 
                              value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                              type="text" placeholder="000.000.000-00" 
                              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Data de Nasc.</label>
                            <input 
                              value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                              type="date" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SESSÃO 2: PERFIL CLÍNICO & SEGMENTAÇÃO */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-600" /> Perfil Clínico & Segmentação
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">Estas informações ajudam a inteligência artificial a personalizar orçamentos.</p>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        {/* Tags Interativas */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Tag className="w-3.5 h-3.5"/> Etiquetas Clínicas (Tags)</label>
                          <div className="flex flex-wrap gap-2">
                            {AVAILABLE_TAGS.map(tag => {
                              const isActive = formData.tags.includes(tag);
                              return (
                                <button
                                  key={tag} type="button" onClick={() => toggleTag(tag)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isActive 
                                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-105" 
                                      : "bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600"
                                  }`}
                                >
                                  {isActive && <CheckCircle2 className="w-3 h-3 inline-block mr-1 -mt-0.5" />}
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Palette className="w-3.5 h-3.5"/> Fototipo Cutâneo</label>
                            <select 
                              value={formData.fototipo} onChange={(e) => setFormData({...formData, fototipo: e.target.value})}
                              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white"
                            >
                              <option value="">Selecione...</option>
                              {FOTOTIPOS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/> Tendência da Pele</label>
                            <input 
                              value={formData.skinTendency} onChange={(e) => setFormData({...formData, skinTendency: e.target.value})}
                              type="text" placeholder="Ex: Oleosa, Melasma, Rosácea..." 
                              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>

                        {/* Alergias Destaque */}
                        <div className="space-y-1.5 bg-rose-50/50 border border-rose-100 p-4 rounded-xl">
                          <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5"/> Alergias ou Restrições Críticas
                          </label>
                          <textarea 
                            value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                            placeholder="Descreva alergias a medicamentos, anestésicos ou componentes..." 
                            className="w-full h-20 p-3 rounded-lg border border-rose-200 bg-white text-[13px] font-medium text-slate-900 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-400/10 resize-none transition-all placeholder:text-rose-300"
                          ></textarea>
                        </div>
                      </div>
                    </div>

                  </form>
                </div>
              </div>

              {/* FOOTER */}
              <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                <button 
                  type="button" disabled={isSaving} onClick={() => setIsNewPatientModalOpen(false)} 
                  className="px-6 py-3 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  form="newPatientForm" type="submit" disabled={isSaving}
                  className="px-8 py-3 rounded-xl text-[14px] font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {isSaving ? "Salvando..." : editingPatientId ? "Salvar Alterações" : "Criar Prontuário Eletrônico"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== DRAWER: PRONTUÁRIO COMPLETO 360º ==================== */}
      <AnimatePresence>
        {isProntuarioOpen && activePatient && (
          <div className="fixed inset-0 z-[1000] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsProntuarioOpen(false)} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" 
            />
            
            <motion.div 
              initial={{ x: "100%", boxShadow: "-20px 0 40px rgba(0,0,0,0)" }} 
              animate={{ x: 0, boxShadow: "-20px 0 40px rgba(0,0,0,0.15)" }} 
              exit={{ x: "100%", boxShadow: "-20px 0 40px rgba(0,0,0,0)" }} 
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="relative w-full max-w-[900px] h-full bg-white z-50 flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img src={activePatient.avatar} alt={activePatient.name} className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 leading-none mb-2">{activePatient.name}</h2>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-500">{activePatient.pacId || "-"}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsProntuarioOpen(false)} className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-8 text-center text-slate-400">
                Conteúdo do Prontuário aqui...
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// --- SUBCOMPONENTS GERAIS ---
function SidebarItem({ icon: Icon, label, active, href}: any) {
  return (
    <a href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
      <Icon className={`w-5 h-5 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
      <span className="truncate">{label}</span>
    </a>
  );
}

function MetricCard({ title, value, icon, trend, trendText, sub, isPositive }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm min-w-0">
      <div className="flex justify-between items-center mb-2 gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 truncate">{title}</span>
        <div className="text-blue-600 bg-blue-50 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">{icon}</div>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-[28px] font-black text-slate-900 leading-none truncate">{value}</span>
        {trend && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'text-slate-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-[11px] font-medium text-slate-500 leading-tight">
        {trendText || sub}
      </p>
    </div>
  );
}

function FilterPill({ label, active, onClick, color, border, dot }: any) {
  const activeClasses = active ? "text-white bg-slate-900 border-slate-900" : "text-slate-600 bg-white border-slate-200 hover:bg-slate-50";
  return (
    <button onClick={onClick} className={`h-10 px-4 text-[13px] font-bold rounded-xl border flex items-center gap-1.5 transition-colors shadow-sm shrink-0 ${activeClasses}`}>
      {dot && <div className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`}></div>}
      {label}
    </button>
  );
}
      