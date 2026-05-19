import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Trash2, Search } from "lucide-react";
import { listNotas, deleteNota } from "../api";

const FORMA_LABEL = {
  credito: "Crédito", debito: "Débito", pix: "PIX",
  boleto: "Boleto", dinheiro: "Dinheiro", desconhecido: "—",
};

const FORMA_BADGE = {
  credito: "badge-blue", debito: "badge-blue", pix: "badge-green",
  boleto: "badge-yellow", dinheiro: "badge-gray", desconhecido: "badge-gray",
};

export default function NotasPage() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ fornecedor: "", forma_pagamento: "", centro_custo: "" });
  const navigate = useNavigate();

  const carregar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtros.fornecedor) params.fornecedor = filtros.fornecedor;
      if (filtros.forma_pagamento) params.forma_pagamento = filtros.forma_pagamento;
      if (filtros.centro_custo) params.centro_custo = filtros.centro_custo;
      const { data } = await listNotas(params);
      setNotas(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Excluir esta nota fiscal?")) return;
    await deleteNota(id);
    setNotas((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <>
      <div className="page-title"><FileText size={22} /> Notas Fiscais</div>

      <div className="filters">
        <div>
          <label>Fornecedor</label>
          <input
            placeholder="Buscar..."
            value={filtros.fornecedor}
            onChange={(e) => setFiltros((f) => ({ ...f, fornecedor: e.target.value }))}
          />
        </div>
        <div>
          <label>Pagamento</label>
          <select value={filtros.forma_pagamento} onChange={(e) => setFiltros((f) => ({ ...f, forma_pagamento: e.target.value }))}>
            <option value="">Todos</option>
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
        <button className="btn btn-primary" onClick={carregar}><Search size={15} /> Filtrar</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : notas.length === 0 ? (
          <div className="empty">Nenhuma nota encontrada.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fornecedor</th>
                  <th>Número NF</th>
                  <th>Data</th>
                  <th>Valor Total</th>
                  <th>Pagamento</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {notas.map((n) => (
                  <tr key={n.id} onClick={() => navigate(`/notas/${n.id}`)} style={{ cursor: "pointer" }}>
                    <td style={{ color: "#94a3b8" }}>{n.id}</td>
                    <td><strong>{n.fornecedor || "—"}</strong></td>
                    <td>{n.numero_nf || "—"}</td>
                    <td>{n.data_emissao || "—"}</td>
                    <td>{n.valor_total != null ? `R$ ${n.valor_total.toFixed(2)}` : "—"}</td>
                    <td>
                      <span className={`badge ${FORMA_BADGE[n.forma_pagamento] || "badge-gray"}`}>
                        {FORMA_LABEL[n.forma_pagamento] || "—"}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-danger" style={{ padding: "4px 8px" }} onClick={(e) => handleDelete(e, n.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
