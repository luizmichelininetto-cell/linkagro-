import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePlus, Check, ArrowLeft } from "lucide-react";
import { criarNotaManual } from "../api";

const FORMAS = ["desconhecido", "pix", "boleto", "credito", "debito", "dinheiro"];
const FORMA_LABEL = { desconhecido: "Não informado", pix: "PIX", boleto: "Boleto", credito: "Cartão de Crédito", debito: "Cartão de Débito", dinheiro: "Dinheiro" };
const CENTROS = ["lavoura", "pecuaria", "investimento", "sede"];
const CENTRO_LABEL = { lavoura: "Lavoura", pecuaria: "Pecuária", investimento: "Investimento", sede: "Sede" };

const VAZIO = { descricao: "", quantidade: "", unidade: "", valor_unitario: "", valor_total: "" };

export default function NotaManualPage() {
  const navigate = useNavigate();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const [form, setForm] = useState({
    numero_nf: "",
    fornecedor: "",
    data_emissao: "",
    valor_total: "",
    forma_pagamento: "desconhecido",
    data_vencimento: "",
    status_pagamento: "pendente",
  });

  const [itens, setItens] = useState([{ ...VAZIO }]);
  const [usarRateioNota, setUsarRateioNota] = useState(false);
  const [rateioNota, setRateioNota] = useState([{ centro_custo: "lavoura", percentual: 100 }]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addItem = () => setItens((l) => [...l, { ...VAZIO }]);
  const removeItem = (i) => setItens((l) => l.filter((_, idx) => idx !== i));
  const setItem = (i, k, v) => setItens((l) => l.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const addRateio = () => setRateioNota((r) => [...r, { centro_custo: "lavoura", percentual: 0 }]);
  const removeRateio = (i) => setRateioNota((r) => r.filter((_, idx) => idx !== i));
  const setRateio = (i, k, v) => setRateioNota((r) => r.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const somaRateio = rateioNota.reduce((s, r) => s + Number(r.percentual || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);

    if (usarRateioNota && Math.abs(somaRateio - 100) > 0.01) {
      setErro(`Soma do rateio deve ser 100%. Atual: ${somaRateio.toFixed(1)}%`);
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        numero_nf: form.numero_nf || null,
        fornecedor: form.fornecedor || null,
        data_emissao: form.data_emissao || null,
        valor_total: form.valor_total ? parseFloat(form.valor_total) : null,
        forma_pagamento: form.forma_pagamento,
        data_vencimento: form.data_vencimento || null,
        status_pagamento: form.status_pagamento,
        itens: itens
          .filter((it) => it.descricao.trim())
          .map((it) => ({
            descricao: it.descricao,
            quantidade: it.quantidade ? parseFloat(it.quantidade) : null,
            unidade: it.unidade || null,
            valor_unitario: it.valor_unitario ? parseFloat(it.valor_unitario) : null,
            valor_total: it.valor_total ? parseFloat(it.valor_total) : null,
          })),
        rateios: usarRateioNota
          ? rateioNota.map((r) => ({ centro_custo: r.centro_custo, percentual: Number(r.percentual) }))
          : [],
      };

      const { data } = await criarNotaManual(payload);
      navigate(`/app/notas/${data.id}`);
    } catch (err) {
      setErro(err?.response?.data?.detail || "Erro ao salvar nota.");
    } finally {
      setSalvando(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0",
    borderRadius: 8, fontSize: 14, boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 };

  return (
    <>
      <div className="page-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}>
          <ArrowLeft size={20} />
        </button>
        <FilePlus size={22} /> Nova Nota Manual
      </div>

      <form onSubmit={handleSubmit}>
        {/* Dados principais */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>Dados da Nota</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Número NF</label>
              <input value={form.numero_nf} onChange={(e) => set("numero_nf", e.target.value)} style={inputStyle} placeholder="000.000" />
            </div>
            <div>
              <label style={labelStyle}>Fornecedor</label>
              <input value={form.fornecedor} onChange={(e) => set("fornecedor", e.target.value)} style={inputStyle} placeholder="Nome do fornecedor" />
            </div>
            <div>
              <label style={labelStyle}>Data de Emissão</label>
              <input type="date" value={form.data_emissao} onChange={(e) => set("data_emissao", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Valor Total (R$)</label>
              <input type="number" step="0.01" min="0" value={form.valor_total}
                onChange={(e) => set("valor_total", e.target.value)} style={inputStyle} placeholder="0,00" />
            </div>
            <div>
              <label style={labelStyle}>Forma de Pagamento</label>
              <select value={form.forma_pagamento} onChange={(e) => set("forma_pagamento", e.target.value)} style={inputStyle}>
                {FORMAS.map((f) => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status_pagamento} onChange={(e) => set("status_pagamento", e.target.value)} style={inputStyle}>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Data de Vencimento</label>
              <input type="date" value={form.data_vencimento} onChange={(e) => set("data_vencimento", e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="section-title">Itens</div>
            <button type="button" onClick={addItem} className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 12px" }}>
              + Item
            </button>
          </div>

          {itens.map((item, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
              <div>
                {i === 0 && <label style={labelStyle}>Descrição</label>}
                <input value={item.descricao} onChange={(e) => setItem(i, "descricao", e.target.value)}
                  style={inputStyle} placeholder="Produto / serviço" />
              </div>
              <div>
                {i === 0 && <label style={labelStyle}>Qtd</label>}
                <input type="number" step="0.001" value={item.quantidade} onChange={(e) => setItem(i, "quantidade", e.target.value)}
                  style={inputStyle} placeholder="1" />
              </div>
              <div>
                {i === 0 && <label style={labelStyle}>Un.</label>}
                <input value={item.unidade} onChange={(e) => setItem(i, "unidade", e.target.value)}
                  style={inputStyle} placeholder="un" />
              </div>
              <div>
                {i === 0 && <label style={labelStyle}>Vl. Unit.</label>}
                <input type="number" step="0.01" value={item.valor_unitario} onChange={(e) => setItem(i, "valor_unitario", e.target.value)}
                  style={inputStyle} placeholder="0,00" />
              </div>
              <div>
                {i === 0 && <label style={labelStyle}>Vl. Total</label>}
                <input type="number" step="0.01" value={item.valor_total} onChange={(e) => setItem(i, "valor_total", e.target.value)}
                  style={inputStyle} placeholder="0,00" />
              </div>
              <div style={{ paddingBottom: 1 }}>
                {itens.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)}
                    style={{ padding: "8px 10px", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Rateio */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <input type="checkbox" id="usar-rateio" checked={usarRateioNota} onChange={(e) => setUsarRateioNota(e.target.checked)} />
            <label htmlFor="usar-rateio" className="section-title" style={{ margin: 0, cursor: "pointer" }}>
              Aplicar rateio por centro de custo
            </label>
          </div>

          {usarRateioNota && (
            <>
              {rateioNota.map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                  <div>
                    {i === 0 && <label style={labelStyle}>Centro de Custo</label>}
                    <select value={r.centro_custo} onChange={(e) => setRateio(i, "centro_custo", e.target.value)} style={inputStyle}>
                      {CENTROS.map((c) => <option key={c} value={c}>{CENTRO_LABEL[c]}</option>)}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <label style={labelStyle}>Percentual (%)</label>}
                    <input type="number" min="0" max="100" step="0.1" value={r.percentual}
                      onChange={(e) => setRateio(i, "percentual", e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ paddingBottom: 1, paddingTop: i === 0 ? 20 : 0 }}>
                    {rateioNota.length > 1 && (
                      <button type="button" onClick={() => removeRateio(i)}
                        style={{ padding: "8px 10px", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8, cursor: "pointer" }}>
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={addRateio} className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 12px" }}>
                  + Centro
                </button>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: Math.abs(somaRateio - 100) < 0.01 ? "#16a34a" : "#dc2626",
                }}>
                  Total: {somaRateio.toFixed(1)}%
                </span>
              </div>
            </>
          )}
        </div>

        {erro && <div className="alert alert-error" style={{ marginBottom: 12 }}>{erro}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={salvando} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {salvando ? <span className="spinner" /> : <><Check size={15} /> Salvar Nota</>}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
        </div>
      </form>
    </>
  );
}
