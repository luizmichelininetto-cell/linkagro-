import { useNavigate } from "react-router-dom";
import { ScanLine, FileText, BarChart2, Download, ArrowRight } from "lucide-react";
import { LMAgroEmblem } from "../components/LMAgroLogo";

const features = [
  {
    icon: <ScanLine size={28} />,
    title: "Scanner de NF",
    desc: "Escaneie notas fiscais em PDF ou foto. Extração automática por IA.",
  },
  {
    icon: <FileText size={28} />,
    title: "Contas a Pagar",
    desc: "Controle vencimentos, status de pagamento e alertas de atraso.",
  },
  {
    icon: <BarChart2 size={28} />,
    title: "Painel Financeiro",
    desc: "Visão geral de gastos por centro de custo, evolução mensal e KPIs.",
  },
  {
    icon: <Download size={28} />,
    title: "Exportação",
    desc: "Exporte seus dados em Excel ou CSV com rateio por centro de custo.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#0f1f08", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Hero */}
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "40px 24px",
        background: "linear-gradient(160deg, #0f1f08 0%, #1a3a10 50%, #0f1f08 100%)",
      }}>
        <LMAgroEmblem size={120} dashColor="#7acc3a" letterColor="#4a9420" />

        <h1 style={{
          marginTop: 24, fontSize: "clamp(32px, 8vw, 56px)", fontWeight: 900,
          letterSpacing: "0.12em", color: "#fff",
          textShadow: "0 2px 20px rgba(90,174,48,0.4)",
        }}>
          L.M. AGRO
        </h1>
        <p style={{
          fontSize: "clamp(11px, 3vw, 14px)", letterSpacing: "0.22em",
          color: "#7acc3a", fontWeight: 600, marginTop: 4,
        }}>
          AGRICULTURA &amp; GESTÃO
        </p>

        <p style={{
          marginTop: 28, fontSize: "clamp(16px, 4vw, 22px)", color: "#a3c98a",
          maxWidth: 480, lineHeight: 1.6, fontWeight: 400,
        }}>
          Gestão inteligente de notas fiscais e finanças para o campo.
        </p>

        <button
          onClick={() => navigate("/app")}
          style={{
            marginTop: 40, display: "inline-flex", alignItems: "center", gap: 10,
            background: "#5bae30", color: "#fff", border: "none", borderRadius: 50,
            padding: "16px 36px", fontSize: 17, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 24px rgba(91,174,48,0.5)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseOver={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          Acessar o Sistema <ArrowRight size={20} />
        </button>

        <p style={{ marginTop: 16, fontSize: 13, color: "#4a7a30" }}>
          Disponível no navegador · instale como app
        </p>
      </div>

      {/* Features */}
      <div style={{ background: "#111d0a", padding: "64px 24px" }}>
        <h2 style={{
          textAlign: "center", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700,
          color: "#c8e6a0", marginBottom: 40, letterSpacing: "0.05em",
        }}>
          Tudo que você precisa
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20, maxWidth: 900, margin: "0 auto",
        }}>
          {features.map((f) => (
            <div key={f.title} style={{
              background: "#1a2e0e", borderRadius: 16, padding: "28px 24px",
              border: "1px solid #2a4a18",
            }}>
              <div style={{ color: "#7acc3a", marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: "#e8f5d8" }}>{f.title}</div>
              <div style={{ fontSize: 14, color: "#7a9a60", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA bottom */}
      <div style={{
        background: "#1a3a10", padding: "56px 24px", textAlign: "center",
      }}>
        <p style={{ fontSize: "clamp(18px, 4vw, 24px)", color: "#c8e6a0", marginBottom: 28, fontWeight: 600 }}>
          Pronto para começar?
        </p>
        <button
          onClick={() => navigate("/app")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "#5bae30", color: "#fff", border: "none", borderRadius: 50,
            padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer",
          }}
        >
          Entrar no Sistema <ArrowRight size={18} />
        </button>
      </div>

      {/* Footer */}
      <div style={{
        background: "#0a1406", padding: "24px", textAlign: "center",
        fontSize: 13, color: "#3a5a28",
      }}>
        © {new Date().getFullYear()} L.M. Agro · Agricultura &amp; Gestão
      </div>
    </div>
  );
}
