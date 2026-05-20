import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await login(email.trim(), senha);
    } catch (err) {
      setErro(err?.response?.data?.detail || "Email ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg, #0f1f08 0%, #1a3a10 60%, #0f1f08 100%)",
    }}>
      <div style={{ width: 360, padding: "0 16px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg, #5bae30, #3d8a18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", boxShadow: "0 4px 20px rgba(91,174,48,0.4)",
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 32, fontFamily: "serif" }}>G</span>
          </div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "0.05em" }}>
            Gestão de Fazendas
          </h1>
          <p style={{ color: "#7acc3a", fontSize: 12, marginTop: 4, letterSpacing: "0.15em" }}>
            AGRICULTURA &amp; GESTÃO
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: "32px 28px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}>
          <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
            Entrar na plataforma
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoFocus
                required
                style={{
                  width: "100%", padding: "10px 12px", boxSizing: "border-box",
                  border: "1px solid #e2e8f0", borderRadius: 8,
                  fontSize: 14, outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%", padding: "10px 12px", boxSizing: "border-box",
                  border: "1px solid #e2e8f0", borderRadius: 8,
                  fontSize: 14, outline: "none",
                }}
              />
            </div>

            {erro && (
              <div style={{
                background: "#fee2e2", color: "#b91c1c", borderRadius: 8,
                padding: "10px 14px", fontSize: 13, marginBottom: 16,
              }}>
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !senha}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, background: "#5bae30", color: "#fff", border: "none",
                borderRadius: 8, padding: "12px", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <span className="spinner" /> : (<>Entrar <ArrowRight size={16} /></>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
