import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';

import { Test, TestingModule } from '@nestjs/testing';

import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { AppModule } from './../src/app.module.js';

describe('GearUp API - Customer E2E', () => {
  let app: INestApplication;

  let accessToken: string;
  let vehicleId: string;
  let jobId: string;

  const email = `e2e-${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app =
      moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  it('POST /users should register a customer', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/users')
      .send({
        email,
        password,
        firstName: 'E2E',
        lastName: 'Customer',
        phone: '0240000000',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        email,
        firstName: 'E2E',
        lastName: 'Customer',
        role: 'customer',
      }),
    );

    expect(
      response.body.password,
    ).toBeUndefined();
  });

  it('POST /auth/login should return an access token', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        user: expect.objectContaining({
          email,
          role: 'customer',
        }),
      }),
    );

    accessToken = response.body.accessToken;
  });

  it('GET /users/me should return the authenticated user', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get('/users/me')
      .set(
        'Authorization',
        `Bearer ${accessToken}`,
      )
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        email,
        firstName: 'E2E',
        lastName: 'Customer',
        role: 'customer',
      }),
    );

    expect(
      response.body.password,
    ).toBeUndefined();
  });

  it('POST /vehicles should create a vehicle for the customer', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/vehicles')
      .set(
        'Authorization',
        `Bearer ${accessToken}`,
      )
      .send({
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        plateNumber: `E2E-${Date.now()}`,
        vin: 'E2E1HGCM82633A123',
        color: 'Black',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        userId: expect.any(String),
      }),
    );

    vehicleId = response.body.id;

    expect(vehicleId).toEqual(
      expect.any(String),
    );
  });

  it('POST /jobs should create a pending job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/jobs')
      .set(
        'Authorization',
        `Bearer ${accessToken}`,
      )
      .send({
        title: 'E2E brake inspection',
        description:
          'Inspect front and rear brakes',
        vehicleId,
        estimatedCost: 850,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        title: 'E2E brake inspection',
        description:
          'Inspect front and rear brakes',
        vehicleId,
        status: 'pending',
        userId: expect.any(String),
      }),
    );

    jobId = response.body.id;

    expect(jobId).toEqual(
      expect.any(String),
    );
  });

  it('GET /jobs should return the customer job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get('/jobs')
      .set(
        'Authorization',
        `Bearer ${accessToken}`,
      )
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: jobId,
          vehicleId,
          title: 'E2E brake inspection',
          status: 'pending',
        }),
      ]),
    );
  });

  it('PATCH /jobs/:id should update the pending job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .patch(`/jobs/${jobId}`)
      .set(
        'Authorization',
        `Bearer ${accessToken}`,
      )
      .send({
        title:
          'Updated E2E brake inspection',
        description:
          'Inspect all brake components',
        estimatedCost: 900,
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: jobId,
        title:
          'Updated E2E brake inspection',
        description:
          'Inspect all brake components',
        status: 'pending',
      }),
    );
  });

  it('GET /jobs/:id should return the updated job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get(`/jobs/${jobId}`)
      .set(
        'Authorization',
        `Bearer ${accessToken}`,
      )
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: jobId,
        title:
          'Updated E2E brake inspection',
        status: 'pending',
      }),
    );
  });

  it('DELETE /jobs/:id should delete the pending job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .delete(`/jobs/${jobId}`)
      .set(
        'Authorization',
        `Bearer ${accessToken}`,
      )
      .expect(200);

    expect(response.body).toEqual({
      message: 'Job deleted successfully',
    });
  });

  it('DELETE /vehicles/:id should delete the vehicle', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .delete(`/vehicles/${vehicleId}`)
      .set(
        'Authorization',
        `Bearer ${accessToken}`,
      )
      .expect(200);

    expect(response.body).toEqual({
      message: 'Vehicle deleted successfully',
    });
  });

  it('GET /jobs without authentication should return 401', async () => {
    await request(
      app.getHttpServer(),
    )
      .get('/jobs')
      .expect(401);
  });

  it('GET /users/me without authentication should return 401', async () => {
    await request(
      app.getHttpServer(),
    )
      .get('/users/me')
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});