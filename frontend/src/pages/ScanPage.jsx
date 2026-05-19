import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { ScanLine, UploadCloud, CheckCircle, XCircle } from "lucide-react";
import { scanNota } from "../api";

const FORMA_LABEL = {
  credito: "Crédito", debito: "Débito", pix: "PIX",
  boleto: "Boleto", dinheiro: "Dinheiro", desconhecido: "—",
};

export default function ScanPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const onDrop = useCallback((accepted) => {
    setFile(accepted[0]);
    setResult(null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "application/pdf": [] },
    maxFiles: 1,
  });

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await scanNota(file);
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.detail || "Erro ao processar a nota.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-title"><ScanLine size={22} /> Escanear Nota Fiscal</div>

      <div className="card">
        <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`}>
          <input {...getInputProps()} />
          <div className="icon"><UploadCloud size={40} color="#94a3b8" /></div>
          {file
            ? <p style={{ color: "#0ea5e9", fontWeight: 600 }}>{file.name}</p>
            : <p>Arraste uma imagem ou PDF aqui, ou clique para selecionar</p>
          }
          <p style={{ fontSize: 12, marginTop: 6 }}>JPG · PNG · WEBP · PDF — máx. 10 MB</p>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={handleScan} disabled={!file || loading}>
            {loading ? <span className="spinner" /> : <ScanLine size={16} />}
            {loading ? "Processando..." : "Escanear"}
          </button>
          {file && (
            <button className="btn btn-ghost" onClick={() => { setFile(null); setResult(null); }}>
              Limpar
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 16 }}><XCircle size={16} /> {error}</div>}

      {result && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            {result.sucesso
              ? <><CheckCircle size={20} color="#22c55e" /><strong style={{ color: "#16a34a" }}>Nota processada com sucesso</strong></>
              : <><XCircle size={20} color="#ef4444" /><strong style={{ color: "#dc2626" }}>Falha na extração</strong></>
            }
            {result.confianca != null && (
              <span style={{ marginLeft: "auto", fontSize: 13, color: "#64748b" }}>
                Confiança: {(result.confianca * 100).toFixed(0)}%
                <div className="conf-bar" style={{ width: 80 }}>
                  <div className="conf-fill" style={{ width: `${result.confianca * 100}%`,
                    background: result.confianca > 0.7 ? "#22c55e" : result.confianca > 0.4 ? "#f59e0b" : "#ef4444"
                  }} />
                </div>
              </span>
            )}
          </div>

          {result.nota && (
            <>
              <div className="result-grid">
                {[
                  ["Fornecedor", result.nota.fornecedor],
                  ["Número NF", result.nota.numero_nf],
                  ["Data Emissão", result.nota.data_emissao],
                  ["Valor Total", result.nota.valor_total != null ? `R$ ${result.nota.valor_total.toFixed(2)}` : "—"],
                  ["Forma de Pagamento", FORMA_LABEL[result.nota.forma_pagamento] || "—"],
                  ["Chave de Acesso", result.nota.chave_acesso],
                ].map(([label, val]) => (
                  <div className="result-field" key={label}>
                    <label>{label}</label>
                    <p>{val || "—"}</p>
                  </div>
                ))}
              </div>

              {result.nota.itens?.length > 0 && (
                <>
                  <div className="section-title">Itens ({result.nota.itens.length})</div>
                  <div className="table-wrap items-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Descrição</th>
                          <th>Qtd</th>
                          <th>Un</th>
                          <th>Vl. Unit.</th>
                          <th>Vl. Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.nota.itens.map((item) => (
                          <tr key={item.id}>
                            <td>{item.descricao}</td>
                            <td>{item.quantidade ?? "—"}</td>
                            <td>{item.unidade ?? "—"}</td>
                            <td>{item.valor_unitario != null ? `R$ ${item.valor_unitario.toFixed(2)}` : "—"}</td>
                            <td>{item.valor_total != null ? `R$ ${item.valor_total.toFixed(2)}` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => navigate(`/notas/${result.nota.id}`)}>
                  Ver detalhes e aplicar rateio →
                </button>
              </div>
            </>
          )}

          {result.erro && <p style={{ color: "#dc2626" }}>{result.erro}</p>}
        </div>
      )}
    </>
  );
}
