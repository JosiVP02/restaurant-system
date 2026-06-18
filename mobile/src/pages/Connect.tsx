
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { refreshApi } from "../services/api";
import { useServer } from "../context/ServerContext";



export default function Connect() {
  const navigate = useNavigate();

const [url, setUrl] = useState(
  localStorage.getItem("poskey_server") ??
  `http://${window.location.hostname}:8000`
);

  const { setServerUrl } = useServer();




  const [estado, setEstado] = useState("");

  async function probarConexion() {
    try {
      await axios.get(`${url}/mesas`);
      setEstado("✅ Conexión exitosa");
    } catch {
      setEstado("❌ No se pudo conectar");
    }
  }

function entrar() {
  setServerUrl(url);

  refreshApi();

  navigate("/mesas", {
    replace: true,
  });
}



  return (
    <div style={{
      minHeight: "100vh",
      background: "#f1f5f3",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "white",
        borderRadius: 20,
        padding: 28,
        boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
      }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>POSKEY Mobile</h1>
        <p style={{ color: "#64748b" }}>Conectar con servidor POSKEY</p>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: "1px solid #cbd5e1",
            fontSize: 15,
            boxSizing: "border-box",
          }}
        />

        <button onClick={probarConexion} style={btnSec}>
          Probar conexión
        </button>

        {estado && <p>{estado}</p>}

        <button onClick={entrar} style={btnMain}>
          Entrar
        </button>
      </div>
    </div>
  );
}

const btnMain: React.CSSProperties = {
  width: "100%",
  marginTop: 12,
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: "#16a34a",
  color: "white",
  fontWeight: 800,
  fontSize: 15,
};

const btnSec: React.CSSProperties = {
  width: "100%",
  marginTop: 14,
  padding: 14,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  fontWeight: 700,
  fontSize: 15,
};