import { User } from '../models/User.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, timezone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('An account with this email already exists', 400, 'EMAIL_EXISTS'));
    }

    // Hash password securely
    const passwordHash = await User.hashPassword(password);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
      timezone: timezone || 'UTC'
    });

    logger.info(`User registered successfully`, { userId: user._id, email: user.email });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please sign in with your credentials.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          timezone: user.timezone,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and explicitly select passwordHash
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    logger.info(`User logged in successfully`, { userId: user._id, email: user.email });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          timezone: user.timezone,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const { name, timezone } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (timezone) updates.timezone = timezone;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};
