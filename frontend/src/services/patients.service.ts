// src/services/patients.service.ts

// src/services/patients.service.ts no FRONTEND

// Forçamos a porta 3001 como fallback direto para evitar o erro de localhost:3000
const API_URL = "http://localhost:3001";

export const patientsService = {
  // Busca todos
  getAll: async () => {
    const token = localStorage.getItem("@ClinicOS:token");
    const response = await fetch(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Erro ao buscar pacientes");
    return response.json();
  },

  // Cria um novo
  create: async (patientData: any) => {
    const token = localStorage.getItem("@ClinicOS:token");
    const response = await fetch(`${API_URL}/patients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patientData),
    });
    if (!response.ok) throw new Error("Erro ao criar paciente");
    return response.json();
  },

  // Atualiza o status
  toggleStatus: async (id: number, isActive: boolean) => {
    const token = localStorage.getItem("@ClinicOS:token");
    const response = await fetch(`${API_URL}/patients/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active: isActive }),
    });
    if (!response.ok) throw new Error("Erro ao atualizar status");
    return response.json();
  },

  // Deleta em lote
  deleteBatch: async (ids: number[]) => {
    const token = localStorage.getItem("@ClinicOS:token");
    const response = await fetch(`${API_URL}/patients/batch`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error("Erro ao deletar pacientes");
    return response.json();
  },
};
