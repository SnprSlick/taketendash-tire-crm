import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

describe('Large Accounts API Contract Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/large-accounts', () => {
    it('should return list of large accounts with required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/large-accounts')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const account = response.body.data[0];
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('customerId');
        expect(account).toHaveProperty('accountType');
        expect(account).toHaveProperty('tier');
        expect(account).toHaveProperty('annualRevenue');
        expect(account).toHaveProperty('contractStartDate');
        expect(account).toHaveProperty('contractEndDate');
        expect(account).toHaveProperty('status');
        expect(account).toHaveProperty('accountManager');
        expect(account).toHaveProperty('specialTerms');
        expect(account).toHaveProperty('discountTier');
        expect(account).toHaveProperty('serviceLevel');
        expect(account).toHaveProperty('priorityRanking');
      }
    });

    it('should support filtering by account tier', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/large-accounts?tier=PLATINUM')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      if (response.body.data.length > 0) {
        expect(response.body.data.every((account: any) => account.tier === 'PLATINUM')).toBe(true);
      }
    });

    it('should support filtering by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/large-accounts?status=ACTIVE')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      if (response.body.data.length > 0) {
        expect(response.body.data.every((account: any) => account.status === 'ACTIVE')).toBe(true);
      }
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/large-accounts?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });
  });

  describe('GET /api/v1/large-accounts/:id', () => {
    it('should return detailed large account information', async () => {
      // Note: This test will fail until implementation exists
      const response = await request(app.getHttpServer())
        .get('/api/v1/large-accounts/1')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      const account = response.body.data;

      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('customer');
      expect(account.customer).toHaveProperty('id');
      expect(account.customer).toHaveProperty('companyName');
      expect(account.customer).toHaveProperty('contactInfo');

      expect(account).toHaveProperty('contracts');
      expect(Array.isArray(account.contracts)).toBe(true);

      expect(account).toHaveProperty('healthScore');
      expect(account).toHaveProperty('revenueHistory');
      expect(account).toHaveProperty('serviceHistory');
    });

    it('should return 404 for non-existent account', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/large-accounts/999999')
        .expect(404);
    });
  });

  describe('PUT /api/v1/large-accounts/:id/tier', () => {
    it('should update account tier', async () => {
      const updateData = {
        tier: 'GOLD',
        reason: 'Revenue increase above threshold'
      };

      const response = await request(app.getHttpServer())
        .put('/api/v1/large-accounts/1/tier')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('tier', 'GOLD');
      expect(response.body.data).toHaveProperty('tierChangeHistory');
    });

    it('should validate tier values', async () => {
      const invalidData = {
        tier: 'INVALID_TIER',
        reason: 'Test'
      };

      await request(app.getHttpServer())
        .put('/api/v1/large-accounts/1/tier')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/v1/large-accounts/:id/health', () => {
    it('should return account health metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/large-accounts/1/health')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      const health = response.body.data;

      expect(health).toHaveProperty('overallScore');
      expect(health).toHaveProperty('revenueHealth');
      expect(health).toHaveProperty('serviceHealth');
      expect(health).toHaveProperty('paymentHealth');
      expect(health).toHaveProperty('relationshipHealth');
      expect(health).toHaveProperty('riskFactors');
      expect(health).toHaveProperty('recommendations');

      expect(typeof health.overallScore).toBe('number');
      expect(health.overallScore).toBeGreaterThanOrEqual(0);
      expect(health.overallScore).toBeLessThanOrEqual(100);
    });
  });
});