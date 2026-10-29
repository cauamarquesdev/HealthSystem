"use client";

import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  MoreHorizontal,
  Calendar,
  DollarSign,
  GripVertical,
  Clock,
  User,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../../src/components/ui/input";
import { Label } from "../../src/components/ui/label";

interface Lead {
  id: string;
  patient: string;
  procedure: string;
  value: string;
  date: string;
}

interface Column {
  name: string;
  items: Lead[];
}

type BoardData = Record<string, Column>;

const initialBoardData: BoardData = {
  entrada: {
    name: "Entrada",
    items: [
      {
        id: "lead-1",
        patient: "Mariana Silva",
        procedure: "Harmonização",
        value: "R$ 3.500",
        date: "Hoje",
      },
      {
        id: "lead-2",
        patient: "Roberto Carlos",
        procedure: "Limpeza de Pele",
        value: "R$ 250",
        date: "Ontem",
      },
    ],
  },
  orcado: { name: "Orçado", items: [] },
  agendado: { name: "Agendado", items: [] },
  ganho: { name: "Ganho", items: [] },
};

export default function KanbanBoard() {
  const [data, setData] = useState<BoardData>(initialBoardData);
  const [isMounted, setIsMounted] = useState(false);

  // Estados para a nova Interação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;

    if (source.droppableId !== destination.droppableId) {
      const sourceColumn = data[source.droppableId];
      const destColumn = data[destination.droppableId];
      const sourceItems = [...sourceColumn.items];
      const destItems = [...destColumn.items];

      const [removed] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, removed);

      setData({
        ...data,
        [source.droppableId]: { ...sourceColumn, items: sourceItems },
        [destination.droppableId]: { ...destColumn, items: destItems },
      });

      // A MÁGICA ACONTECE AQUI: Se caiu na coluna "agendado", abre o modal
      if (destination.droppableId === "agendado") {
        setSelectedLead(removed);
        setIsModalOpen(true);
      }
    } else {
      const column = data[source.droppableId];
      const copiedItems = [...column.items];
      const [removed] = copiedItems.splice(source.index, 1);
      copiedItems.splice(destination.index, 0, removed);

      setData({
        ...data,
        [source.droppableId]: { ...column, items: copiedItems },
      });
    }
  };

  const handleConfirmSchedule = () => {
    // Aqui conectaremos com a API do NestJS para salvar na Agenda oficial
    console.log(`Paciente ${selectedLead?.patient} agendado com sucesso!`);
    setIsModalOpen(false);
    setSelectedLead(null);
  };

  if (!isMounted) return null;

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 h-full overflow-x-auto pb-4 custom-scrollbar">
          {Object.entries(data).map(([columnId, column]) => (
            <div
              key={columnId}
              className="flex flex-col min-w-[320px] w-[320px]"
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-semibold text-zinc-800 tracking-tight flex items-center gap-2">
                  {column.name}
                  <span className="flex items-center justify-center bg-zinc-100 text-zinc-500 text-[11px] h-5 w-5 rounded-full font-bold">
                    {column.items.length}
                  </span>
                </h3>
                <button className="text-zinc-400 hover:text-zinc-700 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 p-3 rounded-2xl transition-colors duration-200 flex flex-col gap-3 border ${
                      snapshot.isDraggingOver
                        ? "bg-emerald-50/50 border-emerald-200/60"
                        : "bg-zinc-50/50 border-zinc-200/40"
                    }`}
                  >
                    {column.items.map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-4 rounded-xl border border-zinc-200/60 group ${
                              snapshot.isDragging
                                ? "shadow-[0_20px_40px_rgba(0,0,0,0.08)] rotate-[2deg] scale-105 z-50"
                                : "shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-zinc-300 hover:shadow-md"
                            } transition-all duration-200`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-zinc-900 tracking-tight">
                                  {item.patient}
                                </span>
                                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-md mt-1">
                                  {item.procedure}
                                </span>
                              </div>
                              <GripVertical className="w-4 h-4 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                            </div>

                            <div className="flex items-center justify-between text-[12px] text-zinc-500 pt-3 border-t border-zinc-100">
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span className="font-medium">
                                  {item.value}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{item.date}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Modal de Integração Kanban -> Agenda */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-zinc-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl bg-white/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Definir Horário
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Oportunidade movida para Agendado. Escolha o momento do
              atendimento.
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 mb-2 flex items-center gap-3">
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-900">
                  {selectedLead.patient}
                </span>
                <span className="text-xs text-zinc-500">
                  {selectedLead.procedure}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label
                htmlFor="date"
                className="text-xs font-medium text-zinc-700 uppercase tracking-wider"
              >
                Data
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="date"
                  type="date"
                  className="pl-9 bg-zinc-50/50 border-zinc-200 focus-visible:ring-emerald-500 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="time"
                className="text-xs font-medium text-zinc-700 uppercase tracking-wider"
              >
                Horário
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="time"
                  type="time"
                  className="pl-9 bg-zinc-50/50 border-zinc-200 focus-visible:ring-emerald-500 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl hover:bg-zinc-100"
            >
              Pular por enquanto
            </Button>
            <Button
              onClick={handleConfirmSchedule}
              className="bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl px-6 transition-all active:scale-95 shadow-sm"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
