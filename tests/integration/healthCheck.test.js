const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const dbHealthService = require('../../src/services/dbHealthService');

jest.mock('../../src/services/dbHealthService');

describe('Health Check Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 with status OK when everything is working', async () => {
    dbHealthService.checkConnection.mockResolvedValue({
      connected: true,
      ping: true
    });

    const response = await request(app).get('/api/monitoring/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('database', 'OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });

  it('should return 200 with status WARNING when database connection has issues', async () => {
    dbHealthService.checkConnection.mockResolvedValue({
      connected: false,
      error: 'Connection timeout'
    });

    const response = await request(app).get('/api/monitoring/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'WARNING');
    expect(response.body).toHaveProperty('database', 'ERROR');
    expect(response.body).toHaveProperty('databaseError', 'Connection timeout');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });

  it('should return 500 when health check service throws an error', async () => {
    dbHealthService.checkConnection.mockRejectedValue(new Error('Unexpected error'));

    const response = await request(app).get('/api/monitoring/health');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('status', 'ERROR');
    expect(response.body).toHaveProperty('error', 'Unexpected error');
  });
}); 