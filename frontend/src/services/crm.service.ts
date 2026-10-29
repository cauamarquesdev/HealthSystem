import { api } from "../lib/api";

interface CreateOppData {
  leadName: string;
  phone: string;
  source?: string;
  title: string;
  value?: number;
}

export const crmService = {
  // Acionado no botão "+ Nova Oportunidade"
  async createOpportunity(data: CreateOppData) {
    const response = await api.post("/api/crm/oportunidade", data);
    return response.data;
  },

  // Acionado quando o usuário solta o card em outra coluna (Drag and Drop)
  async moveOpportunity(opportunityId: string, newStage: string) {
    const response = await api.patch(
      `/api/crm/oportunidade/${opportunityId}/etapa`,
      {
        stage: newStage,
      },
    );
    return response.data;
  },

  // Busca todos os cards para desenhar as colunas do funil
  async getKanbanBoard() {
    const response = await api.get("/api/crm/kanban");
    return response.data;
  },
};
