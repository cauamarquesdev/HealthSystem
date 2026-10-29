import { api } from "../lib/api";

interface CreateTransactionData {
  description: string;
  amount: number;
  type: "RECEITA" | "DESPESA";
  status: "PENDENTE" | "PAGO" | "ATRASADO";
  dueDate: string; // Formato ISO 8601 (YYYY-MM-DD)
  category: string;
  paymentMethod?: string;
}

export const financeService = {
  // Registra uma nova entrada ou saída
  async createTransaction(data: CreateTransactionData) {
    const response = await api.post("/api/financas/transacao", data);
    return response.data;
  },

  // Busca a lista de contas para preencher a tabela
  async getStatement(month: number, year: number) {
    const response = await api.get(
      `/api/financas/extrato?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`,
    );
    return response.data;
  },

  // Busca os totais para os Cards Superiores (Saldo, Receitas, Despesas)
  async getSummary(month: number, year: number) {
    const response = await api.get(
      `/api/financas/resumo?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`,
    );
    return response.data;
  },
};
