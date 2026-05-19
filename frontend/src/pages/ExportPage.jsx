import { useState } from "react";
import { Download } from "lucide-react";
import { exportExcel, exportCsv } from "../api";

const FORMA_LABEL = {
  credito: "Crédito", debito: "Débito", pix: "PIX",
  boleto: "Boleto", dinheiro: "Dinheiro", desconhecido: "Desconhecido",
};

export default function ExportPage() {
  const [filtros, setFiltros] = useState({ fornecedor: "", forma_pagamento: "", centro_custo: "" });
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const download = async (tipo) => {
    setLoading(tipo);
    setError(null);
    try {
      const params = {};
      if (filtros.fornecedor) params.fornecedor = filtros.fornecedor;
      if (filtros.forma_pagamento) params.forma_pagamento = filtros.forma_pagamento;
      if (filtros.centro_custo) params.centro_custo = filtros.centro_custo;

      const fn = tipo === "excel" ? exportExcel : exportCsv;
      const res = await fn(params);

      if (res.data?.mensagem) {
        setError(res.data.mensagem);
        return;
      }

      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = tipo === "excel" ? "notas_fiscais.xlsx" : "notas_fiscais.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data?.detail || "Erro ao exportar.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="page-title"><Download size={22} /> Exportar</div>

      <div className="card">
        <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14 }}>
          Filtre as notas antes de exportar, ou deixe em branco para exportar tudo.
        </p>

        <div className="filters">
          <div>
            <label>Fornecedor</label>
            <input
              placeholder="Todos"
              value={filtros.fornecedor}
              onChange={(e) => setFiltros((f) => ({ ...f, fornecedor: e.target.value }))}
            />
          </div>
          <div>
            <label>Forma de Pagamento</label>
            <select value={filtros.forma_pagamento} onChange={(e) => setFiltros((f) => ({ ...f, forma_pagamento: e.target.value }))}>
              <option value="">Todas</option>
              {Object.entries(FORMA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label>Centro de Custo</label>
            <select value={filtros.centro_custo} onChange={(e) => setFiltros((f) => ({ ...f, centro_custo: e.target.value }))}>
              <option value="">Todos</option>
              {["lavoura", "pecuaria", "investimento", "sede"].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button className="btn btn-green" onClick={() => download("excel")} disabled={loading !== null}>
            {loading === "excel" ? <span className="spinner" /> : <Download size={15} />}
            Excel (.xlsx)
          </button>
          <button className="btn btn-ghost" onClick={() => download("csv")} disabled={loading !== null}>
            {loading === "csv" ? <span className="spinner" /> : <Download size={15} />}
            CSV
          </button>
        </div>

        <p style={{ marginTop: 16, fontSize: 13, color: "#94a3b8" }}>
          O Excel inclui duas abas: detalhamento por item e resumo por centro de custo.
        </p>
      </div>
    </>
  );
}
