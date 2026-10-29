import { api } from "../lib/api";

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  access_token?: string;
  [key: string]: unknown;
}

export const authService = {
  async login(data: LoginData) {
    const response = await api.post<AuthResponse>("/auth/login", data);

    // Se o login der certo, salva o token no navegador
    if (response.data.access_token) {
      localStorage.setItem("@ClinicOS:token", response.data.access_token);
    }

    return response.data;
  },

  async register(data: any) {
    const response = await api.post<AuthResponse>("/auth/register", data);

    if (response.data.access_token) {
      localStorage.setItem("@ClinicOS:token", response.data.access_token);
    }

    return response.data;
  },

  logout() {
    localStorage.removeItem("@ClinicOS:token");
    window.location.href = "/login";
  },
};
