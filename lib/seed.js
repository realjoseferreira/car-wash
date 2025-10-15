import { query } from './db.js';
import bcrypt from 'bcryptjs';

export async function runSeed() {
  console.log('Running seed data...');
  
  try {
    // Check if seed data already exists
    const existingTenant = await query(
      "SELECT id FROM tenants WHERE slug = 'espaco-braite-demo'"
    );
    
    if (existingTenant.rows.length > 0) {
      console.log('Seed data already exists, skipping...');
      return;
    }
    
    // Create demo tenant
    const tenantResult = await query(`
      INSERT INTO tenants (name, slug, primary_color, logo_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['Espaço Braite Demo', 'espaco-braite-demo', '#0071CE', '/assets/logo/teste.png']);
    
    const tenantId = tenantResult.rows[0].id;
    console.log('✓ Created demo tenant:', tenantId);
    
    // Create admin user
    const passwordHash = await bcrypt.hash('123', 10);
    const userResult = await query(`
      INSERT INTO users (email, username, password_hash, full_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['admin1@braite.test', 'admin1', passwordHash, 'Admin Braite']);
    
    const userId = userResult.rows[0].id;
    console.log('✓ Created admin user:', userId);
    
    // Assign owner role
    await query(`
      INSERT INTO user_tenants (user_id, tenant_id, role)
      VALUES ($1, $2, $3)
    `, [userId, tenantId, 'owner']);
    console.log('✓ Assigned owner role');
    
    // Create sample services
    const services = [
      { name: 'Lavagem Completa', description: 'Lavagem externa e interna', price: 50.00, duration: 60 },
      { name: 'Lavagem Simples', description: 'Lavagem externa', price: 30.00, duration: 30 },
      { name: 'Polimento', description: 'Polimento e cristalização', price: 150.00, duration: 180 },
      { name: 'Enceramento', description: 'Enceramento com cera premium', price: 80.00, duration: 90 },
      { name: 'Higienização Interna', description: 'Limpeza profunda dos estofados', price: 120.00, duration: 120 },
    ];
    
    for (const service of services) {
      await query(`
        INSERT INTO catalog_items (tenant_id, name, description, price, duration_minutes)
        VALUES ($1, $2, $3, $4, $5)
      `, [tenantId, service.name, service.description, service.price, service.duration]);
    }
    console.log('✓ Created sample services');
    
    // Create sample client
    const clientResult = await query(`
      INSERT INTO clients (tenant_id, name, phone, email, vehicle_plate, vehicle_model)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [tenantId, 'João Silva', '(11) 98765-4321', 'joao@example.com', 'ABC-1234', 'Honda Civic 2020']);
    
    const clientId = clientResult.rows[0].id;
    console.log('✓ Created sample client');
    
    // Create sample paid order (for dashboard testing)
    const orderNumber = 'OS-' + Date.now();
    const orderResult = await query(`
      INSERT INTO orders (tenant_id, client_id, order_number, status, total_amount, payment_method, paid_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [tenantId, clientId, orderNumber, 'paid', 80.00, 'Dinheiro', new Date(), userId]);
    
    const orderId = orderResult.rows[0].id;
    
    await query(`
      INSERT INTO order_items (order_id, catalog_item_id, service_name, price, quantity)
      VALUES ($1, (SELECT id FROM catalog_items WHERE tenant_id = $2 AND name = 'Lavagem Completa' LIMIT 1), 'Lavagem Completa', 50.00, 1),
             ($1, (SELECT id FROM catalog_items WHERE tenant_id = $2 AND name = 'Lavagem Simples' LIMIT 1), 'Lavagem Simples', 30.00, 1)
    `, [orderId, tenantId]);
    
    console.log('✓ Created sample order');
    
    console.log('\n✅ Seed completed successfully!');
    console.log('\n📝 Demo Credentials:');
    console.log('   Email: admin1@braite.test');
    console.log('   Username: admin1');
    console.log('   Password: 123');
    console.log('');
    
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
}
