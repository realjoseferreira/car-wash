import { query } from './db.js';

export async function runMigrations() {
  console.log('Running migrations...');
  
  try {
    // Create tenants table
    await query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        logo_url TEXT,
        primary_color VARCHAR(7) DEFAULT '#0071CE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ Created tenants table');
    
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ Created users table');
    
    // Create user_tenants (many-to-many with roles)
    await query(`
      CREATE TABLE IF NOT EXISTS user_tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'attendant', 'viewer')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, tenant_id)
      )
    `);
    console.log('✓ Created user_tenants table');
    
    // Create clients table
    await query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        vehicle_plate VARCHAR(20),
        vehicle_model VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ Created clients table');
    
    // Create catalog_items (services)
    await query(`
      CREATE TABLE IF NOT EXISTS catalog_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        duration_minutes INTEGER,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ Created catalog_items table');
    
    // Create orders (O.S.)
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'paid', 'cancelled')),
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(50),
        paid_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ Created orders table');
    
    // Create order_items
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
        service_name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ Created order_items table');
    
    // Create invite_tokens table
    await query(`
      CREATE TABLE IF NOT EXISTS invite_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ Created invite_tokens table');
    
    // Create audit_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        changes JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✓ Created audit_logs table');
    
    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant ON catalog_items(tenant_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at)');
    await query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_tenants_user ON user_tenants(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant ON user_tenants(tenant_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token)');
    console.log('✓ Created indexes');
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}
