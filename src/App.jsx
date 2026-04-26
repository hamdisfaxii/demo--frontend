import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/authcontext";
import Login from "./pages/login";
import Home from "./pages/home";
import Navbar from "./components/navbar";
import DashboardEmploye from "./pages/employee/DashboardEmploye";
import NouvelleDemande from "./pages/employee/NouvelleDemande";
import NouvelleDemandeRetard from "./pages/employee/NouvelleDemandeRetard";
import NouvelleSortieCourteDuree from "./pages/employee/NouvelleSortieCourteDuree";
import HistoriqueDemandes from "./pages/employee/HistoriqueDemandes";
import DetailDemande from "./pages/employee/DetailDemande";
import JoursFeries from "./pages/rh/JoursFeries";
import DecisionModule from "./pages/rh/DecisionModule";
import HrDashboard from "./pages/rh/HrDashboard";
import RequestsList from "./pages/rh/RequestsList";
import RequestDetailsRh from "./pages/rh/RequestDetailsRh";
import CalendarRh from "./pages/rh/CalendarRh";
import ConfigurationRh from "./pages/rh/ConfigurationRh";

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#F9FAFB]">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}

export default App;

function AppRoutes() {
  const { loading, isAuthenticated, isEmployee, isRH } = useAuth();

  // Eviter de rediriger pendant le chargement de session.
  if (loading) return null;

  return (
    <>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={isRH ? "/rh/dashboard" : "/employee/dashboard"}
              replace
            />
          }
        />
        <Route path="/login" element={<Login />} />

        <Route path="/home" element={<Home />} />
        <Route
          path="/rh/dashboard"
          element={
           
              <HrDashboard />
           
          }
        />
        <Route
          path="/rh/jours-feries"
          element={
            
              <JoursFeries />
        
          }
        />
        <Route
          path="/rh/requests"
          element={
           
              <RequestsList />
           
          }
        />
        <Route
          path="/rh/requests/:id"
          element={
            
              <RequestDetailsRh />
            
          }
        />
        <Route
          path="/rh/calendar"
          element={
        
            
              <CalendarRh />
           
          }
        />
        <Route
          path="/rh/configuration"
          element={
            
              <ConfigurationRh />
          
          }
        />
        <Route
          path="/rh/decisions"
          element={
            
              <DecisionModule />
           
          }
        />

        <Route path="/employee/dashboard" element={<DashboardEmploye />} />
        <Route path="/employee/conge/new" element={<NouvelleDemande />} />
        <Route path="/employee/teletravail/new" element={<NouvelleDemande />} />
        <Route
          path="/employee/sortie/new"
          element={<NouvelleSortieCourteDuree />}
        />
        <Route
          path="/employee/retard/new"
          element={<NouvelleDemandeRetard />}
        />
        <Route path="/employee/historique" element={<HistoriqueDemandes />} />
        <Route
          path="/employee/demande/:id"
          element={
            <RequireEmployee>
              <DetailDemande />
            </RequireEmployee>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function RequireEmployee({ children }) {
  const { loading, isAuthenticated, isEmployee } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isEmployee) return <Navigate to="/rh/dashboard" replace />;

  return children;
}

function RequireRH({ children }) {
  const { loading, isAuthenticated, isRH } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isRH) return <Navigate to="/employee/dashboard" replace />;
  return children;
}
