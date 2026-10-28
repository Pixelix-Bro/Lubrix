import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';

/**
 * BillingTab — To'lov Kartalari & Tranzaksiyalar
 */
export default function BillingTab({
  cards, newCard, setNewCard,
  onAddCard, onDeleteCard,
  transactions, invoices,
  saving, authUser,
}) {
  const theme = useSelector((s) => s.themes.theme);

  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition ${
    theme
      ? 'border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-primary/50'
      : 'border-gray-200 bg-white text-gray-900 focus:border-primary/50'
  }`;

  const isOwner = authUser?.role === 'OWNER';

  return (
    <div className="space-y-6">
      {/* To'lov kartalari */}
      <div>
        <h3 className="text-sm font-bold font-[title] flex items-center gap-2 mb-4">
          <CreditCard size={15} className="text-primary" />
          Terminal & To'lov Kartalari
        </h3>

        {/* Kartalar ro'yxati */}
        <div className="space-y-2 mb-4">
          {cards.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Hali karta qo'shilmagan</p>
          ) : (
            cards.map((card) => (
              <div
                key={card._id || card.id}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  theme ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">{card.cardHolder}</p>
                  <p className="text-xs text-gray-400 font-mono">{card.cardNumberMasked}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-primary font-mono`}>
                    {card.cardType}
                  </span>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => onDeleteCard(card._id || card.id)}
                    className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Yangi karta qo'shish — faqat OWNER */}
        {isOwner && (
          <form onSubmit={onAddCard} className={`p-4 rounded-xl border space-y-3 ${theme ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Yangi Karta Qo'shish</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" required placeholder="Karta egasi" value={newCard.cardHolder} onChange={(e) => setNewCard((p) => ({ ...p, cardHolder: e.target.value }))} className={inputCls} />
              <input type="text" required placeholder="8600 **** **** 1234" value={newCard.cardNumber} onChange={(e) => setNewCard((p) => ({ ...p, cardNumber: e.target.value }))} className={inputCls} />
              <select value={newCard.cardType} onChange={(e) => setNewCard((p) => ({ ...p, cardType: e.target.value }))} className={inputCls}>
                <option value="UZCARD">UZCARD</option>
                <option value="HUMO">HUMO</option>
                <option value="VISA">VISA</option>
                <option value="MASTERCARD">MASTERCARD</option>
              </select>
              <input type="text" placeholder="MM/YY" value={newCard.expiry} onChange={(e) => setNewCard((p) => ({ ...p, expiry: e.target.value }))} className={inputCls} />
              <input type="text" placeholder="Bank nomi (ixtiyoriy)" value={newCard.bankName} onChange={(e) => setNewCard((p) => ({ ...p, bankName: e.target.value }))} className={inputCls} />
              <input type="text" placeholder="Terminal ID (ixtiyoriy)" value={newCard.terminalId} onChange={(e) => setNewCard((p) => ({ ...p, terminalId: e.target.value }))} className={inputCls} />
            </div>
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-blue-600 transition"
            >
              <Plus size={14} /> Karta Qo'shish
            </button>
          </form>
        )}

        {!isOwner && (
          <p className="text-xs text-amber-400 italic">
            To'lov kartalarini faqat Mulkdor (OWNER) boshqara oladi
          </p>
        )}
      </div>

      {/* So'nggi tranzaksiyalar */}
      {transactions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold font-[title] mb-3">So'nggi Tranzaksiyalar</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className={`border-b ${theme ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                <tr>
                  <th className="py-2 text-left">Sana</th>
                  <th className="py-2 text-left">Mijoz</th>
                  <th className="py-2 text-left">Usul</th>
                  <th className="py-2 text-right">Summa</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme ? 'divide-white/5' : 'divide-gray-100'}`}>
                {transactions.slice(0, 10).map((tx) => (
                  <tr key={tx._id || tx.id}>
                    <td className="py-2 text-gray-400">{new Date(tx.createdAt).toLocaleDateString('uz-UZ')}</td>
                    <td className="py-2">{tx.customerName || '—'}</td>
                    <td className="py-2"><span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-primary font-mono">{tx.provider}</span></td>
                    <td className="py-2 text-right font-bold text-emerald-400 font-mono">{(tx.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
