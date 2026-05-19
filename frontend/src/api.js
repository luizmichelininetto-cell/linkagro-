import axios from "axios";

const KEY_STORAGE = "nf_api_key";

export const getApiKey = () => localStorage.getItem(KEY_STORAGE) || "";
export const setApiKey = (k) => localStorage.setItem(KEY_STORAGE, k);
export const clearApiKey = () => localStorage.removeItem(KEY_STORAGE);

const api = axios.create({ baseURL: "" });

api.interceptors.request.use((config) => {
  const key = getApiKey();
  if (key) config.headers["X-API-Key"] = key;
  return config;
});

export const scanNota = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/scan/", form);
};

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

export const getDashboard = () => api.get("/dashboard/");

export default api;
