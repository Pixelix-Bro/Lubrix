import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Organization } from '../../models/index.js';
import { JWT_SECRET } from '../../middleware/auth.js';

const createSlug = (name) => {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${base || 'lubrix'}-${Math.random().toString(36).substring(2, 7)}`;
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, organizationName, phone } = req.body;

    if (!name || !email || !password || !organizationName) {
      return res.status(400).json({
        success: false,
        error: 'Ism, email, parol va tashkilot nomi talab qilinadi'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Ushbu email bilan ro‘yxatdan o‘tilgan'
      });
    }

    const slug = createSlug(organizationName);
    const org = await Organization.create({
      name: organizationName.trim(),
      slug,
      countryCode: 'UZ',
      currency: 'UZS',
      timezone: 'Asia/Tashkent',
      defaultLocale: 'uz',
      status: 'active'
    });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      organizationId: org._id.toString(),
      role: 'OWNER',
      phone: phone || '',
      isActive: true,
      lastLogin: new Date()
    });

    const payload = {
      userId: user._id.toString(),
      organizationId: org._id.toString(),
      role: user.role,
      name: user.name
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        phone: user.phone
      },
      organization: {
        id: org._id,
        name: org.name,
        slug: org.slug,
        currency: org.currency,
        settings: org.settings
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email va parol kiritilishi shart'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Noto‘g‘ri login yoki parol'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Noto‘g‘ri login yoki parol'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const org = await Organization.findById(user.organizationId);

    const payload = {
      userId: user._id.toString(),
      organizationId: user.organizationId,
      role: user.role,
      name: user.name
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        branchId: user.branchId,
        phone: user.phone
      },
      organization: org ? {
        id: org._id,
        name: org.name,
        slug: org.slug,
        currency: org.currency,
        settings: org.settings
      } : null
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: 'Muvaffaqiyatli tizimdan chiqildi'
    });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Foydalanuvchi topilmadi'
      });
    }

    const safeUser = user.toObject ? user.toObject() : { ...user };
    delete safeUser.passwordHash;

    const org = await Organization.findById(req.organizationId);

    res.json({
      success: true,
      data: {
        user: safeUser,
        organization: org
      }
    });
  } catch (err) {
    next(err);
  }
};

export const checkoutRegister = async (req, res, next) => {
  try {
    const {
      name,
      ownerName,
      email,
      organizationName,
      businessName,
      phone,
      planName = 'Starter',
      password
    } = req.body;

    const orgName = (organizationName || businessName || '').trim();
    const clientName = (name || ownerName || 'Servis Egasi').trim();

    if (!email || !orgName) {
      return res.status(400).json({
        success: false,
        error: 'Email va tashkilot nomi talab qilinadi'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    let existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      // User already exists, log them in and update plan
      await Organization.findByIdAndUpdate(existingUser.organizationId, {
        subscriptionPlan: planName.toUpperCase(),
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      const payload = {
        userId: existingUser._id.toString(),
        organizationId: existingUser.organizationId,
        role: existingUser.role,
        name: existingUser.name
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        message: 'Mavjud hisobga yangi tarif muvaffaqiyatli ulandi!',
        token,
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          organizationId: existingUser.organizationId
        }
      });
    }

    // New Registration via Checkout
    const autoPassword = password || `Lubrix${Math.floor(100000 + Math.random() * 900000)}!`;
    const passwordHash = await bcrypt.hash(autoPassword, 12);
    const slug = createSlug(orgName);

    const org = await Organization.create({
      name: orgName,
      slug,
      countryCode: 'UZ',
      currency: 'UZS',
      timezone: 'Asia/Tashkent',
      defaultLocale: 'uz',
      status: 'active',
      subscriptionPlan: planName.toUpperCase(),
      subscriptionStatus: 'ACTIVE',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    const user = await User.create({
      name: clientName,
      email: cleanEmail,
      passwordHash,
      organizationId: org._id.toString(),
      role: 'OWNER',
      phone: phone || '',
      isActive: true,
      lastLogin: new Date()
    });

    const payload = {
      userId: user._id.toString(),
      organizationId: org._id.toString(),
      role: user.role,
      name: user.name
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: `To‘lov qabul qilindi! Parol ${cleanEmail} elektron pochtasiga yuborildi.`,
      generatedPassword: autoPassword,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      },
      organization: {
        id: org._id,
        name: org.name,
        subscriptionPlan: org.subscriptionPlan
      }
    });
  } catch (err) {
    next(err);
  }
};
