import React from "react";
import { useNavigate } from "react-router-dom";

export default function CarteAction({
  titre,
  description,
  boutonTexte,
  onClick,
  icone,
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (typeof onClick === "function") return onClick();
    // Si onClick n'est pas fourni mais icone/boutonTexte n'est pas, on laisse vide.
    if (typeof onClick !== "function") return;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex flex-col fade-in-up hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        {icone && (
          <div className="w-12 h-12 rounded-xl bg-blue-100 grid place-items-center flex-shrink-0">
            {icone}
          </div>
        )}
        {!icone && (
          <div className="w-12 h-12 rounded-xl bg-slate-100 grid place-items-center flex-shrink-0">
            <div className="text-lg">✨</div>
          </div>
        )}
      </div>

      <div className="flex-1">
        <h2 className="text-xl font-bold text-slate-900">{titre}</h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          if (typeof onClick === "function") onClick();
          else navigate("#");
        }}
        className="mt-6 w-full rounded-xl bg-blue-600 text-white font-semibold py-3 px-4 hover:bg-blue-700 hover:shadow-md hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
      >
        {boutonTexte}
      </button>
    </div>
  );
}
