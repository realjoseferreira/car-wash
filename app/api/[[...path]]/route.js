import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { runMigrations } from '@/lib/migrate';
import { runSeed } from '@/lib/seed';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  comparePassword,
  hashPassword,
  getUserWithTenants,
  hasPermission
} from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import * as cookie from 'cookie';
import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import { zonedTimeToUtc, format } from 'date-fns-tz';

// ============ MIDDLEWARE ============
function getTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  const cookies = cookie.parse(request.headers.get('cookie') || '');
  return cookies.access_token || null;
}

async function authenticate(request) {
  const token = getTokenFromRequest(request);
  
  if (!token) {
    return { error: 'No authentication token provided', status: 401 };
  }
  
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', status: 401 };
  }
  
  const user = await getUserWithTenants(decoded.userId);
  if (!user) {
    return { error: 'User not found', status: 404 };
  }
  
  return { user };
}

function getTenantFromUser(user, tenantId) {
  if (!tenantId) {
    return user.tenants && user.tenants.length > 0 ? user.tenants[0] : null;
  }
  
  return user.tenants?.find(t => t.tenant_id === tenantId) || null;
}

// ============ EMAIL HELPER ============
let emailTransporter = null;

async function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;
  
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  
  if (!SMTP_HOST) {
    // Use Ethereal for dev
    const testAccount = await nodemailer.createTestAccount();
    emailTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Using Ethereal test email account');
  } else {
    emailTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: SMTP_PORT === '465',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  
  return emailTransporter;
}

// ============ PDF HELPER ============
async function generateOrderPDF(orderId, tenantId) {
  const orderResult = await query(`
    SELECT o.*, c.name as client_name, c.phone as client_phone, 
           c.vehicle_plate, c.vehicle_model,
           t.name as tenant_name, t.logo_url, t.primary_color
    FROM orders o
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN tenants t ON o.tenant_id = t.id
    WHERE o.id = $1 AND o.tenant_id = $2
  `, [orderId, tenantId]);
  
  if (orderResult.rows.length === 0) {
    throw new Error('Order not found');
  }
  
  const order = orderResult.rows[0];
  
  const itemsResult = await query(`
    SELECT service_name, price, quantity
    FROM order_items
    WHERE order_id = $1
  `, [orderId]);
  
  const items = itemsResult.rows;
  
  const logoPath = order.logo_url || '/assets/logo/teste.png';
  const primaryColor = order.primary_color || '#0071CE';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; background: white; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid ${primaryColor}; }
        .logo { height: 80px; width: auto; object-fit: contain; }
        .company-name { font-size: 28px; font-weight: bold; color: ${primaryColor}; }
        .order-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 20px; }
        .info-section { margin-bottom: 25px; }
        .info-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
        .info-value { color: #333; font-size: 14px; margin-top: 5px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th { background: ${primaryColor}; color: white; padding: 12px; text-align: left; font-weight: bold; }
        .table td { padding: 10px; border-bottom: 1px solid #ddd; }
        .table tr:last-child td { border-bottom: none; }
        .total-row { font-weight: bold; font-size: 16px; background: #f5f5f5; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="file:///app/public${logoPath}" class="logo" alt="Logo" />
        <div class="company-name">${order.tenant_name}</div>
      </div>
      
      <div class="order-title">Ordem de Serviço #${order.order_number}</div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="info-section">
          <div class="info-label">Cliente</div>
          <div class="info-value">${order.client_name || 'N/A'}</div>
        </div>
        
        <div class="info-section">
          <div class="info-label">Telefone</div>
          <div class="info-value">${order.client_phone || 'N/A'}</div>
        </div>
        
        <div class="info-section">
          <div class="info-label">Veículo</div>
          <div class="info-value">${order.vehicle_model || 'N/A'} - ${order.vehicle_plate || 'N/A'}</div>
        </div>
        
        <div class="info-section">
          <div class="info-label">Data</div>
          <div class="info-value">${new Date(order.created_at).toLocaleString('pt-BR')}</div>
        </div>
        
        <div class="info-section">
          <div class="info-label">Status</div>
          <div class="info-value" style="text-transform: capitalize;">${order.status}</div>
        </div>
        
        ${order.payment_method ? `
        <div class="info-section">
          <div class="info-label">Forma de Pagamento</div>
          <div class="info-value">${order.payment_method}</div>
        </div>
        ` : ''}
      </div>
      
      <table class="table">
        <thead>
          <tr>
            <th>Serviço</th>
            <th style="text-align: center;">Qtd</th>
            <th style="text-align: right;">Preço Unit.</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.service_name}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">R$ ${parseFloat(item.price).toFixed(2)}</td>
              <td style="text-align: right;">R$ ${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3" style="text-align: right;">TOTAL:</td>
            <td style="text-align: right;">R$ ${parseFloat(order.total_amount).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      ${order.notes ? `
        <div class="info-section" style="margin-top: 30px;">
          <div class="info-label">Observações</div>
          <div class="info-value">${order.notes}</div>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Espaço Braite - Lava-Rápido e Estética Automotiva</p>
        <p>Obrigado pela preferência!</p>
      </div>
    </body>
    </html>
  `;
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });
  
  await browser.close();
  
  return pdf;
}

// ============ ROUTES ============

export async function GET(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  
  try {
    // ============ PUBLIC ROUTES ============
    if (path === '/health') {
      return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    
    if (path === '/setup') {
      await runMigrations();
      await runSeed();
      return NextResponse.json({ message: 'Database setup completed successfully' });
    }
    
    // ============ PROTECTED ROUTES ============
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { user } = auth;
    const tenantId = url.searchParams.get('tenant_id');
    const tenant = getTenantFromUser(user, tenantId);
    
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant access' }, { status: 403 });
    }
    
    // GET /me - Current user info
    if (path === '/me') {
      return NextResponse.json({ user });
    }
    
    // GET /dashboard - Dashboard analytics
    if (path === '/dashboard') {
      const timezone = 'America/Sao_Paulo';
      const now = new Date();
      
      // Today revenue
      const todayStart = format(now, 'yyyy-MM-dd', { timeZone: timezone });
      const todayResult = await query(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM orders
        WHERE tenant_id = $1 
          AND status = 'paid'
          AND DATE(paid_at AT TIME ZONE 'America/Sao_Paulo') = $2
      `, [tenant.tenant_id, todayStart]);
      
      // Last 15 days revenue
      const last15Result = await query(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM orders
        WHERE tenant_id = $1 
          AND status = 'paid'
          AND paid_at >= NOW() - INTERVAL '15 days'
      `, [tenant.tenant_id]);
      
      // Last 30 days revenue
      const last30Result = await query(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM orders
        WHERE tenant_id = $1 
          AND status = 'paid'
          AND paid_at >= NOW() - INTERVAL '30 days'
      `, [tenant.tenant_id]);
      
      // Recent orders
      const recentOrdersResult = await query(`
        SELECT o.*, c.name as client_name, c.vehicle_plate
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.tenant_id = $1
        ORDER BY o.created_at DESC
        LIMIT 10
      `, [tenant.tenant_id]);
      
      return NextResponse.json({
        revenue: {
          today: parseFloat(todayResult.rows[0].total),
          last15Days: parseFloat(last15Result.rows[0].total),
          last30Days: parseFloat(last30Result.rows[0].total)
        },
        recentOrders: recentOrdersResult.rows
      });
    }
    
    // GET /clients - List all clients
    if (path === '/clients') {
      const result = await query(`
        SELECT * FROM clients
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `, [tenant.tenant_id]);
      
      return NextResponse.json({ clients: result.rows });
    }
    
    // GET /services - List all services
    if (path === '/services') {
      const result = await query(`
        SELECT * FROM catalog_items
        WHERE tenant_id = $1
        ORDER BY name ASC
      `, [tenant.tenant_id]);
      
      return NextResponse.json({ services: result.rows });
    }
    
    // GET /orders - List all orders
    if (path === '/orders') {
      const result = await query(`
        SELECT o.*, c.name as client_name, c.vehicle_plate
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.tenant_id = $1
        ORDER BY o.created_at DESC
      `, [tenant.tenant_id]);
      
      return NextResponse.json({ orders: result.rows });
    }
    
    // GET /orders/:id - Get single order with items
    if (path.startsWith('/orders/') && !path.includes('/pdf')) {
      const orderId = path.split('/')[2];
      
      const orderResult = await query(`
        SELECT o.*, c.name as client_name, c.phone as client_phone,
               c.vehicle_plate, c.vehicle_model
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.id = $1 AND o.tenant_id = $2
      `, [orderId, tenant.tenant_id]);
      
      if (orderResult.rows.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      
      const itemsResult = await query(`
        SELECT * FROM order_items WHERE order_id = $1
      `, [orderId]);
      
      return NextResponse.json({
        order: {
          ...orderResult.rows[0],
          items: itemsResult.rows
        }
      });
    }
    
    // GET /orders/:id/pdf - Download PDF
    if (path.match(/\/orders\/[^\/]+\/pdf$/)) {
      const orderId = path.split('/')[2];
      
      const pdf = await generateOrderPDF(orderId, tenant.tenant_id);
      
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="OS-${orderId}.pdf"`
        }
      });
    }
    
    // GET /team - List team members
    if (path === '/team') {
      const result = await query(`
        SELECT u.id, u.email, u.username, u.full_name, ut.role, ut.created_at
        FROM user_tenants ut
        JOIN users u ON ut.user_id = u.id
        WHERE ut.tenant_id = $1
        ORDER BY ut.created_at DESC
      `, [tenant.tenant_id]);
      
      return NextResponse.json({ team: result.rows });
    }
    
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  
  try {
    // ============ PUBLIC ROUTES ============
    
    // POST /auth/login
    if (path === '/auth/login') {
      const body = await request.json();
      const { username, password } = body;
      
      if (!username || !password) {
        return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
      }
      
      const result = await query(
        'SELECT * FROM users WHERE username = $1 OR email = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      
      const user = result.rows[0];
      const validPassword = await comparePassword(password, user.password_hash);
      
      if (!validPassword) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      
      const userWithTenants = await getUserWithTenants(user.id);
      
      const accessToken = generateAccessToken({ userId: user.id });
      const refreshToken = generateRefreshToken({ userId: user.id });
      
      return NextResponse.json({
        user: userWithTenants,
        accessToken,
        refreshToken
      });
    }
    
    // POST /auth/refresh
    if (path === '/auth/refresh') {
      const body = await request.json();
      const { refreshToken } = body;
      
      if (!refreshToken) {
        return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
      }
      
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
      }
      
      const newAccessToken = generateAccessToken({ userId: decoded.userId });
      
      return NextResponse.json({ accessToken: newAccessToken });
    }
    
    // ============ PROTECTED ROUTES ============
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { user } = auth;
    const body = await request.json();
    const tenantId = body.tenant_id || url.searchParams.get('tenant_id');
    const tenant = getTenantFromUser(user, tenantId);
    
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant access' }, { status: 403 });
    }
    
    // POST /clients - Create client
    if (path === '/clients') {
      if (!hasPermission(tenant.role, 'create')) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
      
      const { name, phone, email, vehicle_plate, vehicle_model, notes } = body;
      
      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      
      const result = await query(`
        INSERT INTO clients (tenant_id, name, phone, email, vehicle_plate, vehicle_model, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [tenant.tenant_id, name, phone, email, vehicle_plate, vehicle_model, notes]);
      
      return NextResponse.json({ client: result.rows[0] }, { status: 201 });
    }
    
    // POST /services - Create service
    if (path === '/services') {
      if (!hasPermission(tenant.role, 'create')) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
      
      const { name, description, price, duration_minutes } = body;
      
      if (!name || !price) {
        return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
      }
      
      const result = await query(`
        INSERT INTO catalog_items (tenant_id, name, description, price, duration_minutes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [tenant.tenant_id, name, description, price, duration_minutes]);
      
      return NextResponse.json({ service: result.rows[0] }, { status: 201 });
    }
    
    // POST /orders - Create order
    if (path === '/orders') {
      if (!hasPermission(tenant.role, 'create')) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
      
      const { client_id, items, notes, status, payment_method } = body;
      
      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'Order must have at least one item' }, { status: 400 });
      }
      
      // Calculate total
      const total = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
      
      // Generate order number
      const orderNumber = 'OS-' + Date.now();
      
      // Create order
      const orderResult = await query(`
        INSERT INTO orders (tenant_id, client_id, order_number, status, total_amount, payment_method, notes, created_by, paid_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        tenant.tenant_id,
        client_id || null,
        orderNumber,
        status || 'pending',
        total,
        payment_method || null,
        notes || null,
        user.id,
        (status === 'paid' ? new Date() : null)
      ]);
      
      const orderId = orderResult.rows[0].id;
      
      // Create order items
      for (const item of items) {
        await query(`
          INSERT INTO order_items (order_id, catalog_item_id, service_name, price, quantity)
          VALUES ($1, $2, $3, $4, $5)
        `, [orderId, item.catalog_item_id || null, item.service_name, item.price, item.quantity || 1]);
      }
      
      return NextResponse.json({ order: orderResult.rows[0] }, { status: 201 });
    }
    
    // POST /team/invite - Invite team member
    if (path === '/team/invite') {
      if (!hasPermission(tenant.role, 'manage_team')) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
      
      const { email, role } = body;
      
      if (!email || !role) {
        return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
      }
      
      if (!['manager', 'attendant', 'viewer'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      
      // Check if user already exists
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }
      
      // Generate invite token
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await query(`
        INSERT INTO invite_tokens (token, email, tenant_id, role, invited_by, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [token, email, tenant.tenant_id, role, user.id, expiresAt]);
      
      // Send email
      try {
        const transporter = await getEmailTransporter();
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${token}`;
        
        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@espacobraite.com',
          to: email,
          subject: `Convite para ${tenant.tenant_name}`,
          html: `
            <h2>Você foi convidado!</h2>
            <p>Você foi convidado para fazer parte da equipe <strong>${tenant.tenant_name}</strong> como <strong>${role}</strong>.</p>
            <p>Clique no link abaixo para aceitar o convite:</p>
            <a href="${inviteUrl}">${inviteUrl}</a>
            <p>Este convite expira em 7 dias.</p>
          `
        });
        
        console.log('📧 Email sent:', info.messageId);
        if (process.env.SMTP_HOST === '') {
          console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
        }
      } catch (emailError) {
        console.error('Email error:', emailError);
        return NextResponse.json({
          message: 'Invite created but email failed to send',
          token
        }, { status: 201 });
      }
      
      return NextResponse.json({ message: 'Invite sent successfully' }, { status: 201 });
    }
    
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { user } = auth;
    const body = await request.json();
    const tenantId = body.tenant_id || url.searchParams.get('tenant_id');
    const tenant = getTenantFromUser(user, tenantId);
    
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant access' }, { status: 403 });
    }
    
    // PUT /orders/:id - Update order
    if (path.startsWith('/orders/')) {
      if (!hasPermission(tenant.role, 'update')) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
      
      const orderId = path.split('/')[2];
      const { status, payment_method, notes } = body;
      
      const paidAt = status === 'paid' ? new Date() : null;
      
      const result = await query(`
        UPDATE orders
        SET status = COALESCE($1, status),
            payment_method = COALESCE($2, payment_method),
            notes = COALESCE($3, notes),
            paid_at = COALESCE($4, paid_at),
            updated_at = NOW()
        WHERE id = $5 AND tenant_id = $6
        RETURNING *
      `, [status, payment_method, notes, paidAt, orderId, tenant.tenant_id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      
      return NextResponse.json({ order: result.rows[0] });
    }
    
    // PUT /clients/:id - Update client
    if (path.startsWith('/clients/')) {
      if (!hasPermission(tenant.role, 'update')) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
      
      const clientId = path.split('/')[2];
      const { name, phone, email, vehicle_plate, vehicle_model, notes } = body;
      
      const result = await query(`
        UPDATE clients
        SET name = COALESCE($1, name),
            phone = COALESCE($2, phone),
            email = COALESCE($3, email),
            vehicle_plate = COALESCE($4, vehicle_plate),
            vehicle_model = COALESCE($5, vehicle_model),
            notes = COALESCE($6, notes),
            updated_at = NOW()
        WHERE id = $7 AND tenant_id = $8
        RETURNING *
      `, [name, phone, email, vehicle_plate, vehicle_model, notes, clientId, tenant.tenant_id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      
      return NextResponse.json({ client: result.rows[0] });
    }
    
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { user } = auth;
    const tenantId = url.searchParams.get('tenant_id');
    const tenant = getTenantFromUser(user, tenantId);
    
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant access' }, { status: 403 });
    }
    
    if (!hasPermission(tenant.role, 'delete')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // DELETE /clients/:id
    if (path.startsWith('/clients/')) {
      const clientId = path.split('/')[2];
      
      const result = await query(`
        DELETE FROM clients
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `, [clientId, tenant.tenant_id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      
      return NextResponse.json({ message: 'Client deleted successfully' });
    }
    
    // DELETE /services/:id
    if (path.startsWith('/services/')) {
      const serviceId = path.split('/')[2];
      
      const result = await query(`
        DELETE FROM catalog_items
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `, [serviceId, tenant.tenant_id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }
      
      return NextResponse.json({ message: 'Service deleted successfully' });
    }
    
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
