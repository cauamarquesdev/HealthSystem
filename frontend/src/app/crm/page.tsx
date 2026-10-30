"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Calendar, Users, Kanban, Activity, Stethoscope, Phone, TrendingUp, DoorOpen, ListTodo, FileText, Star, BookOpen, Image as ImageIcon, FileSignature, Search, MapPin, Plus, Bell, Download, MoreVertical, ChevronDown, UserCircle, HelpCircle, Briefcase, ChevronRight, Settings, AlignLeft, LayoutGrid, Filter as FilterIcon, AlertTriangle, CheckCircle2, Clock, MessageCircle, Mail, CheckCircle, X, Sparkles, Edit3, CalendarDays, Loader2, Trash2
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function CRMKanbanPage() {
  // ================= ESTADOS GERAIS =================
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "lista" | "tabela">("kanban");
  
  // ESTADOS DE MODAIS E DRAWER
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ESTADO DO FORMULÁRIO (NOVO OU EDIÇÃO)
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", phone: "", procedure: "", source: "WhatsApp", val: "", doc: "Dra. Joana Oliveira"
  });

  // ESTADO PARA O DRAG AND DROP
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // COLUNAS DO KANBAN
  const columns = [
    { id: "NOVO", title: "Novo Lead", color: "blue" },
    { id: "CONTATO", title: "Primeiro Contato", color: "indigo" },
    { id: "AVALIACAO", title: "Avaliação Agendada", color: "amber" },
    { id: "NEGOCIACAO", title: "Negociação", color: "purple" },
    { id: "GANHO", title: "Fechado (Ganho)", color: "emerald" },
  ];

  // ================= INTEGRAÇÃO API =================
  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/crm/leads`);
      if (!res.ok) throw new Error("Erro ao buscar leads");
      const data = await res.json();
      setLeads(data);
    } catch (error) {
      console.error("Erro na API", error);
      // Fallback Temporário para o layout não quebrar
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // ================= DRAG AND DROP =================
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => { (e.target as HTMLElement).style.opacity = "0.5"; }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
    setDraggedLeadId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!draggedLeadId) return;

    // Atualização Otimista
    setLeads(prev => prev.map(lead => lead.id === draggedLeadId ? { ...lead, status: newStatus } : lead));

    try {
      await fetch(`${API_URL}/crm/leads/${draggedLeadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (error) {
      console.error("Erro ao mover lead:", error);
      fetchLeads(); // Reverte em caso de erro real
    }
    setDraggedLeadId(null);
  };

  // ================= ACTIONS (CRIAR, EDITAR, EXCLUIR) =================
  const handleOpenNewLead = () => {
    setEditingLeadId(null);
    setFormData({ name: "", phone: "", procedure: "", source: "WhatsApp", val: "", doc: "Dra. Joana Oliveira" });
    setIsNewLeadModalOpen(true);
  };

  const handleEditLead = (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    setEditingLeadId(lead.id);
    setFormData({
      name: lead.name || "", phone: lead.phone || "", procedure: lead.procedure || "",
      source: lead.source || "WhatsApp", val: lead.val || "", doc: lead.doc || "Dra. Joana Oliveira"
    });
    setIsNewLeadModalOpen(true);
  };

  const handleDeleteLead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja excluir este Lead permanentemente?")) return;

    // Atualização Otimista
    setLeads(prev => prev.filter(l => l.id !== id));
    
    try {
      const res = await fetch(`${API_URL}/crm/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir lead");
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...formData };
      const url = editingLeadId ? `${API_URL}/crm/leads/${editingLeadId}` : `${API_URL}/crm/leads`;
      const method = editingLeadId ? "PATCH" : "POST";
      
      if (!editingLeadId) {
        (payload as any).status = "NOVO";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar lead");
      const savedLead = await res.json();
      
      if (editingLeadId) {
        setLeads(prev => prev.map(l => l.id === editingLeadId ? { ...l, ...savedLead } : l));
      } else {
        setLeads(prev => [savedLead, ...prev]);
      }
      setIsNewLeadModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar. Verifique a conexão com o banco de dados.");
    } finally {
      setIsSaving(false);
    }
  };

  // ================= EXPORTAR EXCEL =================
  const handleExportPipeline = () => {
    const csvRows = [
      ["ID", "Nome", "Procedimento", "Origem", "Valor Estimado", "Fase do Funil", "Profissional"],
      ...leads.map(l => [ l.id, l.name, l.procedure, l.source, l.val || "0", l.status, l.doc ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pipeline_CRM_${new Date().toLocaleDateString('pt-BR')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      
      {/* ==================== SIDEBAR ==================== */}
      <aside className="w-[260px] bg-white border-r border-slate-200/60 flex flex-col shrink-0 z-10">
        <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-blue-600 font-black text-xl tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="leading-none">HealthSystem</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Clinical Suite</span>
            </div>
          </div>
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex flex-col gap-1 cursor-pointer hover:bg-blue-50 transition-colors">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Ellevare Estética Avançada</span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-blue-900">Unidade Av Saudade (Matriz)</span>
              <ChevronDown className="w-4 h-4 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
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
              <SidebarItem icon={Users} label="Clientes" href="/pacientes" />
              <SidebarItem icon={Kanban} label="CRM Kanban" active href="/crm" />
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

        <div className="p-4 border-t border-slate-200/60 bg-white space-y-3">
          <div className="flex items-center gap-3 px-2">
            <img src="https://i.pravatar.cc/150?img=5" alt="User" className="w-9 h-9 rounded-full border border-slate-200" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 leading-tight">Dra. Joana Oliveira</span>
              <span className="text-[10px] font-medium text-slate-500">Diretora Médica & Sócia</span>
            </div>
            <Settings className="w-4 h-4 text-slate-400 ml-auto cursor-pointer hover:text-slate-600" />
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-0">
        
        {/* HEADER DE TOPO PADRÃO */}
        <header className="h-[72px] bg-white border-b border-slate-200/60 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6 flex-1">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
              <span>Operação</span><ChevronRight className="w-3.5 h-3.5" /><span className="text-slate-800">CRM Kanban Comercial</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-9 px-4 rounded-xl font-bold text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-2"><Plus className="w-4 h-4" /> Nova Venda</button>
            <button className="h-9 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2"><Plus className="w-4 h-4" /> Novo Agendamento</button>
          </div>
        </header>

        {/* CRM CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
          
          {/* CRM HEADER & FILTERS */}
          <div className="px-8 pt-6 pb-2 shrink-0">
            <div className="flex justify-between items-end mb-5">
              <div>
                <h1 className="text-[1.6rem] font-black text-slate-900 tracking-tight leading-none mb-2">
                  CRM Kanban & Pipeline de Procedimentos
                </h1>
                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                  Sync em tempo real com banco de dados
                </div>
                <p className="text-[13px] font-medium text-slate-500 mt-2 max-w-2xl">
                  Acompanhamento da jornada de vendas, conversão de procedimentos premium e ciclo de relacionamento estético.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleExportPipeline} className="h-10 px-5 rounded-xl font-bold text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                  <Download className="w-4 h-4" /> Exportar Pipeline
                </button>
                <button onClick={handleOpenNewLead} className="h-10 px-5 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm">
                  <UserCircle className="w-4 h-4" /> <Plus className="w-3 h-3 -ml-1.5" /> Novo Lead
                </button>
              </div>
            </div>

            {/* BARRA DE FILTROS & VIEW MODE */}
            <div className="flex items-center gap-3 mt-6">
              <div className="relative w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Buscar lead por nome, telefone, proc..." className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] font-medium focus:outline-none focus:border-blue-500 transition-colors shadow-sm" />
              </div>

              <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm ml-auto">
                <button onClick={() => setViewMode("kanban")} className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 ${viewMode === "kanban" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                  <LayoutGrid className="w-3.5 h-3.5" /> Kanban
                </button>
                <button onClick={() => setViewMode("lista")} className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 ${viewMode === "lista" || viewMode === "tabela" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                  <AlignLeft className="w-3.5 h-3.5" /> Lista
                </button>
                <button className="px-4 py-1.5 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-700 flex items-center gap-2 border-l border-slate-200 ml-1 pl-3">
                  <FilterIcon className="w-3.5 h-3.5" /> Funil Analítico
                </button>
              </div>
            </div>

            {/* GRID DE MÉTRICAS */}
            <div className="grid grid-cols-5 gap-4 mt-6 mb-2">
              <MetricCard title="Pipeline Total Ativo" value={leads.length} icon={<TrendingUp className="w-4 h-4 text-blue-600" />} trend="+14.2%" trendSub={`${leads.length} leads em curso`} isPositive color="blue" />
              <MetricCard title="Ticket Médio Potencial" value={`R$ ${Math.round(leads.reduce((sum, lead) => sum + parseFloat(lead.val?.replace('R$ ','').replace('.','').replace(',','.') || "0"), 0) / Math.max(1, leads.length))}`} icon={<Activity className="w-4 h-4 text-blue-600" />} subtitle="• Full Face & Tecnolo..." meta="Meta: R$ 4.800" trend="+7.8% superávit" isPositive color="emerald" />
              <MetricCard title="Taxa de Conversão" value={`${Math.round((leads.filter(lead => lead.status === 'GANHO').length / Math.max(1, leads.length)) * 100)}%`} icon={<CheckCircle2 className="w-4 h-4 text-blue-600" />} trend="+3.1pp" trendSub="Acima do set..." isPositive color="emerald" />
              <MetricCard title="Sem Contato > 48h" value={leads.filter(lead => lead.status === 'SEM CONTATO').length} icon={<AlertTriangle className="w-4 h-4 text-rose-500" />} isAlert alertText="• Ação imediata requ..." linkText="Filtrar atrasados →" color="rose" />
              <MetricCard title="Vendas Fechadas Mês" value={`R$ ${Math.round(leads.filter(lead => lead.status === 'GANHO').reduce((sum, lead) => sum + parseFloat(lead.val?.replace('R$ ','').replace('.','').replace(',','.') || "0"), 0))}`} icon={<CheckCircle className="w-4 h-4 text-emerald-500" />} meta="Meta: R$ 130k" progress="86.4%" color="emerald" />
            </div>
          </div>

          {/* ÁREA DE VISUALIZAÇÃO */}
          {isLoading ? (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-sm font-bold text-slate-600">Sincronizando Leads...</span>
             </div>
          ) : viewMode === "kanban" ? (
            
            /* KANBAN BOARD */
            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar px-8 pb-8 pt-4">
              <div className="flex gap-4 h-full items-start">
                {columns.map(col => {
                  const columnLeads = leads.filter(l => l.status === col.id);
                  const columnTotal = columnLeads.reduce((acc, l) => {
                    const num = parseFloat(l.val?.replace('R$ ','').replace('.','').replace(',','.') || "0");
                    return acc + num;
                  }, 0);

                  return (
                    <KanbanColumn
                      key={col.id} title={col.title} count={columnLeads.length} total={`R$ ${columnTotal.toLocaleString('pt-BR')}`} color={col.color}
                      onDragOver={handleDragOver} onDrop={(e: any) => handleDrop(e, col.id)}
                    >
                      {columnLeads.map((lead) => (
                        <div key={lead.id} draggable onDragStart={(e) => handleDragStart(e, lead.id)} onDragEnd={handleDragEnd}>
                          <KanbanCard 
                            lead={lead} 
                            onClick={() => setSelectedLead(lead)} 
                            onEdit={(e: React.MouseEvent) => handleEditLead(e, lead)}
                            onDelete={(e: React.MouseEvent) => handleDeleteLead(e, lead.id)}
                          />
                        </div>
                      ))}
                      {columnLeads.length === 0 && (
                        <div className="bg-white/40 border border-slate-200/50 border-dashed rounded-xl h-24 flex items-center justify-center text-xs font-bold text-slate-400">
                          Arraste leads para cá
                        </div>
                      )}
                    </KanbanColumn>
                  );
                })}
              </div>
            </div>

          ) : (

            /* VISÃO EM LISTA */
            <div className="flex-1 overflow-y-auto px-8 pb-8 pt-4">
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="p-4 pl-6">Nome do Lead</th>
                        <th className="p-4">Fase (Status)</th>
                        <th className="p-4">Procedimento Interesse</th>
                        <th className="p-4">Origem</th>
                        <th className="p-4 text-right pr-6">Valor Estimado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map(lead => (
                        <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group relative">
                          <td className="p-4 pl-6 font-bold text-[13px] text-slate-900">{lead.name}</td>
                          <td className="p-4">
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase tracking-wider">{lead.status}</span>
                          </td>
                          <td className="p-4 text-[12px] font-medium text-slate-500">{lead.procedure}</td>
                          <td className="p-4">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{lead.source}</span>
                          </td>
                          <td className="p-4 text-right pr-6 font-black text-[14px] text-slate-900 relative">
                            <span className="group-hover:opacity-0 transition-opacity">{lead.val}</span>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => handleEditLead(e, lead)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors shadow-sm bg-white border border-slate-200"><Edit3 className="w-4 h-4"/></button>
                              <button onClick={(e) => handleDeleteLead(e, lead.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shadow-sm bg-white border border-slate-200"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

        </div>

        {/* ==================== MODAL DE NOVO LEAD / EDITAR ==================== */}
        <AnimatePresence>
          {isNewLeadModalOpen && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSaving && setIsNewLeadModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer" />
              
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <UserCircle className="w-5 h-5 text-blue-600"/> 
                      {editingLeadId ? "Editar Lead" : "Cadastrar Novo Lead"}
                    </h2>
                    <p className="text-[13px] font-medium text-slate-500 mt-0.5">
                      {editingLeadId ? "Atualize as informações desta oportunidade." : "O lead entrará automaticamente na coluna 'Novo Lead'."}
                    </p>
                  </div>
                  <button onClick={() => !isSaving && setIsNewLeadModalOpen(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50"><X className="w-5 h-5" /></button>
                </div>
                
                <form id="newLeadForm" onSubmit={handleSaveLead} className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome do Prospecto *</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" placeholder="Ex: Ana Carolina" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">WhatsApp *</label>
                      <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="text" placeholder="(00) 00000-0000" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor Estimado</label>
                      <input value={formData.val} onChange={e => setFormData({...formData, val: e.target.value})} type="text" placeholder="R$ 0,00" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] font-black focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Procedimento de Interesse</label>
                    <input value={formData.procedure} onChange={e => setFormData({...formData, procedure: e.target.value})} type="text" placeholder="Ex: Toxina Preventiva" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[13px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Origem do Lead</label>
                      <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-bold text-slate-700 focus:outline-none focus:border-blue-500">
                        <option>WhatsApp</option>
                        <option>Instagram Ads</option>
                        <option>Google Search</option>
                        <option>Indicação</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Responsável</label>
                      <select value={formData.doc} onChange={e => setFormData({...formData, doc: e.target.value})} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-bold text-slate-700 focus:outline-none focus:border-blue-500">
                        <option>Dra. Joana Oliveira</option>
                        <option>Dra. Camila Santos</option>
                      </select>
                    </div>
                  </div>
                </form>

                <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button type="button" disabled={isSaving} onClick={() => setIsNewLeadModalOpen(false)} className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
                  <button form="newLeadForm" type="submit" disabled={isSaving} className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md flex items-center gap-2 disabled:opacity-50">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4"/>} {editingLeadId ? "Salvar Alterações" : "Salvar Lead"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================== DRAWER LATERAL (DETALHES DO LEAD) ==================== */}
        <AnimatePresence>
          {selectedLead && (
            <>
              {/* Overlay Escuro */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedLead(null)}
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 cursor-pointer"
              />

              {/* Painel Drawer */}
              <motion.div
                initial={{ x: "100%", boxShadow: "-20px 0 40px rgba(0,0,0,0)" }}
                animate={{ x: 0, boxShadow: "-20px 0 40px rgba(0,0,0,0.1)" }}
                exit={{ x: "100%", boxShadow: "-20px 0 40px rgba(0,0,0,0)" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute right-0 top-0 w-full max-w-[480px] h-full bg-white z-50 flex flex-col shadow-2xl border-l border-slate-200"
              >
                {/* Header do Drawer */}
                <div className="p-6 border-b border-slate-100 flex items-start justify-between shrink-0 bg-slate-50/50">
                  <div className="flex gap-4">
                    <img
                      src={selectedLead.docAvatar || "https://i.pravatar.cc/150?img=5"}
                      alt={selectedLead.name}
                      className="w-14 h-14 rounded-full border border-slate-200 object-cover shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-black text-slate-900 leading-none">
                          {selectedLead.name}
                        </h2>
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-widest border border-rose-100">
                          {selectedLead.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-bold text-slate-700">
                          Score IA:{" "}
                          <span className="text-blue-600">92% Conversão</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-medium text-slate-500">
                          Prioridade Alta
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedLead(null)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                  {/* Cards de Valores */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        Valor da Oportunidade
                      </span>
                      <span className="text-xl font-black text-slate-900 block leading-tight">
                        {selectedLead.val || "R$ 0,00"}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        Orçamento #ORC-8821
                      </span>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-4">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                        Responsável Clínico
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <img
                          src="https://i.pravatar.cc/150?img=5"
                          className="w-6 h-6 rounded-full"
                          alt=""
                        />
                        <span className="text-sm font-bold text-blue-900 leading-tight">
                          {selectedLead.doc}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-blue-600/70 block mt-1">
                        Unidade Av Saudade (Matriz)
                      </span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-6 border-b border-slate-200">
                    <button className="pb-3 text-xs font-bold border-b-2 border-blue-600 text-blue-600">
                      Visão Geral
                    </button>
                    <button className="pb-3 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-colors">
                      Timeline
                    </button>
                    <button className="pb-3 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
                      Orçamento{" "}
                      <span className="bg-slate-100 text-slate-500 px-1.5 rounded-md text-[9px]">
                        1
                      </span>
                    </button>
                    <button className="pb-3 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
                      Tarefas{" "}
                      <span className="bg-rose-100 text-rose-600 px-1.5 rounded-md text-[9px]">
                        2
                      </span>
                    </button>
                  </div>

                  {/* Contato & Origem */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Contato & Origem
                      </h3>
                      <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700">
                        Editar
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5" /> WhatsApp
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {selectedLead.phone || "(11) 98124-7741"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" /> E-mail
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {selectedLead.email || "c.silveira@holding.com.br"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-2">
                          <LayoutGrid className="w-3.5 h-3.5" /> Campanha
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                          {selectedLead.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Procedimentos no Orçamento */}
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Procedimentos no Orçamento
                    </h3>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-sm text-blue-900 leading-tight">
                          {selectedLead.procedure}
                        </h4>
                        <span className="font-black text-sm text-blue-900">
                          {selectedLead.val}
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        <li className="text-[11px] font-medium text-blue-800/80 flex items-start gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>{" "}
                          2x Seringas Radiesse Duo (Estímulo de colágeno)
                        </li>
                        <li className="text-[11px] font-medium text-blue-800/80 flex items-start gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>{" "}
                          1x Toxina Botulínica Allergan
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Próxima Tarefa Crítica */}
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-xs text-rose-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Próxima Tarefa Crítica
                      </h4>
                      <span className="text-[10px] font-bold text-rose-600 bg-white px-2 py-0.5 rounded shadow-sm">
                        Vence hoje às 17:00
                      </span>
                    </div>
                    <p className="text-xs font-medium text-rose-700/90 leading-relaxed">
                      Ligar para fechar condições especiais: parcelamento em 10x
                      sem juros ou desconto de 7% à vista no Pix.
                    </p>
                  </div>

                  {/* Jornada Comercial do Lead */}
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                      Jornada Comercial do Lead
                    </h3>
                    <div className="relative pl-3 space-y-5 before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
                      <div className="relative flex items-start gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white z-10 mt-1 shrink-0"></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <h4 className="text-xs font-bold text-slate-900">
                              Orçamento Visualizado (3ª vez)
                            </h4>
                            <span className="text-[9px] font-bold text-slate-400">
                              Hoje às 11:20
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                            {selectedLead.name} abriu o link do orçamento interativo pela terceira vez no smartphone.
                          </p>
                        </div>
                      </div>

                      <div className="relative flex items-start gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200 ring-4 ring-white z-10 mt-1 shrink-0"></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <h4 className="text-xs font-bold text-slate-900">
                              Avaliação Facial 3D Realizada
                            </h4>
                            <span className="text-[9px] font-bold text-slate-400">
                              Ontem às 15:40
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                            Consulta presencial com {selectedLead.doc}. Simulação 3D aprovada pela paciente.
                          </p>
                        </div>
                      </div>

                      <div className="relative flex items-start gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200 ring-4 ring-white z-10 mt-1 shrink-0"></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <h4 className="text-xs font-bold text-slate-900">
                              Primeiro Contato {selectedLead.source}
                            </h4>
                            <span className="text-[9px] font-bold text-slate-400">
                              21/10 às 09:15
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                            Lead capturado via {selectedLead.source}. Atendido pela equipe comercial.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer do Drawer (Botões de Ação) */}
                <div className="p-6 border-t border-slate-100 bg-white shrink-0 space-y-3">
                  <div className="flex gap-3">
                    <button className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Converter Venda
                    </button>
                    <button className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                      <MessageCircle className="w-4 h-4" /> Disparar WhatsApp
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5" /> Agendar
                      Procedimento
                    </button>
                    <button className="flex-1 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2">
                      <Edit3 className="w-3.5 h-3.5" /> Editar Orçamento
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function SidebarItem({ icon: Icon, label, active, href }: any) {
  return (
    <a href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
      <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-slate-400"}`} /> {label}
    </a>
  );
}

function MetricCard({ title, value, icon, subtitle, meta, trend, trendSub, isPositive, isAlert, alertText, linkText, progress, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
          <div className={`w-6 h-6 rounded-md flex items-center justify-center bg-${color}-50`}>{icon}</div>
        </div>
        <div className="flex items-end gap-2">
          <span className={`text-2xl font-black ${isAlert ? "text-rose-600" : "text-slate-900"}`}>{value}</span>
        </div>
        {subtitle && <p className="text-[10px] font-medium text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100">
        {trend && (
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isPositive ? "text-emerald-600 bg-emerald-50" : "text-blue-600 bg-blue-50"}`}>{trend}</span>
            <span className="text-[10px] font-bold text-slate-400 truncate">{trendSub}</span>
          </div>
        )}
        {meta && !progress && (
          <div className="flex justify-between items-center text-[10px] font-bold"><span className="text-slate-400">{meta}</span>{trend && <span className="text-emerald-500">{trend}</span>}</div>
        )}
        {isAlert && (
          <div className="flex flex-col gap-1 text-[10px] font-bold"><span className="text-rose-500">{alertText}</span><span className="text-blue-600 cursor-pointer hover:underline">{linkText}</span></div>
        )}
        {progress && (
          <div>
            <div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-slate-400">{meta}</span><span className="text-slate-900">{progress}</span></div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full rounded-full" style={{ width: progress }}></div></div>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ title, count, total, color, children, onDragOver, onDrop }: any) {
  const getDotColor = () => {
    switch (color) {
      case "blue": return "bg-blue-500";
      case "indigo": return "bg-indigo-400";
      case "amber": return "bg-amber-400";
      case "purple": return "bg-purple-400";
      case "emerald": return "bg-emerald-400";
      default: return "bg-slate-400";
    }
  };

  return (
    <div onDragOver={onDragOver} onDrop={onDrop} className="w-[300px] shrink-0 flex flex-col bg-slate-100/50 rounded-2xl p-3 border border-slate-200/50 h-full transition-colors hover:bg-slate-100">
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getDotColor()}`}></div>
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
          <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded shadow-sm">{count}</span>
        </div>
        <span className="text-xs font-bold text-slate-400">{total}</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-2 min-h-[100px]">
        {children}
      </div>
    </div>
  );
}

function KanbanCard({ lead, onClick, onEdit, onDelete }: any) {
  return (
    <div onClick={onClick} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-slate-300 transition-all group relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      {/* BOTÕES AÇÕES HOVER */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={onEdit} className="p-1.5 bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-md text-slate-400 hover:text-blue-600 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-md text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      <div className="flex justify-between items-start mb-3 pr-12">
        <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-100 flex items-center gap-1">{lead.source}</span>
        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {lead.time || "Recente"}</span>
      </div>
      <h4 className="font-black text-sm text-slate-900 leading-tight mb-1 pr-6">{lead.name}</h4>
      <p className="text-xs font-medium text-slate-500 truncate mb-4">{lead.procedure}</p>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {lead.docAvatar ? (
            <img src={lead.docAvatar} alt={lead.doc} className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-bold text-white">{lead.initials || "DR"}</div>
          )}
          <span className="text-[10px] font-bold text-slate-600">{lead.doc}</span>
        </div>
        <span className="text-xs font-black text-slate-900">{lead.val}</span>
      </div>
    </div>
  );
}
