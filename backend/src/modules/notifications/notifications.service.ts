import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AccountNotification {
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

interface NotificationFilters {
  accountId?: string;
  limit: number;
  showDismissed: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getAccountNotifications(filters: NotificationFilters): Promise<AccountNotification[]> {
    // For now, return mock data that matches the interface
    // TODO: Implement actual notification storage and retrieval
    const mockNotifications: AccountNotification[] = [
      {
        id: '1',
        type: 'contract_expiring',
        severity: 'high',
        accountId: filters.accountId || 'account-1',
        accountName: 'Ace Fleet Services',
        title: 'Contract Expiring Soon',
        message: 'Contract LA-2024-001 expires in 15 days. Please initiate renewal process.',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        actionRequired: true,
        createdAt: new Date().toISOString(),
        dismissed: false,
      },
      {
        id: '2',
        type: 'payment_overdue',
        severity: 'critical',
        accountId: filters.accountId || 'account-1',
        accountName: 'Ace Fleet Services',
        title: 'Payment Overdue',
        message: 'Invoice #INV-2024-1102 is 7 days overdue.',
        amount: 15750.00,
        actionRequired: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        dismissed: false,
      },
      {
        id: '3',
        type: 'health_decline',
        severity: 'medium',
        accountId: filters.accountId || 'account-1',
        accountName: 'Ace Fleet Services',
        title: 'Account Health Decline',
        message: 'Account health score has dropped from 85 to 72 over the past month.',
        actionRequired: true,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dismissed: false,
      }
    ];

    // Filter by accountId if provided
    let notifications = filters.accountId
      ? mockNotifications.filter(n => n.accountId === filters.accountId)
      : mockNotifications;

    // Filter by dismissed status
    if (!filters.showDismissed) {
      notifications = notifications.filter(n => !n.dismissed);
    }

    // Apply limit
    notifications = notifications.slice(0, filters.limit);

    return notifications;
  }

  async dismissNotification(id: string): Promise<void> {
    // TODO: Implement actual notification dismissal in database
    // For now, this is a no-op since we're using mock data
    console.log(`Dismissing notification: ${id}`);
  }
}