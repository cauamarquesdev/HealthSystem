import { api } from "../lib/api";

interface CreateNoteData {
  content: string;
  isAI: boolean;
}

export const medicalRecordService = {
  // Salva o texto da evolução clínica no banco
  async saveEvolution(patientId: string, data: CreateNoteData) {
    const response = await api.post(
      `/api/prontuario/${patientId}/evolucao`,
      data,
    );
    return response.data;
  },

  // Busca todo o histórico (notas, fotos e receitas) para montar a Timeline
  async getPatientTimeline(patientId: string) {
    const response = await api.get(`/api/prontuario/${patientId}/historico`);
    return response.data;
  },
};
