import { useState } from "react";
import { ScanLine, KeyRound } from "lucide-react";
import { setApiKey } from "../api";

export default function LoginPage({ onLogin }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/notas/", {
        headers: { "X-API-Key": key.trim() },
      });
      if (res.status === 401) {
        setError("Chave inválida. Verifique e tente novamente.");
      } else {
        setApiKey(key.trim());
        onLogin();
      }
    } catch {
      setError("Não foi possível conectar à API. Verifique se ela está rodando.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f0f2f5",
    }}>
      <div style={{ width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
            <ScanLine size={28} color="#0ea5e9" />
            <span style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>NF <span style={{ color: "#38bdf8" }}>Scanner</span></span>
          </div>
          <p style={{ color: "#64748b", fontSize: 14 }}>Informe a API Key para continuar</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
              <KeyRound size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
              API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Sua chave de acesso"
              autoFocus
              style={{
                width: "100%", padding: "10px 12px",
                border: "1px solid #e2e8f0", borderRadius: 8,
                fontSize: 14, marginBottom: 12, outline: "none",
              }}
            />

            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!key.trim() || loading}
              style={{ width: "100%", justifyContent: "center", padding: "10px" }}
            >
              {loading ? <span className="spinner" /> : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
