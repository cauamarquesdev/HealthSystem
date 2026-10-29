"use client";

import React, { useState, useRef } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Kanban,
  Activity,
  Stethoscope,
  DoorOpen,
  ListTodo,
  FileText,
  Star,
  BookOpen,
  Image as ImageIcon,
  FileSignature,
  Search,
  MapPin,
  Bell,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Briefcase,
  Settings,
  X,
  User,
  Camera,
  LogOut,
  Loader2,
  RefreshCw,
  Plus
} from "lucide-react";
import Link from "next/link";


export function AppShell({
  active,
  breadcrumb,
  search,
  children,
}: {
  active: "prontuarios" | "procedimentos" | "agenda";
  breadcrumb: string;
  search?: { value: string; onChange: (v: string) => void; placeholder: string; inputRef?: React.RefObject<HTMLInputElement> };
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatar, setAvatar] = useState("https://i.pravatar.cc/150?img=5");

  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTriggerClick = () => setIsOpen(!isOpen);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setAvatar(objectUrl);
    setIsOpen(false);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Upload concluído com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload da imagem", error);
      setAvatar("https://i.pravatar.cc/150?img=5");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      <aside className="w-[260px] min-w-[260px] shrink-0 bg-white border-r border-slate-200 flex flex-col z-20 h-full">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-6">
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
              <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Unidade Av Saudade (Matriz)</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 space-y-6">
          <Group title="Visão Geral">
            <Item icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
            <Item icon={Bell} label="Central de Notificações" href="/notificacoes" />
          </Group>
          <Group title="Operação">
            <Item icon={Calendar} label="Agenda da Dra. Joana" href="/" active={active === "agenda"} />
            <Item icon={Users} label="Clientes" href="/pacientes" />
            <Item icon={Kanban} label="CRM Kanban" href="/crm" />
            <Item icon={Stethoscope} label="Procedimentos" href="/procedimentos" active={active === "procedimentos"} />
            <Item icon={DoorOpen} label="Recursos" href="/recursos" />

          </Group>
          <Group title="Gestão Clínica">
            <Item icon={FileText} label="Prontuários" href="/prontuarios" active={active === "prontuarios"} />
            <Item icon={Star} label="Avaliações Estéticas" href="/avaliacoes" />
            <Item icon={BookOpen} label="Protocolos" href="/protocolos" />
            <Item icon={ImageIcon} label="Fotos Clínicas" href="/fotos" />
            <Item icon={FileSignature} label="Termos & Documentos" href="/documentos" />
          </Group>
          
        </div>

        <div className="p-5 border-t border-slate-100 space-y-4 shrink-0 bg-white" ref={menuRef}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
            />
            {isOpen && (
                <div className="absolute bottom-24 left-4 mb-4 w-[228px] rounded-xl border border-gray-100 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 z-50">
                    <div className="px-3 py-2 pb-3 mb-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">Dra. Joana Oliveira</p>
                        <p className="text-xs text-gray-500">Diretora Médica & Sócia</p>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
                            <User size={16} />
                            Meu Perfil
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                        >
                            <Camera size={16} />
                            Alterar Foto
                        </button>
                        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
                            <Settings size={16} />
                            Configurações
                        </button>
                    </div>
                    <div className="mt-2 border-t border-gray-100 pt-2">
                        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
                            <LogOut size={16} />
                            Sair do sistema
                        </button>
                    </div>
                </div>
            )}
            <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 overflow-hidden rounded-full border border-slate-200 shrink-0 bg-gray-100">
                    {isUploading ? (
                        <div className="flex h-full w-full items-center justify-center bg-black/40">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                    ) : (
                        <img src={avatar} alt="User" className="w-full h-full object-cover" />
                    )}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-slate-800 leading-tight truncate">Dra. Joana Oliveira</span>
                    <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Diretora Médica & Sócia</span>
                </div>
                <Settings 
                    onClick={handleTriggerClick}
                    className={`w-4 h-4 text-slate-400 ml-auto shrink-0 cursor-pointer hover:text-slate-600 transition-transform duration-300 ${isOpen ? 'text-gray-700 rotate-90' : ''}`} 
                />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100/60">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Plano Enterprise</span>
                <button className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-700">
                    <HelpCircle className="w-3.5 h-3.5" /> Suporte
                </button>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#f8fafc]">
        <header className="flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-6">
            <div className="flex items-center space-x-2 text-sm">
                <span className="font-medium text-gray-500">Financeiro</span>
                <span className="text-gray-400">/</span>
                <span className="font-bold text-gray-900">{breadcrumb}</span>
            </div>
            <div className="flex items-center space-x-3">
                <button
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    title="Atualizar dados"
                >
                    <RefreshCw size={16} strokeWidth={2.5} />
                </button>
                <button
                    className="flex h-9 items-center gap-1.5 rounded-md bg-[#1e293b] px-3.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                    <Plus size={16} strokeWidth={2.5} />
                    Novo
                    <ChevronDown size={16} strokeWidth={2.5} className="ml-1 opacity-70" />
                </button>
            </div>
        </header>
        <div className="flex-1 min-h-0 flex">{children}</div>
      </main>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">{title}</span>
      <nav className="space-y-0.5">{children}</nav>
    </div>
  );
}

function Item({ icon: Icon, label, active, href }: any) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
      <span className="truncate">{label}</span>
    </a>
  );
}