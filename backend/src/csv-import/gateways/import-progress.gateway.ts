import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsResponse,
} from '@nestjs/websockets';
import { Server } from 'ws';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * Import Progress WebSocket Gateway
 *
 * Provides real-time updates for CSV import progress and status.
 * Clients can subscribe to import events and receive live notifications.
 */

interface ImportProgressUpdate {
  batchId: string;
  step: string;
  progress: {
    currentStep: string;
    processedRows?: number;
    totalRows?: number;
    foundInvoices?: number;
    processedInvoices?: number;
    currentInvoice?: string;
    errors?: number;
    percentage?: number;
  };
  timestamp: Date;
}

interface ClientSubscription {
  batchId: string;
  userId?: string;
  subscribedAt: Date;
  clientId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'csv-import',
})
export class ImportProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ImportProgressGateway.name);
  private clientSubscriptions = new Map<string, ClientSubscription[]>();
  private clients = new Map<string, any>();

  /**
   * Handle client connection
   */
  handleConnection(client: any) {
    const clientId = this.generateClientId();
    this.clients.set(clientId, client);
    (client as any).clientId = clientId;

    this.logger.log(`Client connected: ${clientId}`);

    this.sendMessage(client, 'connection_established', {
      clientId,
      timestamp: new Date(),
      message: 'Connected to CSV import progress updates'
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: any) {
    const clientId = (client as any).clientId;
    this.logger.log(`Client disconnected: ${clientId}`);

    if (clientId) {
      this.clients.delete(clientId);

      // Clean up subscriptions
      for (const [batchId, subscriptions] of this.clientSubscriptions.entries()) {
        const filtered = subscriptions.filter(sub => sub.clientId !== clientId);

        if (filtered.length === 0) {
          this.clientSubscriptions.delete(batchId);
        } else {
          this.clientSubscriptions.set(batchId, filtered);
        }
      }
    }
  }

  /**
   * Subscribe to import batch progress updates
   */
  @SubscribeMessage('subscribe_to_batch')
  handleSubscribeToBatch(
    @MessageBody() data: { batchId: string; userId?: string },
    @ConnectedSocket() client: any,
  ): WsResponse<any> {
    const { batchId, userId } = data;
    const clientId = (client as any).clientId;

    if (!batchId) {
      this.sendMessage(client, 'subscription_error', {
        error: 'Batch ID is required for subscription'
      });
      return;
    }

    const subscription: ClientSubscription = {
      batchId,
      userId,
      subscribedAt: new Date(),
      clientId
    };

    // Store subscription
    if (!this.clientSubscriptions.has(batchId)) {
      this.clientSubscriptions.set(batchId, []);
    }

    // Remove existing subscription for this client to this batch
    const existingSubscriptions = this.clientSubscriptions.get(batchId)!;
    const filteredSubs = existingSubscriptions.filter(sub => sub.clientId !== clientId);

    filteredSubs.push(subscription);
    this.clientSubscriptions.set(batchId, filteredSubs);

    this.logger.log(`Client ${clientId} subscribed to batch ${batchId}`);

    this.sendMessage(client, 'subscription_confirmed', {
      batchId,
      subscribedAt: subscription.subscribedAt,
      message: `Subscribed to batch ${batchId} progress updates`
    });

    return { event: 'subscription_confirmed', data: { batchId } };
  }

  /**
   * Unsubscribe from import batch progress updates
   */
  @SubscribeMessage('unsubscribe_from_batch')
  handleUnsubscribeFromBatch(
    @MessageBody() data: { batchId: string },
    @ConnectedSocket() client: any,
  ): WsResponse<any> {
    const { batchId } = data;
    const clientId = (client as any).clientId;

    if (this.clientSubscriptions.has(batchId)) {
      const filtered = this.clientSubscriptions.get(batchId)!.filter(sub => sub.clientId !== clientId);

      if (filtered.length === 0) {
        this.clientSubscriptions.delete(batchId);
      } else {
        this.clientSubscriptions.set(batchId, filtered);
      }

      this.logger.log(`Client ${clientId} unsubscribed from batch ${batchId}`);

      this.sendMessage(client, 'unsubscription_confirmed', {
        batchId,
        message: `Unsubscribed from batch ${batchId}`
      });
    }

    return { event: 'unsubscription_confirmed', data: { batchId } };
  }

  /**
   * Get current subscriptions for a client
   */
  @SubscribeMessage('get_subscriptions')
  handleGetSubscriptions(@ConnectedSocket() client: any): WsResponse<any> {
    const clientId = (client as any).clientId;
    const subscriptions: string[] = [];

    for (const [batchId, subs] of this.clientSubscriptions.entries()) {
      if (subs.some(sub => sub.clientId === clientId)) {
        subscriptions.push(batchId);
      }
    }

    this.sendMessage(client, 'current_subscriptions', {
      subscriptions,
      count: subscriptions.length
    });

    return { event: 'current_subscriptions', data: { subscriptions, count: subscriptions.length } };
  }

  /**
   * Event listener for CSV import progress updates
   */
  @OnEvent('csv.import.progress')
  handleImportProgress(data: ImportProgressUpdate) {
    const { batchId } = data;

    if (this.clientSubscriptions.has(batchId)) {
      const subscriptions = this.clientSubscriptions.get(batchId)!;

      this.logger.debug(
        `Broadcasting progress update for batch ${batchId} to ${subscriptions.length} clients`
      );

      // Broadcast to all subscribed clients
      subscriptions.forEach(subscription => {
        const client = this.clients.get(subscription.clientId);

        if (client) {
          this.sendMessage(client, 'import_progress_update', {
            batchId,
            progress: data.progress,
            step: data.step,
            timestamp: data.timestamp || new Date()
          });
        }
      });
    }
  }

  /**
   * Event listener for CSV import completion
   */
  @OnEvent('csv.import.completed')
  handleImportCompleted(data: { batchId: string; fileName: string; result: any }) {
    const { batchId } = data;

    if (this.clientSubscriptions.has(batchId)) {
      const subscriptions = this.clientSubscriptions.get(batchId)!;

      this.logger.log(`Broadcasting completion for batch ${batchId} to ${subscriptions.length} clients`);

      subscriptions.forEach(subscription => {
        const client = this.clients.get(subscription.clientId);

        if (client) {
          this.sendMessage(client, 'import_completed', {
            batchId,
            fileName: data.fileName,
            result: data.result,
            timestamp: new Date()
          });
        }
      });

      // Clean up subscriptions after completion
      this.clientSubscriptions.delete(batchId);
    }
  }

  /**
   * Event listener for CSV import failures
   */
  @OnEvent('csv.import.failed')
  handleImportFailed(data: { batchId?: string; fileName: string; error: string }) {
    const { batchId } = data;

    if (batchId && this.clientSubscriptions.has(batchId)) {
      const subscriptions = this.clientSubscriptions.get(batchId)!;

      this.logger.log(`Broadcasting failure for batch ${batchId} to ${subscriptions.length} clients`);

      subscriptions.forEach(subscription => {
        const client = this.clients.get(subscription.clientId);

        if (client) {
          this.sendMessage(client, 'import_failed', {
            batchId,
            fileName: data.fileName,
            error: data.error,
            timestamp: new Date()
          });
        }
      });

      // Clean up subscriptions after failure
      this.clientSubscriptions.delete(batchId);
    }

    // Also broadcast to all clients for general failures
    this.broadcastToAll('import_error', {
      fileName: data.fileName,
      error: data.error,
      timestamp: new Date()
    });
  }

  /**
   * Event listener for file monitor scan events
   */
  @OnEvent('file.monitor.scan.started')
  handleFileScanStarted(data: { scanType: string; directories: string[]; startTime: Date }) {
    this.broadcastToAll('file_scan_started', {
      scanType: data.scanType,
      directories: data.directories,
      startTime: data.startTime,
      timestamp: new Date()
    });
  }

  /**
   * Event listener for file monitor scan completion
   */
  @OnEvent('file.monitor.scan.completed')
  handleFileScanCompleted(data: { scanType: string; filesFound: number; filesProcessed: number; errors: number }) {
    this.broadcastToAll('file_scan_completed', {
      scanType: data.scanType,
      filesFound: data.filesFound,
      filesProcessed: data.filesProcessed,
      errors: data.errors,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast system status updates
   */
  @OnEvent('import.system.status')
  handleSystemStatus(data: { status: string; message: string; details?: any }) {
    this.broadcastToAll('system_status', {
      status: data.status,
      message: data.message,
      details: data.details,
      timestamp: new Date()
    });
  }

  /**
   * Manual progress broadcast for testing
   */
  broadcastTestProgress(batchId: string, progress: any) {
    this.handleImportProgress({
      batchId,
      step: 'test',
      progress,
      timestamp: new Date()
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const totalConnections = this.clients.size;
    const totalSubscriptions = Array.from(this.clientSubscriptions.values())
      .reduce((sum, subs) => sum + subs.length, 0);

    const batchSubscriptions = new Map();
    for (const [batchId, subs] of this.clientSubscriptions.entries()) {
      batchSubscriptions.set(batchId, subs.length);
    }

    return {
      totalConnections,
      totalSubscriptions,
      activeBatches: this.clientSubscriptions.size,
      batchSubscriptions: Object.fromEntries(batchSubscriptions)
    };
  }

  /**
   * Helper methods
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendMessage(client: any, event: string, data: any) {
    try {
      const message = JSON.stringify({ event, data });
      client.send(message);
    } catch (error) {
      this.logger.error('Failed to send message to client:', error);
    }
  }

  private broadcastToAll(event: string, data: any) {
    const message = JSON.stringify({ event, data });
    this.clients.forEach(client => {
      try {
        client.send(message);
      } catch (error) {
        this.logger.error('Failed to broadcast message:', error);
      }
    });
  }

  /**
   * Emit parsing progress update
   */
  emitParsingProgress(data: { fileName: string; processedLines: number; totalLines: number }) {
    this.broadcastToAll('parsing.progress', data);
  }

  /**
   * Emit import progress update
   */
  emitImportProgress(data: { fileName: string; processedInvoices: number; totalInvoices: number; currentInvoice?: string }) {
    this.broadcastToAll('import.progress', data);
  }
}