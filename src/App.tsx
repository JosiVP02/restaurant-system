import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";
import CuentaMesa from "./pages/CuentaMesa";
import Sidebar from "./components/Sidebar";

import Mesas from "./pages/Mesas";
import Productos from "./pages/Productos";
import Cocina from "./pages/Cocina";

import Ventas from "./pages/Ventas";

import Configuracion from "./pages/Configuracion";

import CierreTurno from "./pages/CierreTurno";   






function App() {


  return (
    <BrowserRouter>
      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden"
        }}
      >
        <Sidebar />

        <div
          style={{
            flex: 1,
            padding: "20px",
            overflow: "hidden"
          }}
        >
          <Routes>
            <Route
              path="/"
              element={<Ventas />}
            />

            <Route
              path="/mesas"
              element={<Mesas />}
            />

            <Route
              path="/productos"
              element={<Productos />}
            />

            <Route
              path="/cuenta/:mesaId"
              element={<CuentaMesa />}
            />

            <Route
              path="/cocina"
              element={<Cocina />}
            />
              <Route
              path="/configuracion"
              element={<Configuracion />}
            />


            <Route path="/cierre" element={<CierreTurno />} />



          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
export default App;