interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: 'LARGE_ACCOUNT' | 'CONTRACT' | 'NOTIFICATION' | 'CUSTOMER';
  resourceId: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AccountAuditAction {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'TIER_CHANGE' | 'STATUS_CHANGE' | 'CONTRACT_UPDATE' | 'NOTIFICATION_DISMISS';
  resourceType: 'LARGE_ACCOUNT' | 'CONTRACT' | 'NOTIFICATION' | 'CUSTOMER';
  resourceId: string;
  details?: Record<string, any>;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

class AccountAuditLogger {
  private static instance: AccountAuditLogger;
  private baseUrl = '/api/audit';

  private constructor() {}

  public static getInstance(): AccountAuditLogger {
    if (!AccountAuditLogger.instance) {
      AccountAuditLogger.instance = new AccountAuditLogger();
    }
    return AccountAuditLogger.instance;
  }

  private async getCurrentUser() {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const user = await response.json();
        return {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
        };
      }
    } catch (error) {
      console.warn('Could not fetch current user for audit log:', error);
    }

    return {
      userId: 'unknown',
      userName: 'Unknown User',
    };
  }

  private async getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
  }

  async logAction(auditAction: AccountAuditAction): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      const browserInfo = await this.getBrowserInfo();

      const logEntry: Partial<AuditLogEntry> = {
        ...user,
        action: auditAction.action,
        resourceType: auditAction.resourceType,
        resourceId: auditAction.resourceId,
        details: {
          ...auditAction.details,
          ...(auditAction.previousValues && { previousValues: auditAction.previousValues }),
          ...(auditAction.newValues && { newValues: auditAction.newValues }),
        },
        ...browserInfo,
      };

      const response = await fetch(`${this.baseUrl}/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      });

      if (!response.ok) {
        throw new Error(`Failed to log audit entry: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw - we don't want logging failures to break the app
    }
  }

  // Convenience methods for common account operations
  async logAccountView(accountId: string, details?: Record<string, any>): Promise<void> {
    return this.logAction({
      action: 'VIEW',
      resourceType: 'LARGE_ACCOUNT',
      resourceId: accountId,
      details,
    });
  }

  async logAccountUpdate(accountId: string, previousValues: Record<string, any>, newValues: Record<string, any>): Promise<void> {
    return this.logAction({
      action: 'UPDATE',
      resourceType: 'LARGE_ACCOUNT',
      resourceId: accountId,
      previousValues,
      newValues,
    });
  }

  async logTierChange(accountId: string, previousTier: string, newTier: string): Promise<void> {
    return this.logAction({
      action: 'TIER_CHANGE',
      resourceType: 'LARGE_ACCOUNT',
      resourceId: accountId,
      details: {
        reason: 'Manual tier adjustment',
      },
      previousValues: { tier: previousTier },
      newValues: { tier: newTier },
    });
  }

  async logStatusChange(accountId: string, previousStatus: string, newStatus: string, reason?: string): Promise<void> {
    return this.logAction({
      action: 'STATUS_CHANGE',
      resourceType: 'LARGE_ACCOUNT',
      resourceId: accountId,
      details: {
        reason: reason || 'Status change',
      },
      previousValues: { status: previousStatus },
      newValues: { status: newStatus },
    });
  }

  async logContractView(contractId: string, accountId: string): Promise<void> {
    return this.logAction({
      action: 'VIEW',
      resourceType: 'CONTRACT',
      resourceId: contractId,
      details: { accountId },
    });
  }

  async logContractUpdate(contractId: string, accountId: string, changes: Record<string, any>): Promise<void> {
    return this.logAction({
      action: 'CONTRACT_UPDATE',
      resourceType: 'CONTRACT',
      resourceId: contractId,
      details: {
        accountId,
        changeType: 'contract_modification',
      },
      newValues: changes,
    });
  }

  async logNotificationDismiss(notificationId: string, accountId?: string): Promise<void> {
    return this.logAction({
      action: 'NOTIFICATION_DISMISS',
      resourceType: 'NOTIFICATION',
      resourceId: notificationId,
      details: {
        ...(accountId && { accountId }),
        dismissedAt: new Date().toISOString(),
      },
    });
  }

  async logBulkOperation(action: string, resourceType: AccountAuditAction['resourceType'], resourceIds: string[], details?: Record<string, any>): Promise<void> {
    return this.logAction({
      action: action as AccountAuditAction['action'],
      resourceType,
      resourceId: 'bulk_operation',
      details: {
        bulkOperation: true,
        affectedResources: resourceIds,
        resourceCount: resourceIds.length,
        ...details,
      },
    });
  }
}

// Export singleton instance
export const accountAudit = AccountAuditLogger.getInstance();

// Export types for use in components
export type { AuditLogEntry, AccountAuditAction };