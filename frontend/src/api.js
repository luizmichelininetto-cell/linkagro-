import axios from "axios";

const KEY_TOKEN = "gf_token";

export const getToken = () => localStorage.getItem(KEY_TOKEN) || "";
export const setToken = (t) => localStorage.setItem(KEY_TOKEN, t);
export const clearToken = () => localStorage.removeItem(KEY_TOKEN);

// backward compat
export const getApiKey = getToken;
export const setApiKey = setToken;
export const clearApiKey = clearToken;

const api = axios.create({ baseURL: "" });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Auth
export const login = (email, senha) => api.post("/auth/login", { email, senha });
export const getMe = () => api.get("/auth/me");
export const listarUsuarios = () => api.get("/auth/usuarios");
export const criarUsuario = (payload) => api.post("/auth/usuarios", payload);
export const atualizarUsuario = (id, payload) => api.patch(`/auth/usuarios/${id}`, payload);
export const listarFazendas = () => api.get("/auth/fazendas");
export const criarFazenda = (payload) => api.post("/auth/fazendas", payload);

// Notas
export const scanNota = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/scan/", form);
};

export const criarNotaManual = (payload) => api.post("/notas/", payload);
export const listNotas = (params) => api.get("/notas/", { params });
export const getNota = (id) => api.get(`/notas/${id}`);
export const deleteNota = (id) => api.delete(`/notas/${id}`);
export const aplicarRateioNota = (id, rateios) =>
  api.patch(`/notas/${id}/rateio`, { rateios });
export const aplicarRateioItem = (id, rateios) =>
  api.patch(`/notas/itens/${id}/rateio`, { rateios });

export const exportExcel = (params) =>
  api.get("/exportar/excel", { params, responseType: "blob" });
export const exportCsv = (params) =>
  api.get("/exportar/csv", { params, responseType: "blob" });

export const atualizarPagamento = (id, payload) =>
  api.patch(`/notas/${id}/pagamento`, payload);
export const criarParcelas = (id, payload) =>
  api.post(`/notas/${id}/parcelas`, payload);
export const atualizarParcela = (parcelaId, payload) =>
  api.patch(`/notas/parcelas/${parcelaId}`, payload);

export const getDashboard = () => api.get("/dashboard/");
export const getInsumos = () => api.get("/insumos/");
export const getGastosMensais = () => api.get("/insumos/mensal/");

export default api;
