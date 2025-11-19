'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, DollarSign, FileText, CheckCircle, X, Bell } from 'lucide-react';
import { accountAudit } from '../../lib/logging/account-audit';

interface AccountNotification {
  id: string;
  type: 'contract_expiring' | 'payment_overdue' | 'health_decline' | 'milestone_due' | 'document_required';
  severity: 'low' | 'medium' | 'high' | 'critical';
  accountId: string;
  accountName: string;
  title: string;
  message: string;
  dueDate?: string;
  amount?: number;
  actionRequired: boolean;
  createdAt: string;
  dismissed: boolean;
}

interface AccountNotificationsProps {
  accountId?: string;
  maxNotifications?: number;
  showDismissed?: boolean;
}

const severityConfig = {
  low: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
  },
  medium: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
  },
  high: {
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-600',
  },
  critical: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
  },
};

const typeIcons = {
  contract_expiring: Clock,
  payment_overdue: DollarSign,
  health_decline: AlertTriangle,
  milestone_due: CheckCircle,
  document_required: FileText,
};

export default function AccountNotifications({
  accountId,
  maxNotifications = 10,
  showDismissed = false
}: AccountNotificationsProps) {
  const [notifications, setNotifications] = useState<AccountNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [accountId, showDismissed]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: maxNotifications.toString(),
        showDismissed: showDismissed.toString(),
        ...(accountId && { accountId }),
      });

      const response = await fetch(`/api/notifications/accounts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/accounts/${notificationId}/dismiss`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to dismiss notification');

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, dismissed: true }
            : notification
        )
      );

      // Log notification dismissal
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        await accountAudit.logNotificationDismiss(notificationId, notification.accountId);
      }
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getNotificationIcon = (type: AccountNotification['type']) => {
    const Icon = typeIcons[type] || Bell;
    return Icon;
  };

  const activeNotifications = notifications.filter(n => !n.dismissed || showDismissed);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (activeNotifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No notifications</p>
        {accountId && (
          <p className="text-gray-400 text-sm mt-1">This account has no active notifications</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeNotifications.map((notification) => {
        const config = severityConfig[notification.severity];
        const Icon = getNotificationIcon(notification.type);

        return (
          <div
            key={notification.id}
            className={`
              ${config.bgColor} ${config.borderColor} border rounded-lg p-4
              ${notification.dismissed ? 'opacity-60' : ''}
              transition-all duration-200
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <Icon className={`h-5 w-5 mt-0.5 ${config.iconColor}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${config.textColor}`}>
                      {notification.title}
                    </h4>
                    {notification.severity === 'critical' && (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                        URGENT
                      </span>
                    )}
                  </div>

                  <p className={`text-sm ${config.textColor} opacity-90 mt-1`}>
                    {notification.message}
                  </p>

                  {!accountId && (
                    <p className="text-sm font-medium text-gray-600 mt-2">
                      Account: {notification.accountName}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        Created: {formatDate(notification.createdAt)}
                      </span>
                      {notification.dueDate && (
                        <span>
                          Due: {formatDate(notification.dueDate)}
                        </span>
                      )}
                      {notification.amount && (
                        <span className="font-medium text-gray-700">
                          {formatAmount(notification.amount)}
                        </span>
                      )}
                    </div>

                    {notification.actionRequired && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                        Action Required
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!notification.dismissed && (
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200 ml-2"
                  title="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}