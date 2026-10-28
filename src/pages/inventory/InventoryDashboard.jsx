import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Package, 
  Warehouse, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Search, 
  Filter, 
  Truck, 
  TrendingUp, 
  ShieldAlert, 
  ArrowRightLeft, 
  History, 
  Layers,
  Barcode,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { lubrixApi } from '../../services/api';
import { lubrixSocket } from '../../services/socket';

export default function InventoryDashboard() {
  const theme = useSelector((state) => state.themes.theme);
  const [activeTab, setActiveTab] = useState('overview'); // overview | catalog | inventory | operations | movements | suppliers | purchases
  const [dashboardData, setDashboardData] = useState(null);
  const [products, setProducts] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Form states: New Product
  const [newProdName, setNewProdName] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('Castrol');
  const [newProdCategory, setNewProdCategory] = useState('Engine Oil');
  const [newProdOilType, setNewProdOilType] = useState('Synthetic');
  const [newProdViscosity, setNewProdViscosity] = useState('5W-30');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdStandards, setNewProdStandards] = useState('API SP, ACEA C3');
  const [newProdSizes, setNewProdSizes] = useState('1L, 4L, 208L');

  // Form states: Stock Operation
  const [opBranchId, setOpBranchId] = useState('br-01');
  const [opProductId, setOpProductId] = useState('');
  const [opType, setOpType] = useState('STOCK_IN'); // STOCK_IN | STOCK_OUT | ADJUSTMENT
  const [opQuantity, setOpQuantity] = useState('10');
  const [opPurchasePrice, setOpPurchasePrice] = useState('110000');
  const [opSellingPrice, setOpSellingPrice] = useState('155000');
  const [opReason, setOpReason] = useState('Partiya kirimi');

  // Form states: New Supplier
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('+99890');
  const [supBrands, setSupBrands] = useState('Castrol, Shell');

  const loadAll = async () => {
    try {
      setLoading(true);
      const [dashRes, prodRes, invRes, movRes, supRes, purRes, brRes] = await Promise.all([
        lubrixApi.getInventoryDashboard(selectedBranch),
        lubrixApi.getProducts({ search }),
        lubrixApi.getInventory({ branchId: selectedBranch }),
        lubrixApi.getStockMovements(selectedBranch),
        lubrixApi.getSuppliers(),
        lubrixApi.getPurchases(),
        lubrixApi.getBranches()
      ]);

      setDashboardData(dashRes.data.data);
      setProducts(prodRes.data.data);
      setInventoryList(invRes.data.data);
      setMovements(movRes.data.data);
      setSuppliers(supRes.data.data);
      setPurchases(purRes.data.data);
      setBranches(brRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const unsubInv = lubrixSocket.subscribe('inventory:updated', () => loadAll());
    const unsubProd = lubrixSocket.subscribe('product:created', () => loadAll());
    return () => {
      unsubInv();
      unsubProd();
    };
  }, [selectedBranch, search]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await lubrixApi.createProduct({
        name: newProdName,
        brand: newProdBrand,
        category: newProdCategory,
        oilType: newProdOilType,
        viscosity: newProdViscosity,
        barcode: newProdBarcode,
        standards: newProdStandards.split(',').map(s => s.trim()),
        packageSizes: newProdSizes.split(',').map(s => s.trim()),
      });
      setIsProductModalOpen(false);
      setNewProdName('');
      setNewProdBarcode('');
      loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStockOperation = async (e) => {
    e.preventDefault();
    if (!opProductId) return;
    try {
      await lubrixApi.performStockOperation({
        branchId: opBranchId,
        productId: opProductId,
        type: opType,
        quantity: Number(opQuantity),
        purchasePrice: Number(opPurchasePrice),
        sellingPrice: Number(opSellingPrice),
        reason: opReason
      });
      setIsStockModalOpen(false);
      setOpQuantity('10');
      loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      await lubrixApi.createSupplier({
        name: supName,
        contactPerson: supContact,
        phone: supPhone,
        brands: supBrands.split(',').map(b => b.trim())
      });
      setIsSupplierModalOpen(false);
      setSupName('');
      loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  const tabs = [
    { id: 'overview', label: '1. Dashboard', icon: TrendingUp },
    { id: 'catalog', label: '2. Moy Katalogi', icon: Package },
    { id: 'inventory', label: '4. Ombor Qoldiqlari', icon: Warehouse },
    { id: 'movements', label: '6. Harakatlar Tarixi', icon: History },
    { id: 'suppliers', label: '8. Yetkazib Beruvchilar', icon: Truck },
    { id: 'purchases', label: '9. Xarid Buyurtmalari', icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Mahsulotlar va Ombor Boshqaruvi</h1>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
              Lubrix Inventory Pro
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Moy katalogi, filiallararo ombor qoldiqlari, partiyalar kirimi va sarf monitoringi
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsStockModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-700 transition"
          >
            <ArrowRightLeft size={15} className="text-amber-500" />
            Kirim / Chiqim Amali
          </button>
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 transition"
          >
            <Plus size={16} />
            Yangi Mahsulot Qo'shish
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 overflow-x-auto scrollbar-none gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & DASHBOARD */}
      {activeTab === 'overview' && dashboardData && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`rounded-2xl border p-5 ${theme ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-medium">Jami Ombor Qiymati</span>
                <TrendingUp size={16} className="text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono">
                {Number(dashboardData.inventoryCostValue).toLocaleString()} so'm
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                Chakana sotish qiymati: {Number(dashboardData.inventoryRetailValue).toLocaleString()} so'm
              </p>
            </div>

            <div className={`rounded-2xl border p-5 ${theme ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-medium">Katalogdagi Mahsulotlar</span>
                <Package size={16} className="text-blue-400" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono">{dashboardData.totalProducts} turdagi</p>
              <p className="mt-1 text-[11px] text-emerald-500 font-medium">
                Jami {dashboardData.totalStockUnits} litr/dona zaxirada
              </p>
            </div>

            <div className={`rounded-2xl border p-5 ${theme ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-medium">Kam Qolgan Mahsulotlar</span>
                <AlertTriangle size={16} className="text-orange-400" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono text-orange-400">
                {dashboardData.lowStockCount} ta
              </p>
              <p className="mt-1 text-[11px] text-gray-400">Minimal me'yordan kamaygan</p>
            </div>

            <div className={`rounded-2xl border p-5 ${theme ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-medium">Yetkazib Beruvchilar</span>
                <Truck size={16} className="text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono">{suppliers.length} ta hamkor</p>
              <p className="mt-1 text-[11px] text-gray-400">Kutilayotgan buyurtmalar: {purchases.filter(p => p.status !== 'COMPLETED').length}</p>
            </div>
          </div>

          {/* Low Stock Warning Section */}
          {dashboardData.lowStockItems.length > 0 && (
            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
              <div className="flex items-center gap-2 text-orange-500 font-semibold text-sm">
                <ShieldAlert size={18} />
                <span>Diqqat! Zudlik bilan to'ldirilishi kerak bo'lgan zaxiralar</span>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {dashboardData.lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-zinc-900/60 p-3 border border-zinc-800">
                    <div>
                      <p className="font-semibold text-sm">{item.product?.name}</p>
                      <p className="text-xs text-gray-400">{item.product?.brand} · Qoldiq: <span className="text-orange-400 font-bold">{item.quantity} {item.unit}</span> (Min: {item.minStockLevel})</p>
                    </div>
                    <button
                      onClick={() => {
                        setOpProductId(item.productId);
                        setOpType('STOCK_IN');
                        setIsStockModalOpen(true);
                      }}
                      className="rounded-lg bg-orange-500/20 px-3 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-500 hover:text-black transition"
                    >
                      Kirim Qilish
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Movements Preview */}
          <div className={`overflow-hidden rounded-2xl border ${theme ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`}>
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-sm">So'nggi Ombor Harakatlari</h3>
              <button onClick={() => setActiveTab('movements')} className="text-xs text-amber-500 hover:underline">
                Barchasini ko'rish →
              </button>
            </div>
            <div className="divide-y divide-zinc-800 text-sm">
              {dashboardData.recentMovements.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <span className="font-medium">{m.product?.name}</span>
                    <span className="ml-2 text-xs text-gray-400">({m.reason})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs font-semibold ${m.quantityChanged > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                      {m.quantityChanged > 0 ? `+${m.quantityChanged}` : m.quantityChanged} L
                    </span>
                    <span className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OIL CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className={`relative flex-1 flex items-center rounded-xl border ${theme ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'} px-3.5 py-2.5`}>
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Moy nomi, brendi yoki shtrix kodi bo'yicha qidiruv..."
                className="ml-2.5 w-full bg-transparent text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between ${
                  theme ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
                      {p.brand}
                    </span>
                    <span className="font-mono text-xs text-gray-400">{p.viscosity}</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold">{p.name}</h3>
                  <p className="mt-1 text-xs text-gray-400 line-clamp-2">{p.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.standards?.map((s, idx) => (
                      <span key={idx} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-gray-300 font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-800/80 pt-3 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1 font-mono">
                    <Barcode size={14} className="text-gray-500" />
                    <span>{p.barcode || 'Kod yo‘q'}</span>
                  </div>
                  <button
                    onClick={() => {
                      setOpProductId(p.id);
                      setIsStockModalOpen(true);
                    }}
                    className="text-amber-500 hover:underline font-medium"
                  >
                    + Zaxira qo'shish
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MY INVENTORY (STOCK BY BRANCH) */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className={`overflow-hidden rounded-2xl border ${theme ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`}>
            <table className="w-full text-left text-sm">
              <thead className={`border-b ${theme ? 'border-zinc-800 bg-zinc-800/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                <tr>
                  <th className="px-6 py-4 font-semibold">Mahsulot</th>
                  <th className="px-6 py-4 font-semibold">Filial / Joylashuv</th>
                  <th className="px-6 py-4 font-semibold">Mavjud Qoldiq</th>
                  <th className="px-6 py-4 font-semibold">Tannarx / Sotish Narxi</th>
                  <th className="px-6 py-4 font-semibold">Holati</th>
                  <th className="px-6 py-4 font-semibold text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {inventoryList.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{item.product?.name}</div>
                      <div className="text-xs text-gray-400">{item.product?.brand} · {item.product?.viscosity}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{item.branchName}</div>
                      <div className="font-mono text-xs text-gray-500">Joy: {item.location}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      <span className={item.quantity <= item.minStockLevel ? 'text-orange-400' : 'text-emerald-400'}>
                        {item.quantity} {item.unit}
                      </span>
                      <span className="block text-[11px] font-normal text-gray-500">Min: {item.minStockLevel} {item.unit}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <div>Kirim: {Number(item.purchasePrice).toLocaleString()} so'm</div>
                      <div className="text-amber-500 font-semibold">Sotish: {Number(item.sellingPrice).toLocaleString()} so'm</div>
                    </td>
                    <td className="px-6 py-4">
                      {item.quantity <= 0 ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
                          Tugagan
                        </span>
                      ) : item.quantity <= item.minStockLevel ? (
                        <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-semibold text-orange-400">
                          Kam qolgan
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
                          Yetarli
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setOpProductId(item.productId);
                          setOpBranchId(item.branchId);
                          setIsStockModalOpen(true);
                        }}
                        className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-amber-500 hover:bg-zinc-700 transition"
                      >
                        O'zgartirish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK MOVEMENTS */}
      {activeTab === 'movements' && (
        <div className={`overflow-hidden rounded-2xl border ${theme ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`}>
          <table className="w-full text-left text-sm">
            <thead className={`border-b ${theme ? 'border-zinc-800 bg-zinc-800/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
              <tr>
                <th className="px-6 py-4 font-semibold">Vaqti</th>
                <th className="px-6 py-4 font-semibold">Mahsulot</th>
                <th className="px-6 py-4 font-semibold">Harakat Turi</th>
                <th className="px-6 py-4 font-semibold">O'zgarish</th>
                <th className="px-6 py-4 font-semibold">Qoldiq (Keyin)</th>
                <th className="px-6 py-4 font-semibold">Mas'ul Shaxs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    {m.product?.name}
                    <div className="text-xs font-normal text-gray-500">{m.reason}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-mono">
                      {m.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-mono font-bold ${m.quantityChanged > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.quantityChanged > 0 ? `+${m.quantityChanged}` : m.quantityChanged} L
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-300">
                    {m.quantityAfter} L
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {m.userName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400"
            >
              <Plus size={16} /> Yangi Ta'minotchi Qo'shish
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suppliers.map((s) => (
              <div key={s.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base">{s.name}</h3>
                    <p className="text-xs text-gray-400">{s.contactPerson} · {s.phone}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-500 font-semibold">
                    Reyting: {s.rating} ★
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800">
                  {s.brands?.map((b, i) => (
                    <span key={i} className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-gray-300">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PURCHASING ORDERS */}
      {activeTab === 'purchases' && (
        <div className={`overflow-hidden rounded-2xl border ${theme ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`}>
          <table className="w-full text-left text-sm">
            <thead className={`border-b ${theme ? 'border-zinc-800 bg-zinc-800/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
              <tr>
                <th className="px-6 py-4 font-semibold">Buyurtma Raqami</th>
                <th className="px-6 py-4 font-semibold">Yetkazib Beruvchi</th>
                <th className="px-6 py-4 font-semibold">Pozitsiyalar</th>
                <th className="px-6 py-4 font-semibold">Umumiy Summa</th>
                <th className="px-6 py-4 font-semibold">Holati</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-6 py-4 font-mono font-semibold text-amber-500">
                    {p.poNumber}
                  </td>
                  <td className="px-6 py-4 font-medium">{p.supplierName}</td>
                  <td className="px-6 py-4">{p.itemsCount} xil tovar</td>
                  <td className="px-6 py-4 font-mono font-bold">
                    {Number(p.totalAmount).toLocaleString()} so'm
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: YANGI MAHSULOT QO'SHISH */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-2xl">
            <h2 className="text-xl font-bold">Yangi Mahsulot Yaratish (Katalog)</h2>
            <form onSubmit={handleCreateProduct} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs text-gray-400">Mahsulot Nomi *</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Castrol EDGE 5W-30 LL"
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Brend *</label>
                  <input
                    type="text"
                    required
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    placeholder="Castrol, Shell, Motul"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Viskozitet</label>
                  <input
                    type="text"
                    value={newProdViscosity}
                    onChange={(e) => setNewProdViscosity(e.target.value)}
                    placeholder="5W-30"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Moy Turi</label>
                  <select
                    value={newProdOilType}
                    onChange={(e) => setNewProdOilType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Synthetic">Synthetic</option>
                    <option value="Semi-Synthetic">Semi-Synthetic</option>
                    <option value="Mineral">Mineral</option>
                    <option value="Filter">Filter</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Shtrix-kod (Barcode)</label>
                  <input
                    type="text"
                    value={newProdBarcode}
                    onChange={(e) => setNewProdBarcode(e.target.value)}
                    placeholder="4008177073281"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">Standartlar (vergul bilan)</label>
                <input
                  type="text"
                  value={newProdStandards}
                  onChange={(e) => setNewProdStandards(e.target.value)}
                  placeholder="API SP, ACEA C3, MB 229.51"
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-400"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK OPERATION (KIRIM / CHIQIM) */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-2xl">
            <h2 className="text-xl font-bold">Ombor Kirim / Chiqim Amali</h2>
            <form onSubmit={handleStockOperation} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs text-gray-400">Filial *</label>
                <select
                  value={opBranchId}
                  onChange={(e) => setOpBranchId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400">Mahsulot *</label>
                <select
                  required
                  value={opProductId}
                  onChange={(e) => setOpProductId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Mahsulotni tanlang...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.brand} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Amal Turi</label>
                  <select
                    value={opType}
                    onChange={(e) => setOpType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="STOCK_IN">Kirim (+)</option>
                    <option value="STOCK_OUT">Chiqim (-)</option>
                    <option value="ADJUSTMENT">Inventarizatsiya (Tuzatish)</option>
                    <option value="WRITE_OFF">Hisobdan chiqarish (Spisanie)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Miqdor (litr / dona) *</label>
                  <input
                    type="number"
                    required
                    value={opQuantity}
                    onChange={(e) => setOpQuantity(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Kirim Tannarxi (so'm)</label>
                  <input
                    type="number"
                    value={opPurchasePrice}
                    onChange={(e) => setOpPurchasePrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Sotish Narxi (so'm)</label>
                  <input
                    type="number"
                    value={opSellingPrice}
                    onChange={(e) => setOpSellingPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">Sabab / Izoh</label>
                <input
                  type="text"
                  value={opReason}
                  onChange={(e) => setOpReason(e.target.value)}
                  placeholder="Partiya kirimi yoki hisobdan chiqarish sababi"
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-400"
                >
                  Tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TA'MINOTCHI */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-2xl">
            <h2 className="text-xl font-bold">Yangi Ta'minotchi</h2>
            <form onSubmit={handleCreateSupplier} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs text-gray-400">Kompaniya Nomi *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="LubriGroup MCHJ"
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Mas'ul Shaxs</label>
                <input
                  type="text"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  placeholder="Rustam Aliyev"
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Telefon</label>
                <input
                  type="text"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-400"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
