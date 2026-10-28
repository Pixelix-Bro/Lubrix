import { Layers, Plus, Trash2, Warehouse } from 'lucide-react';
import { useSelector } from 'react-redux';

/**
 * InventoryTab — Mahsulot Kategoriyalari va Ombor Sozlamalari
 */
export default function InventoryTab({
  categories,
  newCategoryName,
  setNewCategoryName,
  onAddCategory,
  onDeleteCategory,
  orgData,
  setOrgData,
}) {
  const theme = useSelector((s) => s.themes.theme);

  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition ${
    theme
      ? 'border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-primary/50'
      : 'border-gray-200 bg-white text-gray-900 focus:border-primary/50'
  }`;

  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-2xl border ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Layers size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold font-[title]">Mahsulot Kategoriyalari</h3>
            <p className="text-xs text-gray-400">Yog‘lar, filtrlar va ehtiyot qismlar toifalari</p>
          </div>
        </div>

        <form onSubmit={onAddCategory} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Yangi toifa nomi (masalan: Tormoz suyuqliklari)"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={!newCategoryName.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white text-xs font-semibold shrink-0 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Plus size={16} /> Qo‘shish
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {categories.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Kategoriyalar mavjud emas</p>
          ) : (
            categories.map((c) => (
              <div
                key={c._id || c.id || c.name}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                  theme ? 'border-white/10 bg-white/5 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              >
                <span>{c.name}</span>
                <button
                  type="button"
                  onClick={() => onDeleteCategory(c._id || c.id)}
                  className="text-gray-400 hover:text-rose-400 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`p-5 rounded-2xl border ${theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="flex items-center gap-2.5 mb-3">
          <Warehouse size={18} className="text-primary" />
          <h4 className="text-sm font-bold font-[title]">Ombor Ogohlantirish Chegarasi</h4>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Mahsulot qoldig‘i ushbu miqdordan kamaysa, tizim avtomatik ravishda ogohlantiradi
        </p>
        <div className="max-w-xs">
          <input
            type="number"
            value={orgData.settings?.lowStockThreshold || 10}
            onChange={(e) =>
              setOrgData((p) => ({
                ...p,
                settings: { ...p.settings, lowStockThreshold: Number(e.target.value) },
              }))
            }
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}
