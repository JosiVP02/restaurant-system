import { useNavigate } from "react-router-dom";
import { getMobileServer } from "../../services/mobileApi";

export default function MobileHome() {
  const navigate = useNavigate();
  const servidor = getMobileServer();

  if (!servidor) {
    navigate("/mobile/config");
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <h1>POSKEY Mobile</h1>
      <p style={{ color: "#64748b" }}>{servidor}</p>

      <button onClick={() => navigate("/mobile/mesas")} style={btn}>
        📋 Mesas
      </button>

      <button onClick={() => navigate("/mobile/cocina")} style={btn}>
        🍳 Cocina
      </button>

      <button onClick={() => navigate("/mobile/config")} style={btnSec}>
        ⚙️ Cambiar servidor
      </button>
    </div>
  );
}

const btn: React.CSSProperties = {
  width: "100%",
  padding: 22,
  borderRadius: 18,
  border: "none",
  background: "#16a34a",
  color: "white",
  fontSize: 22,
  fontWeight: 800,
  marginTop: 16,
};

const btnSec: React.CSSProperties = {
  width: "100%",
  padding: 16,
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 700,
  marginTop: 16,
};