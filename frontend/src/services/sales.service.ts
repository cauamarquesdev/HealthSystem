import { api } from "../lib/api";

interface SaleItem {
  name: string;
  price: number;
  quantity: number;
}

interface CreateSaleData {
  patientId: string;
  userId: string;
  totalAmount: number;
  status: "ORCAMENTO" | "PAGO" | "CANCELADO";
  paymentType?: "PIX" | "CREDITO" | "DEBITO" | "DINHEIRO";
  items: SaleItem[];
}

export const salesService = {
  // Registra uma nova venda ou orçamento
  async create(data: CreateSaleData) {
    const response = await api.post("/api/vendas/nova", data);
    return response.data;
  },

  // Busca os dados para preencher o Dashboard de Vendas (os 4 cards coloridos)
  async getDashboardMetrics() {
    const response = await api.get("/api/vendas/metricas");
    return response.data;
  },
};
