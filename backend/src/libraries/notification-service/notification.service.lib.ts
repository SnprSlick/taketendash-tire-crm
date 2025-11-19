import { Injectable, Logger } from '@nestjs/common';

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'email' | 'sms' | 'push';
  variables: string[];
}

export interface NotificationRequest {
  templateId: string;
  recipient: {
    email?: string;
    phone?: string;
    name?: string;
  };
  variables: Record<string, string>;
  priority: 'low' | 'medium' | 'high';
  scheduledAt?: Date;
}

export interface NotificationResult {
  id: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: Date;
  error?: string;
}

@Injectable()
export class NotificationServiceLib {
  private readonly logger = new Logger(NotificationServiceLib.name);
  private templates = new Map<string, NotificationTemplate>();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Register a notification template
   */
  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    this.logger.log(`Template registered: ${template.name}`);
  }

  /**
   * Send a notification using a template
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    const startTime = Date.now();
    this.logger.log(`Sending notification - Template: ${request.templateId}, Type: ${this.templates.get(request.templateId)?.type}, Priority: ${request.priority}`);

    const template = this.templates.get(request.templateId);
    if (!template) {
      this.logger.error(`Template not found: ${request.templateId}`);
      throw new Error(`Template not found: ${request.templateId}`);
    }

    // Log template usage
    this.logger.debug(`Using template: ${template.name} (${template.type})`);

    // Replace variables in content
    const content = this.replaceVariables(template.content, request.variables);
    const subject = this.replaceVariables(template.subject, request.variables);

    // Log variable replacement
    this.logger.debug(`Variables replaced for template ${request.templateId}:`, Object.keys(request.variables));

    try {
      // Simulate sending notification based on type
      const result = await this.executeNotification(template.type, {
        recipient: request.recipient,
        subject,
        content,
        priority: request.priority,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Notification sent successfully - Template: ${request.templateId}, Duration: ${duration}ms`);

      return {
        id: `notif_${Date.now()}`,
        status: 'sent',
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to send notification - Template: ${request.templateId}, Duration: ${duration}ms, Error: ${error.message}`);
      return {
        id: `notif_${Date.now()}`,
        status: 'failed',
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(requests: NotificationRequest[]): Promise<NotificationResult[]> {
    const startTime = Date.now();
    this.logger.log(`Starting bulk notification send for ${requests.length} notifications`);

    const results: NotificationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const request of requests) {
      try {
        const result = await this.sendNotification(request);
        results.push(result);
        if (result.status === 'sent') {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        this.logger.error(`Bulk notification failed for template ${request.templateId}:`, error.message);
        results.push({
          id: `notif_${Date.now()}`,
          status: 'failed',
          timestamp: new Date(),
          error: error.message,
        });
        failureCount++;
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log(`Bulk notification completed - Total: ${requests.length}, Success: ${successCount}, Failed: ${failureCount}, Duration: ${duration}ms`);

    return results;
  }

  /**
   * Get available templates
   */
  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Validate template variables
   */
  validateTemplateVariables(templateId: string, variables: Record<string, string>): {
    valid: boolean;
    missing: string[];
  } {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const missing = template.variables.filter(variable => !(variable in variables));

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  private async executeNotification(
    type: 'email' | 'sms' | 'push',
    notification: {
      recipient: { email?: string; phone?: string; name?: string };
      subject: string;
      content: string;
      priority: string;
    }
  ): Promise<void> {
    // Simulate different notification channels
    switch (type) {
      case 'email':
        if (!notification.recipient.email) {
          throw new Error('Email address required for email notifications');
        }
        this.logger.log(`Email sent to: ${notification.recipient.email}`);
        this.logger.log(`Subject: ${notification.subject}`);
        break;

      case 'sms':
        if (!notification.recipient.phone) {
          throw new Error('Phone number required for SMS notifications');
        }
        this.logger.log(`SMS sent to: ${notification.recipient.phone}`);
        this.logger.log(`Content: ${notification.content}`);
        break;

      case 'push':
        this.logger.log(`Push notification sent`);
        this.logger.log(`Content: ${notification.content}`);
        break;
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private initializeDefaultTemplates(): void {
    // Service reminder templates
    this.registerTemplate({
      id: 'service_reminder',
      name: 'Service Reminder',
      subject: 'Service Reminder for {{vehicleMake}} {{vehicleModel}}',
      content: `Hello {{customerName}},

This is a friendly reminder that your {{vehicleMake}} {{vehicleModel}} is due for service.

Last Service: {{lastServiceDate}}
Recommended Service: {{recommendedService}}
Mileage: {{currentMileage}} miles

Please call us at {{phoneNumber}} to schedule your appointment.

Best regards,
{{businessName}}`,
      type: 'email',
      variables: ['customerName', 'vehicleMake', 'vehicleModel', 'lastServiceDate', 'recommendedService', 'currentMileage', 'phoneNumber', 'businessName'],
    });

    // Appointment confirmation template
    this.registerTemplate({
      id: 'appointment_confirmation',
      name: 'Appointment Confirmation',
      subject: 'Appointment Confirmed - {{appointmentDate}}',
      content: `Hello {{customerName}},

Your appointment has been confirmed:

Date: {{appointmentDate}}
Time: {{appointmentTime}}
Service: {{serviceType}}
Vehicle: {{vehicleMake}} {{vehicleModel}}

If you need to reschedule, please call {{phoneNumber}}.

Thank you,
{{businessName}}`,
      type: 'email',
      variables: ['customerName', 'appointmentDate', 'appointmentTime', 'serviceType', 'vehicleMake', 'vehicleModel', 'phoneNumber', 'businessName'],
    });

    // Service completion template
    this.registerTemplate({
      id: 'service_completion',
      name: 'Service Completion',
      subject: 'Service Completed - {{vehicleMake}} {{vehicleModel}}',
      content: 'Hello {{customerName}},\n\nYour {{vehicleMake}} {{vehicleModel}} service has been completed.\n\nServices Performed: {{servicesPerformed}}\nTotal Cost: ${{totalCost}}\nNext Service Due: {{nextServiceDate}}\n\nThank you for choosing {{businessName}}!\n\nRate your experience: {{feedbackLink}}',
      type: 'email',
      variables: ['customerName', 'vehicleMake', 'vehicleModel', 'servicesPerformed', 'totalCost', 'nextServiceDate', 'businessName', 'feedbackLink'],
    });

    // SMS Service reminder template (shorter format for SMS)
    this.registerTemplate({
      id: 'service_reminder_sms',
      name: 'Service Reminder SMS',
      subject: '', // SMS doesn't use subject
      content: 'Hi {{customerName}}! Your {{vehicleMake}} {{vehicleModel}} is due for {{recommendedService}}. Last service: {{lastServiceDate}}. Call {{phoneNumber}} to schedule. - {{businessName}}',
      type: 'sms',
      variables: ['customerName', 'vehicleMake', 'vehicleModel', 'recommendedService', 'lastServiceDate', 'phoneNumber', 'businessName'],
    });

    this.logger.log('Default notification templates initialized');
  }
}