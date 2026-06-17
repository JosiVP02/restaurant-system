import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setMobileServer, recargarMobileApi } from "../../services/mobileApi";

export default function MobileConfig() {
  const navigate = useNavigate();

  const [url, setUrl] = useState(
    localStorage.getItem("poskey_server") || ""
  );

  function guardar() {
    if (!url.startsWith("http://")) {
      alert("La URL debe iniciar con http://");
      return;
    }

    setMobileServer(url);
    recargarMobileApi();
    navigate("/mobile");
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <h1>POSKEY Mobile</h1>
      <p>Conectar con servidor POSKEY</p>

      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="http://192.168.0.15:8000"
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 12,
          border: "1px solid #cbd5e1",
          fontSize: 16,
          boxSizing: "border-box",
          marginTop: 16,
        }}
      />

      <button
        onClick={guardar}
        style={{
          width: "100%",
          marginTop: 16,
          padding: 14,
          borderRadius: 12,
          border: "none",
          background: "#16a34a",
          color: "white",
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        Guardar conexión
      </button>
    </div>
  );
}