import { Camera, CheckCircle2, Loader2, Save, Video } from 'lucide-react';
import { useSelector } from 'react-redux';

/**
 * CameraTab — ANPR Avtomatik Raqam Tanuvchi Kamera Sozlamalari
 */
export default function CameraTab({ cameraSettings, setCameraSettings, onSave, saving }) {
  const theme = useSelector((s) => s.themes.theme);

  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition ${
    theme
      ? 'border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-primary/50'
      : 'border-gray-200 bg-white text-gray-900 focus:border-primary/50'
  }`;

  const labelCls = `block text-xs font-semibold mb-1 ${theme ? 'text-gray-300' : 'text-gray-600'}`;

  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-2xl border ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Camera size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold font-[title]">Yo‘lak Kirish Kamerasi (ANPR)</h3>
            <p className="text-xs text-gray-400">Avtomobil servis yo‘lagiga kirganda davlat raqamini avtomatik aniqlash</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Kamera Nomi</label>
              <input
                type="text"
                value={cameraSettings.cameraName || ''}
                onChange={(e) => setCameraSettings((p) => ({ ...p, cameraName: e.target.value }))}
                className={inputCls}
                placeholder="1-Yo‘lak Kirish Kamerasi"
              />
            </div>
            <div>
              <label className={labelCls}>RTSP / WebRTC Stream URL</label>
              <input
                type="text"
                value={cameraSettings.streamUrl || ''}
                onChange={(e) => setCameraSettings((p) => ({ ...p, streamUrl: e.target.value }))}
                className={inputCls}
                placeholder="rtsp://admin:pass@192.168.1.50:554/live"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Raqam Aniqlanganda Amal</label>
              <select
                value={cameraSettings.actionOnDetect || 'OPEN_SERVICE'}
                onChange={(e) => setCameraSettings((p) => ({ ...p, actionOnDetect: e.target.value }))}
                className={inputCls}
              >
                <option value="OPEN_SERVICE">To‘g‘ridan-to‘g‘ri Yangi Xizmat Oynasini Ochish</option>
                <option value="NOTIFY_MASTER">Ustaga Bildirishnoma Yuborish</option>
                <option value="RECORD_ONLY">Faqat Jurnalga Yozish (Log)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Minimal Aniqlik Ishonchi (%)</label>
              <input
                type="number"
                min="50"
                max="99"
                value={cameraSettings.minConfidence || 85}
                onChange={(e) => setCameraSettings((p) => ({ ...p, minConfidence: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
          </div>

          <div
            className={`flex items-center justify-between p-3.5 rounded-xl border ${
              theme ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <div>
              <p className="text-xs font-semibold">Avtomatik ANPR rejimini yoqish</p>
              <p className={`text-[11px] mt-0.5 ${theme ? 'text-gray-400' : 'text-gray-500'}`}>
                Kamera oqimidan davlat raqamlarini doimiy skanerlab borish
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCameraSettings((p) => ({ ...p, autoANPR: !p.autoANPR }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                cameraSettings.autoANPR ? 'bg-primary' : theme ? 'bg-white/20' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  cameraSettings.autoANPR ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white text-sm font-semibold transition"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Kamera Sozlamalarini Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}
