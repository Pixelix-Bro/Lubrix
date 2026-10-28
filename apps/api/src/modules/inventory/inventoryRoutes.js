import { Product, Inventory, StockMovement, Supplier, PurchaseOrder, Branch } from '../../models/index.js';
import { requireAuth } from '../../middleware/auth.js';

export const initInventoryRoutes = (app, emitTenantEvent) => {
  // 1. Dashboard & Statistics
  app.get('/api/v1/inventory/dashboard', requireAuth, async (req, res, next) => {
    try {
      const branchId = req.query.branchId;
      const orgId = req.organizationId;

      const invFilter = { organizationId: orgId };
      if (branchId) {
        invFilter.branchId = branchId;
      }

      const [invList, productsCount, recentMovements] = await Promise.all([
        Inventory.find(invFilter),
        Product.countDocuments({
          isArchived: false,
          $or: [{ organizationId: orgId }, { organizationId: null }, { organizationId: { $exists: false } }]
        }),
        StockMovement.find({ organizationId: orgId }).sort({ createdAt: -1 }).limit(5)
      ]);

      const totalValue = invList.reduce((acc, curr) => acc + (curr.quantity * (curr.purchasePrice || 0)), 0);
      const potentialRevenue = invList.reduce((acc, curr) => acc + (curr.quantity * (curr.sellingPrice || 0)), 0);
      const inStockCount = invList.filter(i => i.quantity > i.minStockLevel).length;
      const lowStockList = invList.filter(i => i.quantity > 0 && i.quantity <= i.minStockLevel);
      const outOfStockList = invList.filter(i => i.quantity <= 0);

      // Enrich low stock items with product info
      const lowStockProductIds = lowStockList.map(i => i.productId);
      const lowStockProducts = await Product.find({ _id: { $in: lowStockProductIds } });
      const productMap = new Map(lowStockProducts.map(p => [p._id.toString(), p]));

      const enrichedLowStock = lowStockList.map(item => ({
        ...item.toObject(),
        product: productMap.get(item.productId) || null
      }));

      // Enrich recent movements
      const movProductIds = recentMovements.map(m => m.productId);
      const movProducts = await Product.find({ _id: { $in: movProductIds } });
      const movProductMap = new Map(movProducts.map(p => [p._id.toString(), p]));

      const enrichedMovements = recentMovements.map(m => ({
        ...m.toObject(),
        product: movProductMap.get(m.productId) || null
      }));

      res.json({
        success: true,
        data: {
          totalProducts: productsCount,
          totalStockUnits: invList.reduce((acc, curr) => acc + curr.quantity, 0),
          inventoryCostValue: totalValue,
          inventoryRetailValue: potentialRevenue,
          potentialProfit: potentialRevenue - totalValue,
          inStockCount,
          lowStockCount: lowStockList.length,
          outOfStockCount: outOfStockList.length,
          lowStockItems: enrichedLowStock,
          recentMovements: enrichedMovements
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // 2. Oil Catalog & Products
  app.get('/api/v1/products', requireAuth, async (req, res, next) => {
    try {
      const { search, brand, category, oilType, viscosity } = req.query;
      const orgId = req.organizationId;

      const filter = {
        isArchived: false,
        $or: [{ organizationId: orgId }, { organizationId: null }, { organizationId: { $exists: false } }]
      };

      if (brand) filter.brand = { $regex: brand, $options: 'i' };
      if (category) filter.category = { $regex: category, $options: 'i' };
      if (oilType) filter.oilType = { $regex: oilType, $options: 'i' };
      if (viscosity) filter.viscosity = viscosity;

      if (search && search.trim()) {
        const q = search.trim();
        filter.$and = [
          {
            $or: [
              { name: { $regex: q, $options: 'i' } },
              { brand: { $regex: q, $options: 'i' } },
              { barcode: { $regex: q, $options: 'i' } }
            ]
          }
        ];
      }

      const products = await Product.find(filter).sort({ brand: 1, name: 1 });
      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/v1/products', requireAuth, async (req, res, next) => {
    try {
      const { name, brand, category, oilType, viscosity, barcode, standards, packageSizes, description } = req.body;
      if (!name || !brand) {
        return res.status(400).json({ success: false, error: "name va brand kiritilishi shart" });
      }

      const newProd = await Product.create({
        organizationId: req.organizationId,
        name: name.trim(),
        brand: brand.trim(),
        category: category || "Engine Oil",
        oilType: oilType || "Synthetic",
        viscosity: viscosity || "5W-30",
        barcode: barcode || "",
        standards: Array.isArray(standards) ? standards : [standards].filter(Boolean),
        packageSizes: Array.isArray(packageSizes) ? packageSizes : ["1L", "4L"],
        description: description || "",
        isArchived: false
      });

      emitTenantEvent(req.organizationId, 'product:created', newProd);
      res.status(201).json({ success: true, data: newProd });
    } catch (err) {
      next(err);
    }
  });

  // 3. My Inventory (Stock by Branch)
  app.get('/api/v1/inventory', requireAuth, async (req, res, next) => {
    try {
      const { branchId, status } = req.query;
      const orgId = req.organizationId;

      const invFilter = { organizationId: orgId };
      if (branchId) {
        invFilter.branchId = branchId;
      }

      const invList = await Inventory.find(invFilter);

      const productIds = [...new Set(invList.map(i => i.productId))];
      const branchIds = [...new Set(invList.map(i => i.branchId))];

      const [products, branches] = await Promise.all([
        Product.find({ _id: { $in: productIds } }),
        Branch.find({ _id: { $in: branchIds } })
      ]);

      const productMap = new Map(products.map(p => [p._id.toString(), p]));
      const branchMap = new Map(branches.map(b => [b._id.toString(), b.name]));

      let result = invList.map(item => ({
        ...item.toObject(),
        product: productMap.get(item.productId) || null,
        branchName: branchMap.get(item.branchId) || "Asosiy filial"
      }));

      if (status === 'low') {
        result = result.filter(i => i.quantity > 0 && i.quantity <= i.minStockLevel);
      } else if (status === 'out') {
        result = result.filter(i => i.quantity <= 0);
      } else if (status === 'in') {
        result = result.filter(i => i.quantity > i.minStockLevel);
      }

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  // 4. Stock Operations: Adjust / In / Out
  app.post('/api/v1/inventory/operations', requireAuth, async (req, res, next) => {
    try {
      const { branchId, productId, type, quantity, reason, unit = "L", purchasePrice, sellingPrice } = req.body;
      const numQty = Number(quantity);

      if (!branchId || !productId || !type || isNaN(numQty)) {
        return res.status(400).json({
          success: false,
          error: "branchId, productId, type va quantity kiritilishi shart"
        });
      }

      let stockItem = await Inventory.findOne({
        organizationId: req.organizationId,
        branchId,
        productId
      });

      if (!stockItem) {
        stockItem = new Inventory({
          organizationId: req.organizationId,
          branchId,
          productId,
          quantity: 0,
          unit,
          purchasePrice: Number(purchasePrice) || 100000,
          sellingPrice: Number(sellingPrice) || 140000,
          minStockLevel: 10,
          location: "Ombor-1"
        });
      }

      const qtyBefore = stockItem.quantity;
      let qtyChanged = numQty;

      if (type === 'STOCK_IN') {
        stockItem.quantity += numQty;
      } else if (type === 'STOCK_OUT' || type === 'WRITE_OFF' || type === 'SERVICE_CONSUMPTION') {
        qtyChanged = -Math.abs(numQty);
        stockItem.quantity -= Math.abs(numQty);
      } else if (type === 'ADJUSTMENT') {
        qtyChanged = numQty - qtyBefore;
        stockItem.quantity = numQty;
      }

      if (purchasePrice !== undefined) stockItem.purchasePrice = Number(purchasePrice);
      if (sellingPrice !== undefined) stockItem.sellingPrice = Number(sellingPrice);

      await stockItem.save();

      const movement = await StockMovement.create({
        organizationId: req.organizationId,
        branchId,
        productId,
        type,
        quantityBefore: qtyBefore,
        quantityChanged: qtyChanged,
        quantityAfter: stockItem.quantity,
        reason: reason || "Ombor amali",
        userName: req.user?.name || "Admin"
      });

      emitTenantEvent(req.organizationId, 'inventory:updated', { stockItem, movement });

      res.json({ success: true, data: { stockItem, movement } });
    } catch (err) {
      next(err);
    }
  });

  // 5. Stock Movements
  app.get('/api/v1/inventory/movements', requireAuth, async (req, res, next) => {
    try {
      const { branchId } = req.query;
      const orgId = req.organizationId;

      const filter = { organizationId: orgId };
      if (branchId) filter.branchId = branchId;

      const movements = await StockMovement.find(filter).sort({ createdAt: -1 }).limit(100);

      const productIds = [...new Set(movements.map(m => m.productId))];
      const branchIds = [...new Set(movements.map(m => m.branchId))];

      const [products, branches] = await Promise.all([
        Product.find({ _id: { $in: productIds } }),
        Branch.find({ _id: { $in: branchIds } })
      ]);

      const productMap = new Map(products.map(p => [p._id.toString(), p]));
      const branchMap = new Map(branches.map(b => [b._id.toString(), b]));

      const list = movements.map(m => ({
        ...m.toObject(),
        product: productMap.get(m.productId) || null,
        branch: branchMap.get(m.branchId) || null
      }));

      res.json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  });

  // 6. Suppliers
  app.get('/api/v1/suppliers', requireAuth, async (req, res, next) => {
    try {
      const suppliers = await Supplier.find({ organizationId: req.organizationId }).sort({ createdAt: -1 });
      res.json({ success: true, data: suppliers });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/v1/suppliers', requireAuth, async (req, res, next) => {
    try {
      const { name, contactPerson, phone, email, address, brands } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: "Yetkazib beruvchi nomi kiritilishi shart" });
      }

      const newSup = await Supplier.create({
        organizationId: req.organizationId,
        name: name.trim(),
        contactPerson: contactPerson || "",
        phone: phone || "",
        email: email || "",
        address: address || "",
        brands: Array.isArray(brands) ? brands : [brands].filter(Boolean),
        rating: 5.0,
        balance: 0
      });

      res.status(201).json({ success: true, data: newSup });
    } catch (err) {
      next(err);
    }
  });

  // 7. Purchase Orders
  app.get('/api/v1/purchases', requireAuth, async (req, res, next) => {
    try {
      const purchaseOrders = await PurchaseOrder.find({ organizationId: req.organizationId }).sort({ createdAt: -1 });
      res.json({ success: true, data: purchaseOrders });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/v1/purchases', requireAuth, async (req, res, next) => {
    try {
      const { supplierId, branchId, totalAmount, itemsCount } = req.body;
      if (!supplierId) {
        return res.status(400).json({ success: false, error: "supplierId kiritilishi shart" });
      }

      const sup = await Supplier.findOne({ _id: supplierId, organizationId: req.organizationId });
      const count = await PurchaseOrder.countDocuments({ organizationId: req.organizationId });
      const poNumber = `PO-2026-${String(count + 1).padStart(3, '0')}`;

      const newPO = await PurchaseOrder.create({
        organizationId: req.organizationId,
        poNumber,
        supplierId,
        supplierName: sup ? sup.name : "Yetkazib beruvchi",
        branchId: branchId || "br-01",
        totalAmount: Number(totalAmount) || 0,
        status: "PENDING_DELIVERY",
        itemsCount: Number(itemsCount) || 1
      });

      res.status(201).json({ success: true, data: newPO });
    } catch (err) {
      next(err);
    }
  });

  // 8. Update Product (Edit)
  app.put('/api/v1/products/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, brand, category, oilType, viscosity, barcode, standards, price, purchasePrice } = req.body;
      const updated = await Product.findOneAndUpdate(
        { _id: id },
        { $set: { name, brand, category, oilType, viscosity, barcode, standards, price, purchasePrice } },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, error: 'Mahsulot topilmadi' });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  });

  // 9. Delete / Archive Product
  app.delete('/api/v1/products/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      await Product.findByIdAndDelete(id);
      await Inventory.deleteMany({ productId: id });
      res.json({ success: true, message: 'Mahsulot va uning ombordagi qoldiqlari o‘chirildi' });
    } catch (err) {
      next(err);
    }
  });
};
