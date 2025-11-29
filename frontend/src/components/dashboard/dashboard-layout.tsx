'use client';

import React from 'react';
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
  Store
} from 'lucide-react';
import { useStore } from '../../contexts/store-context';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
}

export default function DashboardLayout({ children, title = 'Tire CRM Dashboard', fullWidth = false }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { stores, selectedStoreId, setSelectedStoreId, loading } = useStore();

  const isActive = (href: string) => {
    if (href === '/dashboard/sales') {
      // Exact match for sales dashboard to avoid highlighting on sub-routes like reports
      return pathname === '/' || pathname === '/dashboard/sales';
    }
    return pathname === href || pathname.startsWith(href);
  };

  const containerClass = fullWidth ? "max-w-[98%]" : "max-w-7xl";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-slate-200/50">
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
                  {stores.map(store => (
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
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-sm font-medium text-slate-700">Welcome back,</span>
                  <p className="text-xs text-slate-500">Service Manager</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-slate-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-red-100">
                  <User className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-slate-200/50 shadow-sm">
        <div className={`${containerClass} mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="flex space-x-1">
            <NavItem
              href="/stores"
              icon={<Store className="w-4 h-4" />}
              label="Stores"
              active={isActive('/stores')}
            />
            <NavItem
              href="/insights"
              icon={<BarChart3 className="w-4 h-4" />}
              label="Insights"
              active={isActive('/insights')}
            />
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
            <NavItem
              href="/dashboard/reconciliation"
              icon={<ClipboardCheck className="w-4 h-4" />}
              label="Reconciliation"
              active={isActive('/dashboard/reconciliation')}
            />
            <NavItem
              href="/mechanic"
              icon={<Wrench className="w-4 h-4" />}
              label="Mechanic"
              active={isActive('/mechanic')}
            />
            <NavItem
              href="/dashboard/inventory"
              icon={<Package className="w-4 h-4" />}
              label="Inventory"
              active={isActive('/dashboard/inventory') && !isActive('/dashboard/inventory/analytics')}
            />
            <NavItem
              href="/dashboard/inventory/analytics"
              icon={<TrendingUp className="w-4 h-4" />}
              label="Restock"
              active={isActive('/dashboard/inventory/analytics')}
            />
            <NavItem
              href="/brands"
              icon={<Tag className="w-4 h-4" />}
              label="Brands"
              active={isActive('/brands')}
            />
            <NavItem
              href="/tires"
              icon={<Disc className="w-4 h-4" />}
              label="Tires"
              active={isActive('/tires')}
            />
            <NavItem
              href="/tire-master"
              icon={<Database className="w-4 h-4" />}
              label="Config"
              active={isActive('/tire-master')}
            />
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