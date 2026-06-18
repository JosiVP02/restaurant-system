// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ServerProvider } from "./context/ServerContext";
import BottomNav from "./components/BottomNav";
import Connect from "./pages/Connect";
import Mesas from "./pages/Mesas";
import CuentaMesa from "./pages/CuentaMesa";
import Cocina from "./pages/Cocina";

export default function App() {
  return (
    <ServerProvider>
      <BrowserRouter basename="/mobile">
        <div className="app-shell">
          <Routes>
            <Route path="/" element={<Navigate to="/mesas" replace />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/mesas" element={<Mesas />} />
            <Route path="/cuenta/:mesaId" element={<CuentaMesa />} />
            <Route path="/cocina" element={<Cocina />} />
            <Route path="*" element={<Navigate to="/mesas" replace />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </ServerProvider>
  );
}