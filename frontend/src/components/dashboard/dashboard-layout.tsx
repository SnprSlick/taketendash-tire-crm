'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Car,
  Settings,
  TrendingUp,
  Calendar,
  Users,
  Building2,
  Bell,
  User,
  Gauge,
  Database,
  ClipboardCheck,
  Package,
  FileText,
  BarChart3,
  Tag,
  Disc,
  Wrench,
  Store,
  Shield,
  LogOut
} from 'lucide-react';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
}

export default function DashboardLayout({ children, title = 'Tire CRM Dashboard', fullWidth = false }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { stores, selectedStoreId, setSelectedStoreId, loading } = useStore();
  const { user, logout, hasRole, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (user) {
      console.log('DashboardLayout User:', user);
      console.log('User Stores:', user.stores);
      console.log('All Stores:', stores);
    }
    if (!isLoading) {
      if (!isAuthenticated) {
        window.location.href = '/login';
      } else if (user?.mustChangePassword) {
        window.location.href = '/change-password';
      } else if (user?.role === 'SALESPERSON') {
        // Redirect Salesperson to their specific report
        const displayName = user.employeeName || `${user.firstName} ${user.lastName}`;
        const salespersonReportPath = `/dashboard/sales/reports/salesperson/${encodeURIComponent(displayName)}`;
        
        // Allow access to their report page and profile/settings
        if (pathname === '/' || pathname === '/dashboard' || pathname === '/dashboard/sales' || pathname === '/dashboard/sales/reports') {
          window.location.href = salespersonReportPath;
        }
      } else if (user?.role === 'MECHANIC') {
        // Redirect Mechanic to their specific dashboard
        const displayName = user.employeeName || `${user.firstName} ${user.lastName}`;
        const mechanicDashboardPath = `/dashboard/mechanic/${encodeURIComponent(displayName)}`;
        
        // Allow access to their dashboard and profile/settings
        if (pathname === '/' || pathname === '/dashboard' || pathname === '/mechanic' || pathname.startsWith('/dashboard/sales')) {
          window.location.href = mechanicDashboardPath;
        }
      } else if (user?.role === 'STORE_MANAGER') {
        // Restrict access for Store Manager
        const restrictedPaths = [
          '/stores',
          '/insights',
          '/dashboard/reconciliation',
          '/dashboard/inventory',
          '/brands',
          '/tire-master'
        ];
        
        if (restrictedPaths.some(path => pathname.startsWith(path))) {
          window.location.href = '/dashboard/sales';
        }
      }
    }
  }, [isLoading, isAuthenticated, user, pathname]);

  // Filter stores based on user access
  const allowedStores = stores.filter(store => 
    user?.role === 'ADMINISTRATOR' || 
    user?.role === 'CORPORATE' || 
    user?.role === 'WHOLESALE' ||
    (user?.stores && user.stores.includes(store.id))
  );

  const isCorporateLevel = user?.role === 'ADMINISTRATOR' || user?.role === 'CORPORATE' || user?.role === 'WHOLESALE';
  const allStoresLabel = isCorporateLevel ? 'Corporate' : 'All Stores';

  // Auto-select store if user only has access to one
  useEffect(() => {
    if (user && !isCorporateLevel && allowedStores.length === 1 && selectedStoreId !== allowedStores[0].id) {
      setSelectedStoreId(allowedStores[0].id);
    }
  }, [user, isCorporateLevel, allowedStores, selectedStoreId, setSelectedStoreId]);

  const isActive = (href: string) => {
    if (href === '/dashboard/sales') {
      // Exact match for sales dashboard to avoid highlighting on sub-routes like reports
      return pathname === '/' || pathname === '/dashboard/sales';
    }
    return pathname === href || pathname.startsWith(href);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  const containerClass = fullWidth ? "max-w-[98%]" : "max-w-7xl";
  const isSalesperson = user?.role === 'SALESPERSON';
  const isMechanic = user?.role === 'MECHANIC';
  const isStoreManager = user?.role === 'STORE_MANAGER';
  const isCorporate = user?.role === 'CORPORATE';
  const isWholesale = user?.role === 'WHOLESALE';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-slate-200/50 relative z-50">
        <div className={`${containerClass} mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="flex justify-between items-center h-24">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img 
                  src="https://taketentire.com/wp-content/uploads/2022/03/Take-Ten.png.webp" 
                  alt="10Manager" 
                  className="h-[67px] w-auto object-contain"
                />
                <span className="text-2xl font-bold text-slate-800 tracking-tight">10Manage</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                {(allowedStores.length > 1 || isCorporateLevel) ? (
                  <select
                    value={selectedStoreId || ''}
                    onChange={(e) => setSelectedStoreId(e.target.value || null)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={loading}
                  >
                    <option value="">{allStoresLabel}</option>
                    {allowedStores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  allowedStores.length === 1 && (
                    <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
                      {allowedStores[0].name}
                    </div>
                  )
                )}
              </div>
              <button className="relative p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              </button>
              
              <div className="h-8 w-px bg-slate-200 mx-2"></div>

              <div className="flex items-center space-x-4">
                {!isStoreManager && !isSalesperson && !isMechanic && !isCorporate && !isWholesale && (
                  <a 
                    href="/tire-master"
                    className={`hidden md:flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium transition-all shadow-sm ${isActive('/tire-master') ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}
                  >
                    <Database className="w-4 h-4" />
                    <span>Config</span>
                  </a>
                )}
                {hasRole('ADMINISTRATOR') && (
                  <a 
                    href="/dashboard/admin/users"
                    className={`hidden md:flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium transition-all shadow-sm ${isActive('/dashboard/admin') ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </a>
                )}
                <div className="text-right hidden sm:block">
                  <span className="block text-sm font-medium text-slate-700">
                    {user ? `${user.firstName} ${user.lastName}` : 'Welcome back'}
                  </span>
                  <p className="text-xs text-slate-500">{user?.role || 'Guest'}</p>
                </div>
                <button 
                  onClick={logout}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-slate-200/50 shadow-sm">
        <div className={`${containerClass} mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="flex justify-center space-x-1">
            {!isStoreManager && !isSalesperson && !isMechanic && !isWholesale && (
              <NavItem
                href="/stores"
                icon={<Store className="w-4 h-4" />}
                label="Stores"
                active={isActive('/stores')}
              />
            )}
            {!isStoreManager && !isSalesperson && !isMechanic && (
              <NavItem
                href="/insights"
                icon={<BarChart3 className="w-4 h-4" />}
                label="Insights"
                active={isActive('/insights')}
              />
            )}
            {!isSalesperson && !isMechanic && !isWholesale && (
              <NavItem
                href="/dashboard/sales"
                icon={<TrendingUp className="w-4 h-4" />}
                label="Analytics"
                active={isActive('/dashboard/sales')}
              />
            )}
            {!isMechanic && !isWholesale && (
            <NavItem
              href={isSalesperson
                ? `/dashboard/sales/reports/salesperson/${encodeURIComponent(user?.employeeName || `${user?.firstName} ${user?.lastName}`)}`
                : "/dashboard/sales/reports"
              }
              icon={<FileText className="w-4 h-4" />}
              label={isSalesperson ? "My Report" : "Reports"}
              active={isActive('/dashboard/sales/reports')}
            />
            )}
            {/* <NavItem
              href="/appointments"
              icon={<Calendar className="w-4 h-4" />}
              label="Appointments"
              active={isActive('/appointments')}
            />
            <NavItem
              href="/performance"
              icon={<Gauge className="w-4 h-4" />}
              label="Performance"
              active={isActive('/performance')}
            />
            <NavItem
              href="/accounts/large-accounts"
              icon={<Building2 className="w-4 h-4" />}
              label="Large Accounts"
              active={isActive('/accounts/large-accounts')}
            /> */}
            {!isStoreManager && !isSalesperson && !isMechanic && !isWholesale && (
              <NavItem
                href="/dashboard/reconciliation"
                icon={<ClipboardCheck className="w-4 h-4" />}
                label="Reconciliation"
                active={isActive('/dashboard/reconciliation')}
              />
            )}
            {!isSalesperson && !isWholesale && (
              <NavItem
                href={isMechanic 
                  ? `/dashboard/mechanic/${encodeURIComponent(user?.employeeName || `${user?.firstName} ${user?.lastName}`)}`
                  : "/mechanic"
                }
                icon={<Wrench className="w-4 h-4" />}
                label={isMechanic ? "My Dashboard" : "Mechanic"}
                active={isActive('/mechanic') || isActive('/dashboard/mechanic')}
              />
            )}
            {!isStoreManager && !isSalesperson && !isMechanic && !isWholesale && (
              <NavItem
                href="/dashboard/inventory"
                icon={<Package className="w-4 h-4" />}
                label="Inventory"
                active={isActive('/dashboard/inventory') && !isActive('/dashboard/inventory/analytics')}
              />
            )}
            {!isStoreManager && !isSalesperson && !isMechanic && (
              <NavItem
                href="/dashboard/inventory/analytics"
                icon={<TrendingUp className="w-4 h-4" />}
                label="Restock"
                active={isActive('/dashboard/inventory/analytics')}
              />
            )}
            {!isStoreManager && !isSalesperson && !isMechanic && !isWholesale && (
              <NavItem
                href="/brands"
                icon={<Tag className="w-4 h-4" />}
                label="Brands"
                active={isActive('/brands')}
              />
            )}
            {!isSalesperson && !isMechanic && (
              <NavItem
                href="/tires"
                icon={<Disc className="w-4 h-4" />}
                label="Tires"
                active={isActive('/tires')}
              />
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`${containerClass} mx-auto py-8 px-4 sm:px-6 lg:px-8`}>
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

function NavItem({ href, icon, label, active }: NavItemProps) {
  return (
    <a
      href={href}
      className={`
        group flex items-center space-x-2 py-2 px-4 text-sm font-medium rounded-lg transition-all duration-200 my-2
        ${active
          ? 'bg-red-600 text-white shadow-md'
          : 'text-slate-600 hover:text-red-700 hover:bg-slate-50/50'
        }
      `}
    >
      <span className={`transition-colors duration-200 ${
        active
          ? 'text-white'
          : 'text-slate-500 group-hover:text-red-600'
      }`}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </a>
  );
}