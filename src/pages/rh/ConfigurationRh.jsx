import React, { useState } from "react";
import { getHrConfiguration } from "../../utils/rhApi";
import Spinner from "../../components/commun/Spinner";

export default function ConfigurationRh() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    workflowRules: [],
    countryRules: [],
    leaveTypes: [],
    integration: {},
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getHrConfiguration());
    } catch {
      setError("Impossible de charger la configuration RH.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold text-slate-900 fade-in-up">Configuration RH</h1>
        <p className="mt-3 text-sm text-slate-600 fade-in-up" style={{ animationDelay: "0.05s" }}>
          Workflow rules, country rules, leave types et intégration Dolibarr.
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 hover:shadow-lg transition-all"
            disabled={loading}
          >
            Charger la configuration
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-red-500 mt-0.5">⚠️</div>
              <div className="text-sm font-medium text-red-700">{error}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-8">
            <Spinner size={3} />
          </div>
        ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 fade-in-up">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Workflow Rules</h2>
            <div className="mt-3 space-y-2 text-sm">
              {data.workflowRules.length === 0 && <div className="text-slate-500">Aucune règle.</div>}
              {data.workflowRules.map((rule) => (
                <div key={rule.id || rule.code} className="rounded-xl border border-slate-100 p-3">
                  <div className="font-semibold text-slate-800">{rule.code}</div>
                  <div className="text-slate-500">Country: {rule.country}</div>
                  <div className="text-slate-500">Steps: {(rule.steps || []).length}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Country Rules</h2>
            <div className="mt-3 max-h-64 overflow-auto text-sm">
              {data.countryRules.length === 0 && <div className="text-slate-500">Aucune règle.</div>}
              {data.countryRules.map((rule, idx) => (
                <div key={`${rule.countryCode}-${rule.leaveCode}-${idx}`} className="border-b border-slate-100 py-2">
                  {rule.countryCode} - {rule.label || rule.leaveCode}:{" "}
                  <span className="font-semibold">{rule.annualQuota}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Leave Types</h2>
            <div className="mt-3 max-h-64 overflow-auto text-sm">
              {data.leaveTypes.length === 0 && <div className="text-slate-500">Aucun type.</div>}
              {data.leaveTypes.map((lt) => (
                <div key={lt.id || lt.code} className="border-b border-slate-100 py-2">
                  {lt.code} - {lt.libelle} ({lt.annualQuota ?? lt.delai ?? 0})
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Integration Settings</h2>
            <div className="mt-3 text-sm text-slate-700">
              <div>Status: {data.integration?.dolibarrStatus || "-"}</div>
              <div>Endpoint: {data.integration?.endpoint || "-"}</div>
              <div>API only: {String(data.integration?.apiOnly ?? true)}</div>
            </div>
          </section>
        </div>
        )}
      </div>
    </div>
  );
}
