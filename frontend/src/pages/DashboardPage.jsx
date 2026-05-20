import { useState, useEffect } from "react";
import { LayoutDashboard, TrendingUp, AlertCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { getDashboard, getGastosMensais } from "../api";

const CC_COLORS = {
  lavoura: "#16a34a",
  pecuaria: "#2563eb",
  investimento: "#9333ea",
  sede: "#f59e0b",
};

const STATUS_COLORS = { pendente: "#f59e0b", pago: "#16a34a", vencido: "#dc2626" };
const STATUS_LABEL = { pendente: "Pendente", pago: "Pago", vencido: "Vencido" };

const MESES_BR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const formatMes = (mes) => {
  // "2026-04" → "Abr/26"
  const [ano, m] = (mes || "").split("-");
  if (!ano || !m) return mes;
  return `${MESES_BR[parseInt(m, 10) - 1]}/${ano.slice(2)}`;
};
const formatData = (data) => {
  // "2026-06-11" → "11/06/2026" ou "11/06/2026" já no formato BR
  if (!data) return "—";
  if (data.includes("/")) return data; // já em BR
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
};

function Card({ title, children, style }) {
  return (
    <div className="card" style={{ ...style }}>
      {title && <div className="section-title" style={{ marginBottom: 12 }}>{title}</div>}
      {children}
    </div>
  );
}

function KpiCard({ label, valor, sub, color }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "#1e293b" }}>{valor}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [mensal, setMensal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    Promise.all([getDashboard(), getGastosMensais()])
      .then(([r1, r2]) => { setData(r1.data); setMensal(r2.data); })
      .catch(() => setErro("Erro ao carregar dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty"><span className="spinner" /></div>;
  if (erro) return <div className="alert alert-error">{erro}</div>;
  if (!data) return null;

  const statusPieData = Object.entries(data.por_status)
    .filter(([, v]) => v.count > 0)
    .map(([k, v]) => ({ name: STATUS_LABEL[k], value: Math.round(v.valor * 100) / 100, count: v.count }));

  const ccBarData = Object.entries(data.por_centro_custo)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), valor: v, fill: CC_COLORS[k] || "#64748b" }));

  const pendente = data.por_status?.pendente || { valor: 0, count: 0 };
  const vencido = data.por_status?.vencido || { valor: 0, count: 0 };
  const pago = data.por_status?.pago || { valor: 0, count: 0 };

  return (
    <>
      <div className="page-title"><LayoutDashboard size={22} /> Painel Financeiro</div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <KpiCard label="Total de Notas" valor={data.total_notas} />
        <KpiCard label="Volume Total" valor={`R$ ${data.valor_total_geral.toFixed(2)}`} />
        <KpiCard label="A Pagar" valor={`R$ ${pendente.valor.toFixed(2)}`}
          sub={`${pendente.count} nota(s)`} color="#f59e0b" />
        <KpiCard label="Vencido" valor={`R$ ${vencido.valor.toFixed(2)}`}
          sub={`${vencido.count} nota(s)`} color="#dc2626" />
        <KpiCard label="Pago" valor={`R$ ${pago.valor.toFixed(2)}`}
          sub={`${pago.count} nota(s)`} color="#16a34a" />
        {data.sem_rateio > 0 && (
          <KpiCard label="Sem Rateio" valor={`R$ ${data.sem_rateio.toFixed(2)}`} color="#94a3b8" />
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Por Centro de Custo */}
        <Card title="Por Centro de Custo">
          {ccBarData.length === 0 ? (
            <div className="empty" style={{ padding: "20px 0" }}>Sem rateios cadastrados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ccBarData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`R$ ${v.toFixed(2)}`, "Valor"]} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {ccBarData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Status de Pagamento */}
        <Card title="Status de Pagamento">
          {statusPieData.length === 0 ? (
            <div className="empty" style={{ padding: "20px 0" }}>Sem dados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={75} innerRadius={35}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {statusPieData.map((entry, index) => (
                    <Cell key={index}
                      fill={STATUS_COLORS[Object.keys(STATUS_LABEL).find((k) => STATUS_LABEL[k] === entry.name)] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [`R$ ${v.toFixed(2)}`, name]} />
                <Legend formatter={(name) => <span style={{ fontSize: 12 }}>{name}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Gastos Mensais: notas + parcelas */}
      {mensal?.mensal?.length > 0 && (() => {
        const hoje = new Date().toISOString().slice(0, 7);
        const dadosFiltrados = mensal.mensal.filter(
          (m) => m.notas_emitidas > 0 || m.parcelas_devidas > 0
        );
        return dadosFiltrados.length > 0 ? (
          <Card title="Gastos Mensais — Notas emitidas vs Desembolso (parcelas)" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, display: "flex", gap: 20 }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#2563eb", marginRight: 4 }} />Notas emitidas (custo do mês)</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#f59e0b", marginRight: 4 }} />Parcelas devidas (desembolso)</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dadosFiltrados} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={formatMes} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, name) => [`R$ ${v.toFixed(2)}`, name === "notas_emitidas" ? "Notas emitidas" : "Parcelas devidas"]} />
                <Bar dataKey="notas_emitidas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="parcelas_devidas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        ) : null;
      })()}

      {/* Alertas de Vencimento */}
      {data.alertas_vencimento?.length > 0 && (
        <Card title="Vencimentos Próximos / Atrasados">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fornecedor</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {data.alertas_vencimento.map((a) => (
                  <tr key={a.id}>
                    <td style={{ color: "#94a3b8" }}>{a.id}</td>
                    <td>{a.fornecedor || "—"}</td>
                    <td>{a.valor_total != null ? `R$ ${a.valor_total.toFixed(2)}` : "—"}</td>
                    <td style={{ fontSize: 13 }}>{formatData(a.data_vencimento)}</td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: a.dias_para_vencer < 0 ? "#dc2626" : a.dias_para_vencer <= 7 ? "#f59e0b" : "#64748b",
                      }}>
                        {a.dias_para_vencer < 0
                          ? `${Math.abs(a.dias_para_vencer)}d em atraso`
                          : a.dias_para_vencer === 0
                          ? "Vence hoje"
                          : `${a.dias_para_vencer}d restantes`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
