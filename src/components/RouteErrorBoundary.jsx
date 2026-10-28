import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  console.error('[Lubrix Route Error]', error);

  const errorMessage = error?.statusText || error?.message || 'Kutilmagan xatolik yuz berdi';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3 text-amber-400 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Kutilmagan Xatolik Yuz Berdi</h2>
            <p className="text-xs text-slate-400">Lubrix tizimi operatsiyani yakunlay olmadi</p>
          </div>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300 font-mono mb-6 break-words">
          {errorMessage}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition"
          >
            <RefreshCw size={16} />
            <span>Sahifani yangilash</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
          >
            <Home size={16} />
            <span>Bosh sahifaga</span>
          </button>
        </div>

        {error?.stack && (
          <details className="mt-6 text-[11px] text-slate-500 border-t border-white/5 pt-4">
            <summary className="cursor-pointer hover:text-slate-400">Texnik ma’lumotlar (Developer)</summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/40 p-2 font-mono text-[10px] text-slate-400 whitespace-pre-wrap">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
