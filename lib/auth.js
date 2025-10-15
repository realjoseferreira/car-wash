import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

export function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function getUserWithTenants(userId) {
  const result = await query(`
    SELECT 
      u.id, u.email, u.username, u.full_name,
      json_agg(
        json_build_object(
          'tenant_id', t.id,
          'tenant_name', t.name,
          'tenant_slug', t.slug,
          'role', ut.role,
          'primary_color', t.primary_color,
          'logo_url', t.logo_url
        )
      ) as tenants
    FROM users u
    LEFT JOIN user_tenants ut ON u.id = ut.user_id
    LEFT JOIN tenants t ON ut.tenant_id = t.id
    WHERE u.id = $1
    GROUP BY u.id, u.email, u.username, u.full_name
  `, [userId]);
  
  return result.rows[0] || null;
}

export function hasPermission(role, action) {
  const permissions = {
    owner: ['create', 'read', 'update', 'delete', 'manage_team', 'manage_settings'],
    manager: ['create', 'read', 'update', 'delete', 'manage_team'],
    attendant: ['create', 'read', 'update'],
    viewer: ['read']
  };
  
  return permissions[role]?.includes(action) || false;
}
