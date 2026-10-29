"use client";

import React, { useState, useRef } from "react";
import { Settings, User, Camera, LogOut, Loader2 } from "lucide-react";
import Image from "next/image";

interface UserProfileProps {
  user: {
    name: string;
    role: string;
    avatarUrl?: string;
  };
}

export function UserProfile({ user }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatar, setAvatar] = useState(user.avatarUrl || "/default-avatar.png");
  
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fecha o menu se clicar fora (opcional, pode usar um hook customizado useOnClickOutside)
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

    // 1. Feedback visual imediato (Preview local)
    const objectUrl = URL.createObjectURL(file);
    setAvatar(objectUrl);
    setIsOpen(false);
    setIsUploading(true);

    try {
      // 2. Prepara o FormData para enviar ao backend
      const formData = new FormData();
      formData.append("file", file);

      // Exemplo de chamada para sua API:
      // await fetch('/api/user/avatar', { method: 'POST', body: formData });
      
      // Simulando tempo de rede...
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      console.log("Upload concluído com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload da imagem", error);
      // Reverter para a imagem antiga em caso de erro
      setAvatar(user.avatarUrl || "/default-avatar.png");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Input de arquivo invisível */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-4 w-64 rounded-xl border border-gray-100 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 z-50">
          <div className="px-3 py-2 pb-3 mb-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>

          <div className="flex flex-col space-y-1">
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
              <User size={16} />
              Meu Perfil
            </button>
            
            {/* Botão que aciona o input de arquivo */}
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

      {/* TRIGGER (Área do usuário na Sidebar) */}
      <div 
        className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200"
        onClick={handleTriggerClick}
      >
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
            {isUploading ? (
              <div className="flex h-full w-full items-center justify-center bg-black/40">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            ) : (
              <img 
                src={avatar} 
                alt={user.name} 
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-col text-left max-w-[120px]">
            <span className="truncate text-sm font-semibold text-gray-900">{user.name}</span>
            <span className="truncate text-xs text-gray-500">{user.role}</span>
          </div>
        </div>
        <button 
          className={`rounded-md p-1.5 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-700 ${isOpen ? 'bg-gray-200 text-gray-700 rotate-90' : ''}`}
        >
          <Settings size={18} className="transition-transform duration-300" />
        </button>
      </div>
    </div>
  );
}