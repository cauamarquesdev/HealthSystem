const API_URL = "http://localhost:3001";

export const agendaService = {
  getEvents: async (start: string, end: string) => {
    const token = localStorage.getItem("@ClinicOS:token");
    const response = await fetch(
      `${API_URL}/appointments?start=${start}&end=${end}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) throw new Error("Erro ao buscar agenda");
    return response.json();
  },

  create: async (appointmentData: any) => {
    const token = localStorage.getItem("@ClinicOS:token");
    const response = await fetch(`${API_URL}/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(appointmentData),
    });
    if (!response.ok) throw new Error("Erro ao criar agendamento");
    return response.json();
  },
};
