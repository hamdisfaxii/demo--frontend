import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authcontext";

export default function Navbar() {
  const { isEmployee, isRH, logout } = useAuth();
  const homePath = isEmployee ? "/employee/dashboard" : "/home";

  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-slate-700 bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold text-white">📅 Congés</div>
        <div className="text-xs text-slate-400 font-medium">
          {isEmployee && "Employé"}
          {isRH && "Responsable RH"}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link
          to={homePath}
          className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200 font-medium"
        >
          Accueil
        </Link>
        {isRH && (
          <Link
            to="/rh/dashboard"
            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200 font-medium"
          >
            Dashboard RH
          </Link>
        )}
        {isRH && (
          <Link
            to="/rh/decisions"
            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200 font-medium"
          >
            Décisions RH
          </Link>
        )}
        {isRH && (
          <Link
            to="/rh/requests"
            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200 font-medium"
          >
            Demandes
          </Link>
        )}
        {isRH && (
          <Link
            to="/rh/calendar"
            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200 font-medium"
          >
            Calendrier
          </Link>
        )}
        {isRH && (
          <Link
            to="/rh/configuration"
            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200 font-medium"
          >
            Configuration
          </Link>
        )}
        {isRH && (
          <Link
            to="/rh/jours-feries"
            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200 font-medium"
          >
            Jours fériés
          </Link>
        )}

        <button
          type="button"
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 hover:shadow-lg transition-all duration-200"
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}
