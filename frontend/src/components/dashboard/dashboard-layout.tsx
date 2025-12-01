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
    if (!isLoading) {
      if (!isAuthenticated) {
        window.location.href = '/login';
      } else if (user?.mustChangePassword) {
        window.location.href = '/change-password';
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
    user?.stores.includes(store.id)
  );

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
                <select
                  value={selectedStoreId || ''}
                  onChange={(e) => setSelectedStoreId(e.target.value || null)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={loading}
                >
                  <option value="">All Stores</option>
                  {allowedStores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="relative p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              </button>
              
              <div className="h-8 w-px bg-slate-200 mx-2"></div>

              <div className="flex items-center space-x-3 group relative cursor-pointer">
                <div className="text-right">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-red-600 transition-colors">
                    {user ? `${user.firstName} ${user.lastName}` : 'Welcome back'}
                  </span>
                  <p className="text-xs text-slate-500">{user?.role || 'Guest'}</p>
                </div>
                <div className="relative">
                  <button className="w-10 h-10 bg-gradient-to-r from-red-500 to-slate-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-red-100 group-hover:ring-red-200 transition-all">
                    <User className="w-5 h-5 text-white" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 hidden group-hover:block z-[100]">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <button 
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-slate-200/50 shadow-sm">
        <div className={`${containerClass} mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="flex justify-center space-x-1">
            {!hasRole('STORE_MANAGER') && (
              <NavItem
                href="/stores"
                icon={<Store className="w-4 h-4" />}
                label="Stores"
                active={isActive('/stores')}
              />
            )}
            {!hasRole('STORE_MANAGER') && (
              <NavItem
                href="/insights"
                icon={<BarChart3 className="w-4 h-4" />}
                label="Insights"
                active={isActive('/insights')}
              />
            )}
            <NavItem
              href="/dashboard/sales"
              icon={<TrendingUp className="w-4 h-4" />}
              label="Analytics"
              active={isActive('/dashboard/sales')}
            />
            <NavItem
              href="/dashboard/sales/reports"
              icon={<FileText className="w-4 h-4" />}
              label="Reports"
              active={isActive('/dashboard/sales/reports')}
            />
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
            {!hasRole('STORE_MANAGER') && (
              <NavItem
                href="/dashboard/reconciliation"
                icon={<ClipboardCheck className="w-4 h-4" />}
                label="Reconciliation"
                active={isActive('/dashboard/reconciliation')}
              />
            )}
            <NavItem
              href="/mechanic"
              icon={<Wrench className="w-4 h-4" />}
              label="Mechanic"
              active={isActive('/mechanic')}
            />
            {!hasRole('STORE_MANAGER') && (
              <NavItem
                href="/dashboard/inventory"
                icon={<Package className="w-4 h-4" />}
                label="Inventory"
                active={isActive('/dashboard/inventory') && !isActive('/dashboard/inventory/analytics')}
              />
            )}
            {!hasRole('STORE_MANAGER') && (
              <NavItem
                href="/dashboard/inventory/analytics"
                icon={<TrendingUp className="w-4 h-4" />}
                label="Restock"
                active={isActive('/dashboard/inventory/analytics')}
              />
            )}
            {!hasRole('STORE_MANAGER') && (
              <NavItem
                href="/brands"
                icon={<Tag className="w-4 h-4" />}
                label="Brands"
                active={isActive('/brands')}
              />
            )}
            <NavItem
              href="/tires"
              icon={<Disc className="w-4 h-4" />}
              label="Tires"
              active={isActive('/tires')}
            />
            {!hasRole('STORE_MANAGER') && (
              <NavItem
                href="/tire-master"
                icon={<Database className="w-4 h-4" />}
                label="Config"
                active={isActive('/tire-master')}
              />
            )}
            {hasRole('ADMINISTRATOR') && (
              <NavItem
                href="/dashboard/admin/users"
                icon={<Shield className="w-4 h-4" />}
                label="Admin"
                active={isActive('/dashboard/admin')}
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