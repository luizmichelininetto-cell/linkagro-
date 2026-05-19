import { useState, useEffect } from "react";
import { Package } from "lucide-react";
import { getInsumos } from "../api";

const CENTROS = ["lavoura", "pecuaria", "investimento", "sede"];
const CENTRO_LABEL = { lavoura: "Lavoura", pecuaria: "Pecuária", investimento: "Investimento", sede: "Sede" };
const CENTRO_COLOR = { lavoura: "#16a34a", pecuaria: "#2563eb", investimento: "#9333ea", sede: "#f59e0b" };

export default function InsumoPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState("lavoura");
  const [expandido, setExpandido] = useState({});

  useEffect(() => {
    getInsumos()
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty"><span className="spinner" /></div>;
  if (!data) return null;

  const categorias = data.por_centro?.[aba] || [];
  const totalAba = categorias.reduce((s, c) => s + c.total, 0);

  return (
    <>
      <div className="page-title"><Package size={22} /> Insumos por Atividade</div>

      {/* Abas de centro de custo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {CENTROS.map((cc) => {
          const total = (data.por_centro?.[cc] || []).reduce((s, c) => s + c.total, 0);
          const ativo = aba === cc;
          return (
            <button
              key={cc}
              onClick={() => setAba(cc)}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 14,
                background: ativo ? CENTRO_COLOR[cc] : "#f1f5f9",
                color: ativo ? "#fff" : "#475569",
                transition: "all 0.15s",
              }}
            >
              {CENTRO_LABEL[cc]}
              {total > 0 && (
                <span style={{
                  marginLeft: 8, fontSize: 12, fontWeight: 400,
                  opacity: ativo ? 0.85 : 0.6,
                }}>
                  R$ {total.toFixed(0)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Total da aba */}
      {totalAba > 0 && (
        <div style={{
          marginBottom: 16, padding: "10px 16px", borderRadius: 8,
          background: CENTRO_COLOR[aba] + "18",
          borderLeft: `4px solid ${CENTRO_COLOR[aba]}`,
          fontSize: 14, fontWeight: 600, color: CENTRO_COLOR[aba],
        }}>
          Total {CENTRO_LABEL[aba]}: R$ {totalAba.toFixed(2)}
        </div>
      )}

      {categorias.length === 0 ? (
        <div className="card">
          <div className="empty">
            Nenhum item com rateio em {CENTRO_LABEL[aba]} ainda.<br />
            <span style={{ fontSize: 13, color: "#94a3b8" }}>
              Escaneie notas e atribua rateios para ver os insumos aqui.
            </span>
          </div>
        </div>
      ) : (
        categorias.map((cat) => {
          const aberto = expandido[cat.categoria] !== false; // aberto por padrão
          return (
            <div key={cat.categoria} className="card" style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
              {/* Header da categoria */}
              <div
                onClick={() => setExpandido((p) => ({ ...p, [cat.categoria]: !aberto }))}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px", cursor: "pointer", background: "#f8fafc",
                  borderBottom: aberto ? "1px solid #e2e8f0" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: CENTRO_COLOR[aba], display: "inline-block",
                  }} />
                  <strong style={{ fontSize: 14 }}>{cat.categoria}</strong>
                  <span className="badge badge-gray">{cat.itens.length} {cat.itens.length === 1 ? "item" : "itens"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 700, color: CENTRO_COLOR[aba], fontSize: 15 }}>
                    R$ {cat.total.toFixed(2)}
                  </span>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{aberto ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Itens */}
              {aberto && (
                <div className="table-wrap" style={{ padding: "0 0 4px" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Fornecedor</th>
                        <th>Data</th>
                        <th>Qtd</th>
                        <th>Valor (CC)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.itens.map((item, i) => (
                        <tr key={i}>
                          <td><strong>{item.descricao}</strong></td>
                          <td style={{ color: "#64748b", fontSize: 13 }}>{item.fornecedor || "—"}</td>
                          <td style={{ color: "#64748b", fontSize: 13 }}>{item.data_emissao || "—"}</td>
                          <td style={{ fontSize: 13 }}>
                            {item.quantidade != null ? `${item.quantidade} ${item.unidade || ""}` : "—"}
                          </td>
                          <td style={{ fontWeight: 600 }}>R$ {(item.valor_cc || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
