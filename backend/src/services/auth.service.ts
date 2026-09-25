import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { config } from '../config';
import { AppError } from '../utils/app-error';
import { UserRole } from '@prisma/client';

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export class AuthService {
  static async register(data: {
    name: string;
    email: string;
    password: string;
    employeeId?: string;
    role?: UserRole;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw AppError.conflict('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const emailVerificationCode = crypto.randomInt(100000, 999999).toString();
    const emailVerificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        employeeId: data.employeeId,
        role: data.role || 'BOP_OPERATOR',
        emailVerificationCode,
        emailVerificationExpiry,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    // In production, send email with verification code
    console.log(`[DEV] Email verification code for ${data.email}: ${emailVerificationCode}`);

    return { user, verificationCode: emailVerificationCode };
  }

  static async verifyEmail(email: string, code: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (user.isEmailVerified) {
      throw AppError.badRequest('Email is already verified');
    }

    if (user.emailVerificationCode !== code) {
      throw AppError.badRequest('Invalid verification code');
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      throw AppError.badRequest('Verification code has expired');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  static async resendVerification(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (user.isEmailVerified) {
      throw AppError.badRequest('Email is already verified');
    }

    const emailVerificationCode = crypto.randomInt(100000, 999999).toString();
    const emailVerificationExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationCode, emailVerificationExpiry },
    });

    console.log(`[DEV] New verification code for ${email}: ${emailVerificationCode}`);

    return { message: 'Verification code resent' };
  }

  static async login(email: string, password: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw AppError.unauthorized('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw AppError.tooManyRequests(`Account locked. Try again in ${minutesLeft} minutes.`);
    }

    if (!user.isActive) {
      throw AppError.forbidden('Account is deactivated');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: failedAttempts };

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });
      throw AppError.unauthorized('Invalid credentials');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtAccessExpiry as jwt.SignOptions['expiresIn'] },
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiry as jwt.SignOptions['expiresIn'] },
    );

    // Reset failed attempts and save refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        refreshToken,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress || null,
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        isEmailVerified: user.isEmailVerified,
        assignedBopId: user.assignedBopId,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
        userId: string;
        type: string;
      };

      if (decoded.type !== 'refresh') {
        throw AppError.unauthorized('Invalid refresh token');
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || user.refreshToken !== refreshToken) {
        throw AppError.unauthorized('Invalid refresh token');
      }

      if (!user.isActive) {
        throw AppError.forbidden('Account is deactivated');
      }

      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtAccessExpiry as jwt.SignOptions['expiresIn'] },
      );

      const newRefreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiry as jwt.SignOptions['expiresIn'] },
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.unauthorized('Invalid refresh token');
    }
  }

  static async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        isEmailVerified: true,
        isActive: true,
        assignedBopId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return user;
  }

  /**
   * Verify or enroll a user's face using a 128-d descriptor from face-api.js.
   * - If no faceDescriptor is stored → enroll (save descriptor)
   * - If a faceDescriptor exists → compare via Euclidean distance
   */
  static async verifyFace(userId: string, descriptor: number[], forceEnroll = false) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, faceDescriptor: true, faceEnrolledAt: true },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    // --- ENROLLMENT (first time or explicit re-enrollment) ---
    if (forceEnroll || !user.faceDescriptor || user.faceDescriptor.length === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          faceDescriptor: descriptor,
          faceEnrolledAt: new Date(),
        },
      });
      return { status: 'enrolled' as const, message: 'Face enrolled successfully. This face will be used for future logins.' };
    }

    // --- VERIFICATION (subsequent logins) ---
    const stored = user.faceDescriptor;
    const distance = AuthService.euclideanDistance(stored, descriptor);
    const threshold = 0.68; // Calibrated for tinyLandmark neural alignment with webcams

    if (distance < threshold) {
      return { status: 'verified' as const, message: 'Face verified successfully.', distance };
    }

    throw AppError.unauthorized(`Face verification failed. Distance: ${distance.toFixed(3)} exceeds threshold ${threshold}.`);
  }

  /**
   * Calculate Euclidean distance between two face descriptors.
   */
  private static euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}
