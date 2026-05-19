import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, PlusCircle, Trash2, CreditCard } from "lucide-react";
import { getNota, aplicarRateioNota, aplicarRateioItem, atualizarPagamento } from "../api";

const CENTROS = ["lavoura", "pecuaria", "investimento", "sede"];

const SUBCATEGORIAS = {
  lavoura:      ["Soja", "Milho", "Operacional", "M.O.", "Investimento"],
  pecuaria:     ["Alimentação", "Ração", "Medicamento", "Investimento", "Operacional", "M.O."],
  investimento: [],
  sede:         ["Manutenção", "Limpeza", "Investimento"],
};
const FORMA_LABEL = {
  credito: "Crédito", debito: "Débito", pix: "PIX",
  boleto: "Boleto", dinheiro: "Dinheiro", desconhecido: "—",
};

const STATUS_LABEL = { pendente: "Pendente", pago: "Pago", vencido: "Vencido" };
const STATUS_COLOR = { pendente: "#f59e0b", pago: "#16a34a", vencido: "#dc2626" };

function RateioEditor({ valorBase, rateiosIniciais, onSave, saving }) {
  const [linhas, setLinhas] = useState(
    rateiosIniciais.length > 0
      ? rateiosIniciais.map((r) => ({ centro_custo: r.centro_custo, sub_categoria: r.sub_categoria || "", percentual: r.percentual }))
      : [{ centro_custo: "lavoura", sub_categoria: "", percentual: 100 }]
  );

  const soma = linhas.reduce((s, l) => s + Number(l.percentual || 0), 0);
  const valido = Math.abs(soma - 100) < 0.01;

  const update = (i, field, val) =>
    setLinhas((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  return (
    <div>
      {linhas.map((l, i) => (
        <div className="rateio-row" key={i}>
          <select value={l.centro_custo} onChange={(e) => update(i, "centro_custo", e.target.value)}>
            {CENTROS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          {SUBCATEGORIAS[l.centro_custo]?.length > 0 && (
            <select value={l.sub_categoria || ""} onChange={(e) => update(i, "sub_categoria", e.target.value)}>
              <option value="">— subcategoria —</option>
              {SUBCATEGORIAS[l.centro_custo].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <input
            type="number" min="0.01" max="100" step="0.01"
            value={l.percentual}
            onChange={(e) => update(i, "percentual", e.target.value)}
          />
          <span style={{ fontSize: 13, color: "#64748b" }}>%</span>
          {valorBase != null && (
            <span style={{ fontSize: 13, color: "#94a3b8", minWidth: 80 }}>
              = R$ {(valorBase * Number(l.percentual || 0) / 100).toFixed(2)}
            </span>
          )}
          {linhas.length > 1 && (
            <button className="btn btn-ghost" style={{ padding: "4px 8px" }}
              onClick={() => setLinhas((prev) => prev.filter((_, idx) => idx !== i))}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={() => setLinhas((p) => [...p, { centro_custo: "lavoura", sub_categoria: "", percentual: 0 }])}>
          <PlusCircle size={14} /> Adicionar centro
        </button>
        <span style={{ fontSize: 13, color: valido ? "#16a34a" : "#dc2626", marginLeft: "auto" }}>
          Total: {soma.toFixed(2)}% {valido ? "✓" : "(deve ser 100%)"}
        </span>
        <button className="btn btn-green" disabled={!valido || saving} onClick={() => onSave(linhas)}>
          {saving ? <span className="spinner" /> : <Save size={14} />} Salvar
        </button>
      </div>
    </div>
  );
}

export default function DetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nota, setNota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingNota, setSavingNota] = useState(false);
  const [savingItem, setSavingItem] = useState(null);
  const [savingPgto, setSavingPgto] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pgtoForm, setPgtoForm] = useState(null);

  const carregar = async () => {
    const { data } = await getNota(id);
    setNota(data);
    setPgtoForm({
      status_pagamento: data.status_pagamento || "pendente",
      data_vencimento: data.data_vencimento || "",
      data_pagamento: data.data_pagamento || "",
    });
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [id]);

  const flash = (texto, tipo = "success") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 3000);
  };

  const salvarPagamento = async () => {
    setSavingPgto(true);
    try {
      await atualizarPagamento(id, pgtoForm);
      await carregar();
      flash("Status de pagamento atualizado.");
    } catch (e) {
      flash(e.response?.data?.detail || "Erro ao atualizar pagamento.", "error");
    } finally {
      setSavingPgto(false);
    }
  };

  const salvarRateioNota = async (linhas) => {
    setSavingNota(true);
    try {
      await aplicarRateioNota(id, linhas);
      await carregar();
      flash("Rateio da nota salvo com sucesso.");
    } catch (e) {
      flash(e.response?.data?.detail || "Erro ao salvar rateio.", "error");
    } finally {
      setSavingNota(false);
    }
  };

  const salvarRateioItem = async (itemId, linhas) => {
    setSavingItem(itemId);
    try {
      await aplicarRateioItem(itemId, linhas);
      await carregar();
      flash("Rateio do item salvo.");
    } catch (e) {
      flash(e.response?.data?.detail || "Erro ao salvar rateio.", "error");
    } finally {
      setSavingItem(null);
    }
  };

  if (loading) return <div className="empty"><span className="spinner" /></div>;
  if (!nota) return <div className="empty">Nota não encontrada.</div>;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={() => navigate("/notas")}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="page-title" style={{ margin: 0 }}>
          {nota.fornecedor || "Nota Fiscal"} <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 16 }}>#{nota.id}</span>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.tipo === "error" ? "alert-error" : "alert-success"}`}>{msg.texto}</div>
      )}

      <div className="card">
        <div className="result-grid">
          {[
            ["Fornecedor", nota.fornecedor],
            ["Número NF", nota.numero_nf],
            ["Data Emissão", nota.data_emissao],
            ["Valor Total", nota.valor_total != null ? `R$ ${nota.valor_total.toFixed(2)}` : "—"],
            ["Forma de Pagamento", FORMA_LABEL[nota.forma_pagamento] || "—"],
            ["Chave de Acesso", nota.chave_acesso],
          ].map(([label, val]) => (
            <div className="result-field" key={label}>
              <label>{label}</label>
              <p>{val || "—"}</p>
            </div>
          ))}
        </div>

        <div className="section-title" style={{ marginTop: 20 }}>Pagamento</div>
        {pgtoForm && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Status</label>
              <select
                value={pgtoForm.status_pagamento}
                onChange={(e) => setPgtoForm((p) => ({ ...p, status_pagamento: e.target.value }))}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 14,
                  color: STATUS_COLOR[pgtoForm.status_pagamento] || "#1e293b", fontWeight: 600 }}
              >
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Vencimento</label>
              <input type="date" value={pgtoForm.data_vencimento}
                onChange={(e) => setPgtoForm((p) => ({ ...p, data_vencimento: e.target.value }))}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Data pagamento</label>
              <input type="date" value={pgtoForm.data_pagamento}
                onChange={(e) => setPgtoForm((p) => ({ ...p, data_pagamento: e.target.value }))}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 14 }}
              />
            </div>
            <button className="btn btn-green" disabled={savingPgto} onClick={salvarPagamento}>
              {savingPgto ? <span className="spinner" /> : <CreditCard size={14} />} Salvar pagamento
            </button>
          </div>
        )}

        <div className="section-title">Rateio da Nota (aplica a todos os itens sem rateio próprio)</div>
        <RateioEditor
          valorBase={nota.valor_total}
          rateiosIniciais={nota.rateios || []}
          onSave={salvarRateioNota}
          saving={savingNota}
        />
      </div>

      {nota.itens?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-title" style={{ margin: "0 0 12px" }}>Itens ({nota.itens.length})</div>
          {nota.itens.map((item) => (
            <div key={item.id} style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>{item.descricao}</strong>
                <span style={{ color: "#64748b", fontSize: 13 }}>
                  {item.quantidade != null ? `${item.quantidade} ${item.unidade || ""}` : ""}
                  {item.valor_total != null ? ` — R$ ${item.valor_total.toFixed(2)}` : ""}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Rateio do item:</div>
              <RateioEditor
                valorBase={item.valor_total}
                rateiosIniciais={item.rateios || []}
                onSave={(linhas) => salvarRateioItem(item.id, linhas)}
                saving={savingItem === item.id}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
