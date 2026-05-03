import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authcontext";
import GlobalWorkCalendar from "../../components/calendar/GlobalWorkCalendar";
import { normalizeCountryIsoForHr } from "../../utils/country";

export default function EmployeeCalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const country = normalizeCountryIsoForHr(user?.country) || "TN";

  if (!user?.id) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <p className="text-sm text-slate-600">Chargement de la session…</p>
      </div>
    );
  }

  return (
    <GlobalWorkCalendar
      variant="employee"
      employeeId={user.id}
      employeeCountryIso={country}
      topSlot={
        <button
          type="button"
          onClick={() => navigate("/employee/dashboard")}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Retour tableau de bord
        </button>
      }
    />
  );
}
