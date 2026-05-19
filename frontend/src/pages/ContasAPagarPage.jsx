import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Clock, Search } from "lucide-react";
import { listNotas, atualizarPagamento } from "../api";

const STATUS_LABEL = { pendente: "Pendente", pago: "Pago", vencido: "Vencido" };
const STATUS_BADGE = { pendente: "badge-yellow", pago: "badge-green", vencido: "badge-red" };
const STATUS_ICON = {
  pendente: <Clock size={14} />,
  pago: <CheckCircle size={14} />,
  vencido: <AlertCircle size={14} />,
};

function diasLabel(dataVenc) {
  if (!dataVenc) return null;
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(dataVenc + "T00:00:00");
    const diff = Math.round((venc - hoje) / 86400000);
    if (diff < 0) return { texto: `${Math.abs(diff)}d em atraso`, cor: "#dc2626" };
    if (diff === 0) return { texto: "Vence hoje", cor: "#f59e0b" };
    if (diff <= 7) return { texto: `${diff}d restantes`, cor: "#f59e0b" };
    return { texto: `${diff}d restantes`, cor: "#64748b" };
  } catch {
    return null;
  }
}

export default function ContasAPagarPage() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("pendente");
  const [saving, setSaving] = useState(null);
  const navigate = useNavigate();

  const carregar = async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filtroStatus) params.status_pagamento = filtroStatus;
      const { data } = await listNotas(params);
      setNotas(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [filtroStatus]);

  const marcarPago = async (e, nota) => {
    e.stopPropagation();
    setSaving(nota.id);
    try {
      await atualizarPagamento(nota.id, {
        status_pagamento: "pago",
        data_vencimento: nota.data_vencimento || null,
        data_pagamento: new Date().toISOString().slice(0, 10),
      });
      await carregar();
    } finally {
      setSaving(null);
    }
  };

  const totalPendente = notas
    .filter((n) => n.status_pagamento !== "pago")
    .reduce((s, n) => s + (n.valor_total || 0), 0);

  return (
    <>
      <div className="page-title"><AlertCircle size={22} /> Contas a Pagar</div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {["pendente", "vencido", "pago", ""].map((s) => (
          <button
            key={s}
            className={`btn ${filtroStatus === s ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFiltroStatus(s)}
          >
            {s ? STATUS_LABEL[s] : "Todos"}
          </button>
        ))}
      </div>

      {totalPendente > 0 && filtroStatus !== "pago" && (
        <div className="card" style={{ marginBottom: 16, background: "#fef3c7", border: "1px solid #fde68a" }}>
          <div style={{ fontSize: 14, color: "#92400e" }}>
            <strong>Total a pagar:</strong> R$ {totalPendente.toFixed(2)} ({notas.filter((n) => n.status_pagamento !== "pago").length} nota(s))
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : notas.length === 0 ? (
          <div className="empty">Nenhuma conta encontrada.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fornecedor</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Prazo</th>
                  <th>Status</th>
                  <th>Pago em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {notas.map((n) => {
                  const prazo = diasLabel(n.data_vencimento);
                  return (
                    <tr key={n.id} onClick={() => navigate(`/notas/${n.id}`)} style={{ cursor: "pointer" }}>
                      <td style={{ color: "#94a3b8" }}>{n.id}</td>
                      <td><strong>{n.fornecedor || "—"}</strong></td>
                      <td>{n.valor_total != null ? `R$ ${n.valor_total.toFixed(2)}` : "—"}</td>
                      <td style={{ fontSize: 13 }}>{n.data_vencimento || "—"}</td>
                      <td>
                        {prazo && n.status_pagamento !== "pago" && (
                          <span style={{ fontSize: 12, color: prazo.cor, fontWeight: 600 }}>{prazo.texto}</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[n.status_pagamento] || "badge-gray"}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {STATUS_ICON[n.status_pagamento]}
                          {STATUS_LABEL[n.status_pagamento] || "—"}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: "#64748b" }}>{n.data_pagamento || "—"}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {n.status_pagamento !== "pago" && (
                          <button
                            className="btn btn-green"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                            disabled={saving === n.id}
                            onClick={(e) => marcarPago(e, n)}
                          >
                            {saving === n.id ? <span className="spinner" /> : <CheckCircle size={13} />} Pago
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
