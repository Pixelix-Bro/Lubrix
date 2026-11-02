import { requireAuth } from '../../middleware/auth.js'
import {
  Branch,
  Inventory,
  Product,
  PurchaseOrder,
  StockMovement,
  Supplier,
} from '../../models/index.js'
import { TelegramService } from '../telegram/telegramService.js'

export const initInventoryRoutes = (app, emitTenantEvent) => {
  // 1. Dashboard & Statistics
  app.get('/api/v1/inventory/dashboard', requireAuth, async (req, res, next) => {
    try {
      const branchId = req.query.branchId
      const orgId = req.organizationId

      const invFilter = { organizationId: orgId }
      if (branchId) {
        invFilter.branchId = branchId
      }

      const [invList, productsCount, recentMovements] = await Promise.all([
        Inventory.find(invFilter),
        Product.countDocuments({
          isArchived: false,
          organizationId: orgId,
        }),
        StockMovement.find({ organizationId: orgId }).sort({ createdAt: -1 }).limit(5),
      ])

      const totalValue = invList.reduce(
        (acc, curr) => acc + curr.quantity * (curr.purchasePrice || 0),
        0
      )
      const potentialRevenue = invList.reduce(
        (acc, curr) => acc + curr.quantity * (curr.sellingPrice || 0),
        0
      )
      const inStockCount = invList.filter((i) => i.quantity > i.minStockLevel).length
      const lowStockList = invList.filter((i) => i.quantity > 0 && i.quantity <= i.minStockLevel)
      const outOfStockList = invList.filter((i) => i.quantity <= 0)

      // Enrich low stock items with product info
      const lowStockProductIds = lowStockList.map((i) => i.productId)
      const lowStockProducts = await Product.find({ _id: { $in: lowStockProductIds } })
      const productMap = new Map(lowStockProducts.map((p) => [p._id.toString(), p]))

      const enrichedLowStock = lowStockList.map((item) => ({
        ...item.toObject(),
        product: productMap.get(item.productId) || null,
      }))

      // Enrich recent movements
      const movProductIds = recentMovements.map((m) => m.productId)
      const movProducts = await Product.find({ _id: { $in: movProductIds } })
      const movProductMap = new Map(movProducts.map((p) => [p._id.toString(), p]))

      const enrichedMovements = recentMovements.map((m) => ({
        ...m.toObject(),
        product: movProductMap.get(m.productId) || null,
      }))

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
          recentMovements: enrichedMovements,
        },
      })
    } catch (err) {
      next(err)
    }
  })

  // 2. Oil Catalog & Products
  app.get('/api/v1/products', requireAuth, async (req, res, next) => {
    try {
      const { search, brand, category, oilType, viscosity } = req.query
      const orgId = req.organizationId

      const filter = {
        isArchived: false,
        organizationId: orgId,
      }

      if (brand) filter.brand = { $regex: brand, $options: 'i' }
      if (category) filter.category = { $regex: category, $options: 'i' }
      if (oilType) filter.oilType = { $regex: oilType, $options: 'i' }
      if (viscosity) filter.viscosity = viscosity

      if (search && search.trim()) {
        const q = search.trim()
        filter.$and = [
          {
            $or: [
              { name: { $regex: q, $options: 'i' } },
              { brand: { $regex: q, $options: 'i' } },
              { barcode: { $regex: q, $options: 'i' } },
            ],
          },
        ]
      }

      const products = await Product.find(filter).sort({ brand: 1, name: 1 })
      res.json({ success: true, data: products })
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/v1/products', requireAuth, async (req, res, next) => {
    try {
      const {
        name,
        brand,
        category,
        oilType,
        viscosity,
        barcode,
        standards,
        packageSizes,
        description,
        price,
        purchasePrice,
      } = req.body
      if (!name || !brand) {
        return res.status(400).json({ success: false, error: 'Nomi va brendi kiritilishi shart' })
      }
      const sellingPriceValue = Number(price)
      const purchasePriceValue = Number(purchasePrice)
      if (!Number.isFinite(sellingPriceValue) || sellingPriceValue < 0) {
        return res
          .status(400)
          .json({ success: false, error: 'Sotish narxi to‘g‘ri kiritilishi shart' })
      }
      if (!Number.isFinite(purchasePriceValue) || purchasePriceValue < 0) {
        return res
          .status(400)
          .json({ success: false, error: 'Kirim tannarxi to‘g‘ri kiritilishi shart' })
      }

      const newProd = await Product.create({
        organizationId: req.organizationId,
        name: name.trim(),
        brand: brand.trim(),
        category: category || 'Engine Oil',
        oilType: oilType || 'Synthetic',
        viscosity: viscosity || '',
        barcode: barcode || '',
        standards: Array.isArray(standards) ? standards : [standards].filter(Boolean),
        packageSizes: Array.isArray(packageSizes) ? packageSizes : [],
        description: description || '',
        price: sellingPriceValue,
        purchasePrice: purchasePriceValue,
        isArchived: false,
      })

      emitTenantEvent(req.organizationId, 'product:created', newProd)
      res.status(201).json({ success: true, data: newProd })
    } catch (err) {
      next(err)
    }
  })

  // 3. My Inventory (Stock by Branch)
  app.get('/api/v1/inventory', requireAuth, async (req, res, next) => {
    try {
      const { branchId, status } = req.query
      const orgId = req.organizationId

      const invFilter = { organizationId: orgId }
      if (branchId) {
        invFilter.branchId = branchId
      }

      const invList = await Inventory.find(invFilter)

      const productIds = [...new Set(invList.map((i) => i.productId))]
      const branchIds = [...new Set(invList.map((i) => i.branchId))]

      const [products, branches] = await Promise.all([
        Product.find({ _id: { $in: productIds } }),
        Branch.find({ _id: { $in: branchIds } }),
      ])

      const productMap = new Map(products.map((p) => [p._id.toString(), p]))
      const branchMap = new Map(branches.map((b) => [b._id.toString(), b.name]))

      let result = invList.map((item) => ({
        ...item.toObject(),
        product: productMap.get(item.productId) || null,
        branchName: branchMap.get(item.branchId) || 'Asosiy filial',
      }))

      if (status === 'low') {
        result = result.filter((i) => i.quantity > 0 && i.quantity <= i.minStockLevel)
      } else if (status === 'out') {
        result = result.filter((i) => i.quantity <= 0)
      } else if (status === 'in') {
        result = result.filter((i) => i.quantity > i.minStockLevel)
      }

      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  })

  // 4. Stock Operations: Adjust / In / Out
  app.post('/api/v1/inventory/operations', requireAuth, async (req, res, next) => {
    try {
      const {
        branchId,
        productId,
        type,
        quantity,
        reason,
        unit = 'L',
        purchasePrice,
        sellingPrice,
      } = req.body
      const numQty = Number(quantity)

      if (!branchId || !productId || !type || !Number.isFinite(numQty)) {
        return res.status(400).json({
          success: false,
          error: 'branchId, productId, type va quantity kiritilishi shart',
        })
      }
      if (
        !['STOCK_IN', 'STOCK_OUT', 'WRITE_OFF', 'SERVICE_CONSUMPTION', 'ADJUSTMENT'].includes(type)
      ) {
        return res.status(400).json({ success: false, error: 'Ombor amali turi noto‘g‘ri' })
      }
      if (type !== 'ADJUSTMENT' && numQty <= 0) {
        return res.status(400).json({ success: false, error: 'Miqdor noldan katta bo‘lishi kerak' })
      }
      if (type === 'ADJUSTMENT' && numQty < 0) {
        return res.status(400).json({ success: false, error: 'Qoldiq manfiy bo‘lishi mumkin emas' })
      }

      const product = await Product.findOne({
        _id: productId,
        organizationId: req.organizationId,
        isArchived: false,
      })
      if (!product) {
        return res.status(404).json({ success: false, error: 'Mahsulot topilmadi' })
      }
      const resolvedPurchasePrice =
        purchasePrice === undefined ? Number(product.purchasePrice) || 0 : Number(purchasePrice)
      const resolvedSellingPrice =
        sellingPrice === undefined ? Number(product.price) || 0 : Number(sellingPrice)
      if (
        !Number.isFinite(resolvedPurchasePrice) ||
        resolvedPurchasePrice < 0 ||
        !Number.isFinite(resolvedSellingPrice) ||
        resolvedSellingPrice < 0
      ) {
        return res.status(400).json({ success: false, error: 'Mahsulot narxlari noto‘g‘ri' })
      }

      let stockItem = await Inventory.findOne({
        organizationId: req.organizationId,
        branchId,
        productId,
      })

      const decreasesStock = ['STOCK_OUT', 'WRITE_OFF', 'SERVICE_CONSUMPTION'].includes(type)
      if (!stockItem && decreasesStock) {
        return res.status(409).json({ success: false, error: 'Omborda yetarli qoldiq yo‘q' })
      }

      if (!stockItem) {
        stockItem = new Inventory({
          organizationId: req.organizationId,
          branchId,
          productId,
          quantity: 0,
          unit,
          purchasePrice: resolvedPurchasePrice,
          sellingPrice: resolvedSellingPrice,
          minStockLevel: 10,
          location: 'Ombor-1',
        })
        await stockItem.save()
      }

      const quantityDelta = decreasesStock ? -numQty : numQty
      const stockFilter = {
        _id: stockItem._id,
        organizationId: req.organizationId,
        branchId,
        productId,
      }
      if (decreasesStock) stockFilter.quantity = { $gte: numQty }

      const update = {
        $set: {
          purchasePrice: resolvedPurchasePrice,
          sellingPrice: resolvedSellingPrice,
        },
      }
      if (type === 'ADJUSTMENT') {
        update.$set.quantity = numQty
      } else {
        update.$inc = { quantity: quantityDelta }
      }

      const previousStock = await Inventory.findOneAndUpdate(stockFilter, update, {
        returnDocument: 'before',
        runValidators: true,
      })
      if (!previousStock) {
        return res.status(409).json({ success: false, error: 'Omborda yetarli qoldiq yo‘q' })
      }

      const qtyBefore = Number(previousStock.quantity) || 0
      const qtyChanged = type === 'ADJUSTMENT' ? numQty - qtyBefore : quantityDelta
      const qtyAfter = qtyBefore + qtyChanged
      stockItem = await Inventory.findById(previousStock._id)

      const movement = await StockMovement.create({
        organizationId: req.organizationId,
        branchId,
        productId,
        type,
        quantityBefore: qtyBefore,
        quantityChanged: qtyChanged,
        quantityAfter: qtyAfter,
        reason: reason || 'Ombor amali',
        userName: req.user?.name || 'Admin',
      })

      emitTenantEvent(req.organizationId, 'inventory:updated', { stockItem, movement })
      if (qtyBefore > stockItem.minStockLevel && stockItem.quantity <= stockItem.minStockLevel) {
        const product = await Product.findOne({
          _id: productId,
          organizationId: req.organizationId,
        })
        await TelegramService.notifyOwner(req.organizationId, 'lowStock', {
          productName: product?.name || 'Mahsulot',
          quantity: stockItem.quantity,
        })
      }

      res.json({ success: true, data: { stockItem, movement } })
    } catch (err) {
      next(err)
    }
  })

  // 5. Stock Movements
  app.get('/api/v1/inventory/movements', requireAuth, async (req, res, next) => {
    try {
      const { branchId } = req.query
      const orgId = req.organizationId

      const filter = { organizationId: orgId }
      if (branchId) filter.branchId = branchId

      const movements = await StockMovement.find(filter).sort({ createdAt: -1 }).limit(100)

      const productIds = [...new Set(movements.map((m) => m.productId))]
      const branchIds = [...new Set(movements.map((m) => m.branchId))]

      const [products, branches] = await Promise.all([
        Product.find({ _id: { $in: productIds } }),
        Branch.find({ _id: { $in: branchIds } }),
      ])

      const productMap = new Map(products.map((p) => [p._id.toString(), p]))
      const branchMap = new Map(branches.map((b) => [b._id.toString(), b]))

      const list = movements.map((m) => ({
        ...m.toObject(),
        product: productMap.get(m.productId) || null,
        branch: branchMap.get(m.branchId) || null,
      }))

      res.json({ success: true, data: list })
    } catch (err) {
      next(err)
    }
  })

  // 6. Suppliers
  app.get('/api/v1/suppliers', requireAuth, async (req, res, next) => {
    try {
      const suppliers = await Supplier.find({ organizationId: req.organizationId }).sort({
        createdAt: -1,
      })
      res.json({ success: true, data: suppliers })
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/v1/suppliers', requireAuth, async (req, res, next) => {
    try {
      const { name, contactPerson, phone, email, address, brands } = req.body
      if (!name) {
        return res
          .status(400)
          .json({ success: false, error: 'Yetkazib beruvchi nomi kiritilishi shart' })
      }

      const newSup = await Supplier.create({
        organizationId: req.organizationId,
        name: name.trim(),
        contactPerson: contactPerson || '',
        phone: phone || '',
        email: email || '',
        address: address || '',
        brands: Array.isArray(brands) ? brands : [brands].filter(Boolean),
        rating: 5.0,
        balance: 0,
      })

      res.status(201).json({ success: true, data: newSup })
    } catch (err) {
      next(err)
    }
  })

  app.put('/api/v1/suppliers/:id', requireAuth, async (req, res, next) => {
    try {
      const updates = {}
      for (const field of ['name', 'contactPerson', 'phone', 'email', 'address']) {
        if (req.body[field] !== undefined) updates[field] = String(req.body[field]).trim()
      }
      if (req.body.brands !== undefined) {
        updates.brands = Array.isArray(req.body.brands) ? req.body.brands : []
      }
      if (!updates.name && req.body.name !== undefined) {
        return res
          .status(400)
          .json({ success: false, error: 'Yetkazib beruvchi nomi bo‘sh bo‘lmasligi kerak' })
      }
      const supplier = await Supplier.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.organizationId },
        { $set: updates },
        { new: true, runValidators: true }
      )
      if (!supplier)
        return res.status(404).json({ success: false, error: 'Yetkazib beruvchi topilmadi' })
      res.json({ success: true, data: supplier })
    } catch (err) {
      next(err)
    }
  })

  app.delete('/api/v1/suppliers/:id', requireAuth, async (req, res, next) => {
    try {
      const supplier = await Supplier.findOne({
        _id: req.params.id,
        organizationId: req.organizationId,
      })
      if (!supplier)
        return res.status(404).json({ success: false, error: 'Yetkazib beruvchi topilmadi' })
      const linkedOrders = await PurchaseOrder.countDocuments({
        supplierId: supplier._id.toString(),
        organizationId: req.organizationId,
      })
      if (linkedOrders) {
        return res
          .status(409)
          .json({ success: false, error: 'Yetkazib beruvchiga xarid buyurtmalari bog‘langan' })
      }
      await supplier.deleteOne()
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  })

  // 7. Purchase Orders
  app.get('/api/v1/purchases', requireAuth, async (req, res, next) => {
    try {
      const purchaseOrders = await PurchaseOrder.find({ organizationId: req.organizationId }).sort({
        createdAt: -1,
      })
      res.json({ success: true, data: purchaseOrders })
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/v1/purchases', requireAuth, async (req, res, next) => {
    try {
      const { supplierId, branchId, totalAmount, itemsCount } = req.body
      if (!supplierId) {
        return res.status(400).json({ success: false, error: 'supplierId kiritilishi shart' })
      }

      const sup = await Supplier.findOne({ _id: supplierId, organizationId: req.organizationId })
      const count = await PurchaseOrder.countDocuments({ organizationId: req.organizationId })
      const poNumber = `PO-2026-${String(count + 1).padStart(3, '0')}`

      const newPO = await PurchaseOrder.create({
        organizationId: req.organizationId,
        poNumber,
        supplierId,
        supplierName: sup ? sup.name : 'Yetkazib beruvchi',
        branchId: branchId || 'br-01',
        totalAmount: Number(totalAmount) || 0,
        status: 'PENDING_DELIVERY',
        itemsCount: Number(itemsCount) || 1,
      })

      res.status(201).json({ success: true, data: newPO })
    } catch (err) {
      next(err)
    }
  })

  app.put('/api/v1/purchases/:id', requireAuth, async (req, res, next) => {
    try {
      const updates = {}
      if (req.body.supplierId !== undefined) {
        const supplier = await Supplier.findOne({
          _id: req.body.supplierId,
          organizationId: req.organizationId,
        })
        if (!supplier)
          return res.status(404).json({ success: false, error: 'Yetkazib beruvchi topilmadi' })
        updates.supplierId = supplier._id.toString()
        updates.supplierName = supplier.name
      }
      if (req.body.totalAmount !== undefined) {
        const totalAmount = Number(req.body.totalAmount)
        if (!Number.isFinite(totalAmount) || totalAmount < 0) {
          return res.status(400).json({ success: false, error: 'Buyurtma summasi noto‘g‘ri' })
        }
        updates.totalAmount = totalAmount
      }
      if (req.body.itemsCount !== undefined) {
        const itemsCount = Number(req.body.itemsCount)
        if (!Number.isInteger(itemsCount) || itemsCount < 1) {
          return res
            .status(400)
            .json({ success: false, error: 'Mahsulotlar soni kamida 1 bo‘lishi kerak' })
        }
        updates.itemsCount = itemsCount
      }
      if (req.body.branchId !== undefined) updates.branchId = String(req.body.branchId)
      if (req.body.status !== undefined) {
        if (!['PENDING_DELIVERY', 'ORDERED', 'COMPLETED', 'CANCELLED'].includes(req.body.status)) {
          return res.status(400).json({ success: false, error: 'Buyurtma holati noto‘g‘ri' })
        }
        updates.status = req.body.status
      }
      const order = await PurchaseOrder.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.organizationId },
        { $set: updates },
        { new: true, runValidators: true }
      )
      if (!order)
        return res.status(404).json({ success: false, error: 'Xarid buyurtmasi topilmadi' })
      res.json({ success: true, data: order })
    } catch (err) {
      next(err)
    }
  })

  app.delete('/api/v1/purchases/:id', requireAuth, async (req, res, next) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        organizationId: req.organizationId,
      })
      if (!order)
        return res.status(404).json({ success: false, error: 'Xarid buyurtmasi topilmadi' })
      if (order.status === 'COMPLETED') {
        return res
          .status(409)
          .json({ success: false, error: 'Yakunlangan xarid buyurtmasini o‘chirib bo‘lmaydi' })
      }
      await order.deleteOne()
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  })

  // 8. Update Product (Edit)
  app.put('/api/v1/products/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params
      const {
        name,
        brand,
        category,
        oilType,
        viscosity,
        barcode,
        standards,
        packageSizes,
        description,
        price,
        purchasePrice,
      } = req.body
      const updates = {}
      if (name !== undefined) updates.name = String(name).trim()
      if (brand !== undefined) updates.brand = String(brand).trim()
      if (category !== undefined) updates.category = String(category).trim()
      if (oilType !== undefined) updates.oilType = String(oilType).trim()
      if (viscosity !== undefined) updates.viscosity = String(viscosity).trim()
      if (barcode !== undefined) updates.barcode = String(barcode).trim()
      if (standards !== undefined) updates.standards = Array.isArray(standards) ? standards : []
      if (packageSizes !== undefined)
        updates.packageSizes = Array.isArray(packageSizes) ? packageSizes : []
      if (description !== undefined) updates.description = String(description).trim()

      for (const [field, value] of Object.entries({ price, purchasePrice })) {
        if (value === undefined) continue
        const amount = Number(value)
        if (!Number.isFinite(amount) || amount < 0) {
          return res
            .status(400)
            .json({ success: false, error: 'Mahsulot narxi manfiy bo‘lmasligi kerak' })
        }
        updates[field] = amount
      }
      if (updates.name === '' || updates.brand === '') {
        return res
          .status(400)
          .json({ success: false, error: 'Mahsulot nomi va brendi bo‘sh bo‘lmasligi kerak' })
      }

      const updated = await Product.findOneAndUpdate(
        { _id: id, organizationId: req.organizationId, isArchived: false },
        { $set: updates },
        { new: true, runValidators: true }
      )
      if (!updated) return res.status(404).json({ success: false, error: 'Mahsulot topilmadi' })
      emitTenantEvent(req.organizationId, 'product:updated', updated)
      res.json({ success: true, data: updated })
    } catch (err) {
      next(err)
    }
  })

  // 9. Delete / Archive Product
  app.delete('/api/v1/products/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params
      const archived = await Product.findOneAndUpdate(
        { _id: id, organizationId: req.organizationId, isArchived: false },
        { $set: { isArchived: true } },
        { new: true }
      )
      if (!archived) return res.status(404).json({ success: false, error: 'Mahsulot topilmadi' })
      emitTenantEvent(req.organizationId, 'product:archived', { productId: id })
      res.json({
        success: true,
        message: 'Mahsulot katalogdan olib tashlandi; ombor tarixi saqlandi',
      })
    } catch (err) {
      next(err)
    }
  })
}
