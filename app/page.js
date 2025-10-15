'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Wrench, 
  LogOut, 
  Plus, 
  Download,
  Calendar,
  Car,
  Phone,
  Mail,
  UserPlus,
  Menu,
  X as CloseIcon
} from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  
  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [team, setTeam] = useState([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Dialog states
  const [newOrderDialog, setNewOrderDialog] = useState(false);
  const [newClientDialog, setNewClientDialog] = useState(false);
  const [newServiceDialog, setNewServiceDialog] = useState(false);
  
  // Form states
  const [orderForm, setOrderForm] = useState({
    client_id: '',
    items: [],
    status: 'pending',
    payment_method: '',
    notes: ''
  });
  
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    email: '',
    vehicle_plate: '',
    vehicle_model: '',
    notes: ''
  });
  
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: ''
  });
  
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setAccessToken(token);
      fetchUserData(token);
    } else {
      setLoading(false);
    }
  }, []);
  
  const fetchUserData = async (token) => {
    try {
      const response = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setCurrentTenant(data.user.tenants[0]);
        setIsAuthenticated(true);
        loadDashboard(token, data.user.tenants[0].tenant_id);
      } else {
        localStorage.removeItem('access_token');
        setAccessToken(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        setAccessToken(data.accessToken);
        setUser(data.user);
        setCurrentTenant(data.user.tenants[0]);
        setIsAuthenticated(true);
        toast.success('Login realizado com sucesso!');
        loadDashboard(data.accessToken, data.user.tenants[0].tenant_id);
      } else {
        toast.error(data.error || 'Credenciais inválidas');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setLoginLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setUser(null);
    setCurrentTenant(null);
    setIsAuthenticated(false);
    setActiveTab('dashboard');
    toast.success('Logout realizado com sucesso!');
  };
  
  const apiRequest = async (endpoint, options = {}) => {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    const url = endpoint.includes('?') 
      ? `${endpoint}&tenant_id=${currentTenant?.tenant_id}`
      : `${endpoint}?tenant_id=${currentTenant?.tenant_id}`;
    
    return fetch(url, { ...options, headers });
  };
  
  const loadDashboard = async (token, tenantId) => {
    try {
      const response = await fetch(`/api/dashboard?tenant_id=${tenantId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };
  
  const loadOrders = async () => {
    try {
      const response = await apiRequest('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };
  
  const loadClients = async () => {
    try {
      const response = await apiRequest('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };
  
  const loadServices = async () => {
    try {
      const response = await apiRequest('/api/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data.services);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };
  
  const loadTeam = async () => {
    try {
      const response = await apiRequest('/api/team');
      if (response.ok) {
        const data = await response.json();
        setTeam(data.team);
      }
    } catch (error) {
      console.error('Error loading team:', error);
    }
  };
  
  const handleCreateClient = async (e) => {
    e.preventDefault();
    
    try {
      const response = await apiRequest('/api/clients', {
        method: 'POST',
        body: JSON.stringify(clientForm)
      });
      
      if (response.ok) {
        toast.success('Cliente criado com sucesso!');
        setNewClientDialog(false);
        setClientForm({ name: '', phone: '', email: '', vehicle_plate: '', vehicle_model: '', notes: '' });
        loadClients();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao criar cliente');
      }
    } catch (error) {
      toast.error('Erro ao criar cliente');
    }
  };
  
  const handleCreateService = async (e) => {
    e.preventDefault();
    
    try {
      const response = await apiRequest('/api/services', {
        method: 'POST',
        body: JSON.stringify({
          ...serviceForm,
          price: parseFloat(serviceForm.price),
          duration_minutes: parseInt(serviceForm.duration_minutes)
        })
      });
      
      if (response.ok) {
        toast.success('Serviço criado com sucesso!');
        setNewServiceDialog(false);
        setServiceForm({ name: '', description: '', price: '', duration_minutes: '' });
        loadServices();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao criar serviço');
      }
    } catch (error) {
      toast.error('Erro ao criar serviço');
    }
  };
  
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    
    if (orderForm.items.length === 0) {
      toast.error('Adicione pelo menos um serviço');
      return;
    }
    
    try {
      const response = await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderForm)
      });
      
      if (response.ok) {
        toast.success('Ordem de serviço criada com sucesso!');
        setNewOrderDialog(false);
        setOrderForm({ client_id: '', items: [], status: 'pending', payment_method: '', notes: '' });
        loadOrders();
        loadDashboard(accessToken, currentTenant.tenant_id);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao criar ordem');
      }
    } catch (error) {
      toast.error('Erro ao criar ordem');
    }
  };
  
  const addServiceToOrder = (service) => {
    const existingItem = orderForm.items.find(item => item.catalog_item_id === service.id);
    
    if (existingItem) {
      setOrderForm({
        ...orderForm,
        items: orderForm.items.map(item => 
          item.catalog_item_id === service.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      setOrderForm({
        ...orderForm,
        items: [...orderForm.items, {
          catalog_item_id: service.id,
          service_name: service.name,
          price: parseFloat(service.price),
          quantity: 1
        }]
      });
    }
  };
  
  const removeServiceFromOrder = (index) => {
    setOrderForm({
      ...orderForm,
      items: orderForm.items.filter((_, i) => i !== index)
    });
  };
  
  const downloadPDF = async (orderId) => {
    try {
      const response = await apiRequest(`/api/orders/${orderId}/pdf`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OS-${orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF baixado com sucesso!');
      } else {
        toast.error('Erro ao baixar PDF');
      }
    } catch (error) {
      toast.error('Erro ao baixar PDF');
    }
  };
  
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      paid: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };
  
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      completed: 'Concluído',
      paid: 'Pago',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  };
  
  useEffect(() => {
    if (isAuthenticated && currentTenant) {
      if (activeTab === 'orders') loadOrders();
      if (activeTab === 'clients') loadClients();
      if (activeTab === 'services') loadServices();
      if (activeTab === 'team') loadTeam();
    }
  }, [activeTab, isAuthenticated, currentTenant]);
  
  // Sidebar Navigation Component
  const SidebarNav = ({ onNavigate, closeMobile }) => (
    <nav className="space-y-1 p-3">
      <button
        onClick={() => { onNavigate('dashboard'); closeMobile?.(); }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left min-h-[44px] ${
          activeTab === 'dashboard' 
            ? 'bg-[#0071CE] text-white' 
            : 'hover:bg-accent text-foreground'
        }`}
      >
        <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
        <span className="text-base md:text-sm">Dashboard</span>
      </button>
      
      <button
        onClick={() => { onNavigate('orders'); closeMobile?.(); }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left min-h-[44px] ${
          activeTab === 'orders' 
            ? 'bg-[#0071CE] text-white' 
            : 'hover:bg-accent text-foreground'
        }`}
      >
        <FileText className="h-5 w-5 flex-shrink-0" />
        <span className="text-base md:text-sm whitespace-nowrap">Ordens de Serviço</span>
      </button>
      
      <button
        onClick={() => { onNavigate('clients'); closeMobile?.(); }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left min-h-[44px] ${
          activeTab === 'clients' 
            ? 'bg-[#0071CE] text-white' 
            : 'hover:bg-accent text-foreground'
        }`}
      >
        <Users className="h-5 w-5 flex-shrink-0" />
        <span className="text-base md:text-sm">Clientes</span>
      </button>
      
      <button
        onClick={() => { onNavigate('services'); closeMobile?.(); }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left min-h-[44px] ${
          activeTab === 'services' 
            ? 'bg-[#0071CE] text-white' 
            : 'hover:bg-accent text-foreground'
        }`}
      >
        <Wrench className="h-5 w-5 flex-shrink-0" />
        <span className="text-base md:text-sm">Serviços</span>
      </button>
      
      <button
        onClick={() => { onNavigate('team'); closeMobile?.(); }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left min-h-[44px] ${
          activeTab === 'team' 
            ? 'bg-[#0071CE] text-white' 
            : 'hover:bg-accent text-foreground'
        }`}
      >
        <UserPlus className="h-5 w-5 flex-shrink-0" />
        <span className="text-base md:text-sm">Equipe</span>
      </button>
    </nav>
  );
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071CE] mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm md:text-base">Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src="/assets/logo/teste.png" alt="Espaço Braite" className="h-24 sm:h-32 w-auto object-contain" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl" style={{ color: '#0071CE' }}>Espaço Braite</CardTitle>
              <CardDescription className="text-sm sm:text-base">Sistema de Ordens de Serviço</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm sm:text-base">Usuário ou Email</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin1"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  className="h-11 sm:h-10 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="h-11 sm:h-10 text-base"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 sm:h-10 text-base sm:text-sm"
                style={{ backgroundColor: '#0071CE' }}
                disabled={loginLoading}
              >
                {loginLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            <div className="mt-4 text-center text-xs sm:text-sm text-muted-foreground">
              <p>Demo: admin1 / 123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-14 flex items-center px-4">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[80%] max-w-sm p-0">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-border">
                <div className="flex items-center space-x-3">
                  <img src="/assets/logo/teste.png" alt="Logo" className="h-12 w-12 object-contain rounded" />
                  <div>
                    <h2 className="font-bold text-base" style={{ color: '#0071CE' }}>Espaço Braite</h2>
                    <p className="text-xs text-muted-foreground">{currentTenant?.tenant_name}</p>
                  </div>
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <SidebarNav onNavigate={setActiveTab} closeMobile={() => setMobileMenuOpen(false)} />
              </ScrollArea>
              
              <div className="p-4 border-t border-border">
                <div className="flex items-center space-x-3 mb-3 px-2">
                  <div className="h-10 w-10 rounded-full bg-[#0071CE] flex items-center justify-center text-white font-bold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentTenant?.role}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full min-h-[44px]"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="flex items-center flex-1">
          <img src="/assets/logo/teste.png" alt="Logo" className="h-8 w-8 object-contain mr-2" />
          <span className="font-bold text-sm" style={{ color: '#0071CE' }}>Espaço Braite</span>
        </div>
        
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-[#0071CE] flex items-center justify-center text-white text-xs font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 pt-14 lg:pt-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col">
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <img src="/assets/logo/teste.png" alt="Logo" className="h-12 w-12 object-contain rounded" />
              <div>
                <h2 className="font-bold text-lg" style={{ color: '#0071CE' }}>Espaço Braite</h2>
                <p className="text-xs text-muted-foreground">{currentTenant?.tenant_name}</p>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1 py-4">
            <SidebarNav onNavigate={setActiveTab} />
          </ScrollArea>
          
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 mb-3 px-2">
              <div className="h-8 w-8 rounded-full bg-[#0071CE] flex items-center justify-center text-white font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.username}</p>
                <p className="text-xs text-muted-foreground truncate">{currentTenant?.role}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Dashboard */}
            {activeTab === 'dashboard' && dashboard && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
                  <p className="text-sm sm:text-base text-muted-foreground">Visão geral do faturamento</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Hoje</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold break-words" style={{ color: '#0071CE' }}>
                        R$ {dashboard.revenue.today.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Últimos 15 Dias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold break-words" style={{ color: '#0071CE' }}>
                        R$ {dashboard.revenue.last15Days.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="sm:col-span-2 lg:col-span-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Últimos 30 Dias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold break-words" style={{ color: '#0071CE' }}>
                        R$ {dashboard.revenue.last30Days.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Ordens Recentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.recentOrders?.map((order) => (
                        <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-accent/50 rounded-lg space-y-2 sm:space-y-0">
                          <div className="flex-1">
                            <p className="font-medium text-sm sm:text-base">{order.order_number}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground break-words">{order.client_name || 'Cliente não informado'}</p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end sm:text-right space-x-2">
                            <p className="font-bold text-sm sm:text-base" style={{ color: '#0071CE' }}>
                              R$ {parseFloat(order.total_amount).toFixed(2)}
                            </p>
                            <Badge className={`${getStatusColor(order.status)} text-xs whitespace-nowrap`}>
                              {getStatusLabel(order.status)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Orders */}
            {activeTab === 'orders' && (
              <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Ordens de Serviço</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Gerencie todas as ordens</p>
                  </div>
                  <Dialog open={newOrderDialog} onOpenChange={setNewOrderDialog}>
                    <DialogTrigger asChild>
                      <Button className="hidden sm:flex" style={{ backgroundColor: '#0071CE' }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova O.S.
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Nova Ordem de Serviço</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateOrder} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Cliente</Label>
                          <Select value={orderForm.client_id} onValueChange={(value) => setOrderForm({...orderForm, client_id: value})}>
                            <SelectTrigger className="h-11 sm:h-10">
                              <SelectValue placeholder="Selecione um cliente" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name} {client.vehicle_plate && `(${client.vehicle_plate})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Serviços</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            {services.map((service) => (
                              <Button
                                key={service.id}
                                type="button"
                                variant="outline"
                                onClick={() => addServiceToOrder(service)}
                                className="justify-start h-auto py-2 text-left min-h-[44px]"
                              >
                                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-xs sm:text-sm break-words">{service.name} - R$ {parseFloat(service.price).toFixed(2)}</span>
                              </Button>
                            ))}
                          </div>
                          
                          {orderForm.items.length > 0 && (
                            <div className="border rounded-lg p-3 space-y-2">
                              {orderForm.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center min-h-[44px]">
                                  <span className="text-sm flex-1">{item.service_name} x{item.quantity}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-sm">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeServiceFromOrder(index)}
                                      className="min-h-[44px] min-w-[44px]"
                                    >
                                      <CloseIcon className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              <Separator />
                              <div className="flex justify-between font-bold">
                                <span>Total:</span>
                                <span style={{ color: '#0071CE' }}>
                                  R$ {orderForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={orderForm.status} onValueChange={(value) => setOrderForm({...orderForm, status: value})}>
                              <SelectTrigger className="h-11 sm:h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="in_progress">Em Andamento</SelectItem>
                                <SelectItem value="completed">Concluído</SelectItem>
                                <SelectItem value="paid">Pago</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Forma de Pagamento</Label>
                            <Select value={orderForm.payment_method} onValueChange={(value) => setOrderForm({...orderForm, payment_method: value})}>
                              <SelectTrigger className="h-11 sm:h-10">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                                <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                                <SelectItem value="PIX">PIX</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Observações</Label>
                          <Textarea
                            value={orderForm.notes}
                            onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                            placeholder="Observações adicionais..."
                            className="min-h-[100px]"
                          />
                        </div>
                        
                        <div className="flex flex-col-reverse sm:flex-row justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
                          <Button type="button" variant="outline" onClick={() => setNewOrderDialog(false)} className="h-11 sm:h-10">
                            Cancelar
                          </Button>
                          <Button type="submit" style={{ backgroundColor: '#0071CE' }} className="h-11 sm:h-10">
                            Criar O.S.
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="grid gap-3 sm:gap-4">
                  {orders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                            <div className="space-y-1 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg sm:text-xl font-bold">{order.order_number}</h3>
                                <Badge className={`${getStatusColor(order.status)} text-xs whitespace-nowrap`}>
                                  {getStatusLabel(order.status)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground break-words">
                                <Car className="h-4 w-4 inline mr-1" />
                                {order.client_name || 'Cliente não informado'}
                                {order.vehicle_plate && ` - ${order.vehicle_plate}`}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                {new Date(order.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start space-x-2 sm:space-x-0 sm:space-y-2">
                              <p className="text-xl sm:text-2xl font-bold break-words" style={{ color: '#0071CE' }}>
                                R$ {parseFloat(order.total_amount).toFixed(2)}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadPDF(order.id)}
                                className="whitespace-nowrap min-h-[44px] sm:min-h-[36px]"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                PDF
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Mobile FAB for New Order */}
                <Dialog open={newOrderDialog} onOpenChange={setNewOrderDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      className="sm:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
                      style={{ backgroundColor: '#0071CE' }}
                      size="icon"
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            )}
            
            {/* Clients */}
            {activeTab === 'clients' && (
              <div className="space-y-4 sm:space-y-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Clientes</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Gerencie sua carteira de clientes</p>
                  </div>
                  <Dialog open={newClientDialog} onOpenChange={setNewClientDialog}>
                    <DialogTrigger asChild>
                      <Button style={{ backgroundColor: '#0071CE' }} className="h-11 sm:h-10 w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Cliente
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Novo Cliente</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateClient} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome *</Label>
                          <Input
                            value={clientForm.name}
                            onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                            placeholder="Nome do cliente"
                            required
                            className="h-11 sm:h-10"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Telefone</Label>
                            <Input
                              type="tel"
                              value={clientForm.phone}
                              onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                              placeholder="(11) 99999-9999"
                              className="h-11 sm:h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={clientForm.email}
                              onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                              placeholder="email@exemplo.com"
                              className="h-11 sm:h-10"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Placa do Veículo</Label>
                            <Input
                              value={clientForm.vehicle_plate}
                              onChange={(e) => setClientForm({...clientForm, vehicle_plate: e.target.value})}
                              placeholder="ABC-1234"
                              className="h-11 sm:h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Modelo do Veículo</Label>
                            <Input
                              value={clientForm.vehicle_model}
                              onChange={(e) => setClientForm({...clientForm, vehicle_model: e.target.value})}
                              placeholder="Honda Civic 2020"
                              className="h-11 sm:h-10"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Observações</Label>
                          <Textarea
                            value={clientForm.notes}
                            onChange={(e) => setClientForm({...clientForm, notes: e.target.value})}
                            placeholder="Observações sobre o cliente..."
                            className="min-h-[100px]"
                          />
                        </div>
                        
                        <div className="flex flex-col-reverse sm:flex-row justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
                          <Button type="button" variant="outline" onClick={() => setNewClientDialog(false)} className="h-11 sm:h-10">
                            Cancelar
                          </Button>
                          <Button type="submit" style={{ backgroundColor: '#0071CE' }} className="h-11 sm:h-10">
                            Criar Cliente
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="grid gap-3 sm:gap-4">
                  {clients.map((client) => (
                    <Card key={client.id}>
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-2">
                          <h3 className="text-lg sm:text-xl font-bold break-words">{client.name}</h3>
                          {client.phone && (
                            <p className="text-sm text-muted-foreground">
                              <Phone className="h-4 w-4 inline mr-1" />
                              {client.phone}
                            </p>
                          )}
                          {client.email && (
                            <p className="text-sm text-muted-foreground break-words">
                              <Mail className="h-4 w-4 inline mr-1" />
                              {client.email}
                            </p>
                          )}
                          {client.vehicle_model && (
                            <p className="text-sm text-muted-foreground break-words">
                              <Car className="h-4 w-4 inline mr-1" />
                              {client.vehicle_model} {client.vehicle_plate && `- ${client.vehicle_plate}`}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Services */}
            {activeTab === 'services' && (
              <div className="space-y-4 sm:space-y-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Serviços</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Catálogo de serviços</p>
                  </div>
                  <Dialog open={newServiceDialog} onOpenChange={setNewServiceDialog}>
                    <DialogTrigger asChild>
                      <Button style={{ backgroundColor: '#0071CE' }} className="h-11 sm:h-10 w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Serviço
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Novo Serviço</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateService} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome do Serviço *</Label>
                          <Input
                            value={serviceForm.name}
                            onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                            placeholder="Ex: Lavagem Completa"
                            required
                            className="h-11 sm:h-10"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Textarea
                            value={serviceForm.description}
                            onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                            placeholder="Descrição do serviço..."
                            className="min-h-[100px]"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Preço (R$) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              inputMode="decimal"
                              value={serviceForm.price}
                              onChange={(e) => setServiceForm({...serviceForm, price: e.target.value})}
                              placeholder="0.00"
                              required
                              className="h-11 sm:h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Duração (minutos)</Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              value={serviceForm.duration_minutes}
                              onChange={(e) => setServiceForm({...serviceForm, duration_minutes: e.target.value})}
                              placeholder="60"
                              className="h-11 sm:h-10"
                            />
                          </div>
                        </div>
                        
                        <div className="flex flex-col-reverse sm:flex-row justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
                          <Button type="button" variant="outline" onClick={() => setNewServiceDialog(false)} className="h-11 sm:h-10">
                            Cancelar
                          </Button>
                          <Button type="submit" style={{ backgroundColor: '#0071CE' }} className="h-11 sm:h-10">
                            Criar Serviço
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {services.map((service) => (
                    <Card key={service.id}>
                      <CardHeader>
                        <CardTitle className="text-base sm:text-lg break-words">{service.name}</CardTitle>
                        {service.description && (
                          <CardDescription className="text-sm break-words">{service.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <p className="text-xl sm:text-2xl font-bold break-words" style={{ color: '#0071CE' }}>
                            R$ {parseFloat(service.price).toFixed(2)}
                          </p>
                          {service.duration_minutes && (
                            <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                              {service.duration_minutes} min
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Team */}
            {activeTab === 'team' && (
              <div className="space-y-4 sm:space-y-6 pb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Equipe</h1>
                  <p className="text-sm sm:text-base text-muted-foreground">Membros da sua equipe</p>
                </div>
                
                <div className="grid gap-3 sm:gap-4">
                  {team.map((member) => (
                    <Card key={member.id}>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="h-12 w-12 flex-shrink-0 rounded-full bg-[#0071CE] flex items-center justify-center text-white font-bold text-base sm:text-lg">
                            {member.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-bold break-words">{member.full_name || member.username}</h3>
                            <p className="text-sm text-muted-foreground break-words">{member.email}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">{member.role}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
