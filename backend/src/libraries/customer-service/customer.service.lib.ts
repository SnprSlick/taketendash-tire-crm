import { Injectable } from '@nestjs/common';

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  totalPurchases: number;
  lifetimeValue: number;
  lastVisit?: Date;
  preferredServices: string[];
  riskLevel: 'low' | 'medium' | 'high';
  loyaltyScore: number;
}

export interface ServiceHistory {
  date: Date;
  serviceType: string;
  amount: number;
  description?: string;
  satisfaction?: number;
}

export interface CustomerSegment {
  segment: string;
  description: string;
  criteria: string[];
  customers: string[];
}

@Injectable()
export class CustomerServiceLib {
  /**
   * Calculate customer lifetime value based on purchase history
   */
  calculateLifetimeValue(purchases: Array<{ amount: number; date: Date }>): number {
    const totalSpent = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const firstPurchase = purchases.reduce((earliest, purchase) =>
      purchase.date < earliest ? purchase.date : earliest, new Date());

    const monthsActive = Math.max(1, this.getMonthsDifference(firstPurchase, new Date()));
    const avgMonthlySpend = totalSpent / monthsActive;

    // Project lifetime value based on industry average retention (36 months for auto service)
    return avgMonthlySpend * 36;
  }

  /**
   * Calculate customer loyalty score (0-100)
   */
  calculateLoyaltyScore(customer: {
    totalPurchases: number;
    lifetimeValue: number;
    lastVisit?: Date;
    referrals?: number;
  }): number {
    let score = 0;

    // Purchase frequency (40% weight)
    const purchaseScore = Math.min(40, customer.totalPurchases * 2);
    score += purchaseScore;

    // Spending level (30% weight)
    const spendingScore = Math.min(30, (customer.lifetimeValue / 5000) * 30);
    score += spendingScore;

    // Recency (20% weight)
    const recencyScore = this.calculateRecencyScore(customer.lastVisit);
    score += recencyScore;

    // Referrals (10% weight)
    const referralScore = Math.min(10, (customer.referrals || 0) * 5);
    score += referralScore;

    return Math.round(Math.min(100, score));
  }

  /**
   * Segment customers based on behavior and value
   */
  segmentCustomers(customers: CustomerProfile[]): CustomerSegment[] {
    const segments: CustomerSegment[] = [];

    // VIP Customers
    const vipCustomers = customers.filter(c =>
      c.lifetimeValue > 5000 && c.loyaltyScore > 80
    );
    segments.push({
      segment: 'VIP',
      description: 'High-value, highly loyal customers',
      criteria: ['Lifetime value > $5,000', 'Loyalty score > 80'],
      customers: vipCustomers.map(c => c.id),
    });

    // At-Risk Customers
    const atRiskCustomers = customers.filter(c =>
      c.riskLevel === 'high' || (c.lastVisit && this.daysSince(c.lastVisit) > 180)
    );
    segments.push({
      segment: 'At-Risk',
      description: 'Customers at risk of churning',
      criteria: ['No visit in 180+ days', 'High risk indicators'],
      customers: atRiskCustomers.map(c => c.id),
    });

    // New Customers
    const newCustomers = customers.filter(c =>
      c.totalPurchases <= 3 && c.lifetimeValue < 1000
    );
    segments.push({
      segment: 'New',
      description: 'Recently acquired customers',
      criteria: ['≤3 purchases', 'Lifetime value < $1,000'],
      customers: newCustomers.map(c => c.id),
    });

    // Regular Customers
    const regularCustomers = customers.filter(c =>
      !vipCustomers.includes(c) &&
      !atRiskCustomers.includes(c) &&
      !newCustomers.includes(c)
    );
    segments.push({
      segment: 'Regular',
      description: 'Consistent, moderate-value customers',
      criteria: ['Established purchase history', 'Moderate engagement'],
      customers: regularCustomers.map(c => c.id),
    });

    return segments;
  }

  /**
   * Generate customer retention recommendations
   */
  generateRetentionRecommendations(customer: CustomerProfile): {
    recommendations: string[];
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
  } {
    const recommendations: string[] = [];
    let priority: 'high' | 'medium' | 'low' = 'low';

    // High-value at-risk customers
    if (customer.lifetimeValue > 3000 && customer.riskLevel === 'high') {
      recommendations.push(
        'Schedule personal outreach call',
        'Offer loyalty discount or service package',
        'Review service quality and address concerns'
      );
      priority = 'high';
    }

    // Low engagement customers
    if (customer.loyaltyScore < 40) {
      recommendations.push(
        'Send educational content about vehicle maintenance',
        'Offer service reminders and scheduling assistance',
        'Create personalized service packages'
      );
      priority = customer.lifetimeValue > 1500 ? 'medium' : 'low';
    }

    // New customers
    if (customer.totalPurchases <= 2) {
      recommendations.push(
        'Send welcome series with service tips',
        'Offer new customer discount on next service',
        'Schedule follow-up satisfaction survey'
      );
      priority = 'medium';
    }

    const estimatedImpact = this.estimateRetentionImpact(customer, priority);

    return {
      recommendations,
      priority,
      estimatedImpact,
    };
  }

  /**
   * Predict customer churn risk
   */
  predictChurnRisk(customer: CustomerProfile & {
    serviceHistory: ServiceHistory[];
  }): {
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    confidence: number;
  } {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Days since last visit
    if (customer.lastVisit) {
      const daysSinceVisit = this.daysSince(customer.lastVisit);
      if (daysSinceVisit > 365) {
        riskFactors.push('No visit in over 1 year');
        riskScore += 40;
      } else if (daysSinceVisit > 180) {
        riskFactors.push('No visit in 6+ months');
        riskScore += 25;
      }
    }

    // Decreasing visit frequency
    const recentVisits = customer.serviceHistory
      .filter(s => this.daysSince(s.date) <= 365)
      .length;
    const previousVisits = customer.serviceHistory
      .filter(s => {
        const days = this.daysSince(s.date);
        return days > 365 && days <= 730;
      })
      .length;

    if (recentVisits < previousVisits * 0.7) {
      riskFactors.push('Decreasing visit frequency');
      riskScore += 20;
    }

    // Low satisfaction scores
    const avgSatisfaction = customer.serviceHistory
      .filter(s => s.satisfaction !== undefined)
      .reduce((sum, s) => sum + (s.satisfaction || 0), 0) /
      customer.serviceHistory.filter(s => s.satisfaction !== undefined).length;

    if (avgSatisfaction < 3) {
      riskFactors.push('Low satisfaction scores');
      riskScore += 30;
    }

    // Low loyalty score
    if (customer.loyaltyScore < 30) {
      riskFactors.push('Low customer loyalty score');
      riskScore += 15;
    }

    const riskLevel: 'low' | 'medium' | 'high' =
      riskScore > 50 ? 'high' : riskScore > 25 ? 'medium' : 'low';

    return {
      riskLevel,
      riskFactors,
      confidence: Math.min(95, riskScore + 20),
    };
  }

  private calculateRecencyScore(lastVisit?: Date): number {
    if (!lastVisit) return 0;

    const daysSince = this.daysSince(lastVisit);
    if (daysSince <= 30) return 20;
    if (daysSince <= 90) return 15;
    if (daysSince <= 180) return 10;
    if (daysSince <= 365) return 5;
    return 0;
  }

  private daysSince(date: Date): number {
    return Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getMonthsDifference(from: Date, to: Date): number {
    return Math.abs(to.getFullYear() * 12 + to.getMonth() - (from.getFullYear() * 12 + from.getMonth()));
  }

  private estimateRetentionImpact(customer: CustomerProfile, priority: string): string {
    const baseValue = customer.lifetimeValue * 0.8; // Assume 80% retention of LTV

    switch (priority) {
      case 'high':
        return `Potential $${Math.round(baseValue)} revenue retention`;
      case 'medium':
        return `Potential $${Math.round(baseValue * 0.6)} revenue retention`;
      default:
        return `Potential $${Math.round(baseValue * 0.3)} revenue retention`;
    }
  }
}