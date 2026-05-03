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
import EmployeeCalendarPage from "./pages/employee/EmployeeCalendarPage";
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
      {isAuthenticated && <Navbar />}
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
            <RequireRH>
              <HrDashboard />
            </RequireRH>
          }
        />
        <Route
          path="/rh/jours-feries"
          element={
            <RequireRH>
              <JoursFeries />
            </RequireRH>
          }
        />
        <Route
          path="/rh/requests"
          element={
            <RequireRH>
              <RequestsList />
            </RequireRH>
          }
        />
        <Route
          path="/rh/requests/:id"
          element={
            <RequireRH>
              <RequestDetailsRh />
            </RequireRH>
          }
        />
        <Route
          path="/rh/calendar"
          element={
            <RequireRH>
              <CalendarRh />
            </RequireRH>
          }
        />
        <Route
          path="/rh/configuration"
          element={
            <RequireRH>
              <ConfigurationRh />
            </RequireRH>
          }
        />
        <Route
          path="/rh/decisions"
          element={
            <RequireRH>
              <DecisionModule />
            </RequireRH>
          }
        />

        <Route
          path="/employee/dashboard"
          element={
            <RequireEmployee>
              <DashboardEmploye />
            </RequireEmployee>
          }
        />
        <Route
          path="/employee/conge/new"
          element={
            <RequireEmployee>
              <NouvelleDemande />
            </RequireEmployee>
          }
        />
        <Route
          path="/employee/teletravail/new"
          element={
            <RequireEmployee>
              <NouvelleDemande />
            </RequireEmployee>
          }
        />
        <Route
          path="/employee/sortie/new"
          element={
            <RequireEmployee>
              <NouvelleSortieCourteDuree />
            </RequireEmployee>
          }
        />
        <Route
          path="/employee/retard/new"
          element={
            <RequireEmployee>
              <NouvelleDemandeRetard />
            </RequireEmployee>
          }
        />
        <Route
          path="/employee/historique"
          element={
            <RequireEmployee>
              <HistoriqueDemandes />
            </RequireEmployee>
          }
        />
        <Route
          path="/employee/calendar"
          element={
            <RequireEmployee>
              <EmployeeCalendarPage />
            </RequireEmployee>
          }
        />
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
