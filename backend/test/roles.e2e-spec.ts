import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';

import { Test, TestingModule } from '@nestjs/testing';

import { DataSource } from 'typeorm';

import request from 'supertest';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { AppModule } from './../src/app.module.js';

import { User } from './../src/modules/users/entities/user.entity.js';
import { UserRole } from './../src/modules/users/enums/user-role.enum.js';

describe('GearUp API - Mechanic/Admin E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let customerToken: string;
  let mechanicToken: string;
  let adminToken: string;

  let vehicleId: string;
  let jobId: string;
  let adminJobId: string;

  const customerEmail =
    `e2e-customer-${Date.now()}@example.com`;

  const mechanicEmail =
    `e2e-mechanic-${Date.now()}@example.com`;

  const adminEmail =
    `e2e-admin-${Date.now()}@example.com`;

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

    dataSource = app.get(DataSource);
  });

  it('should register the customer', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/users')
      .send({
        email: customerEmail,
        password,
        firstName: 'E2E',
        lastName: 'Customer',
        phone: '0240000001',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        email: customerEmail,
        role: UserRole.CUSTOMER,
      }),
    );

    expect(response.body.password).toBeUndefined();
  });

  it('should register the mechanic fixture', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/users')
      .send({
        email: mechanicEmail,
        password,
        firstName: 'E2E',
        lastName: 'Mechanic',
        phone: '0240000002',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        email: mechanicEmail,
        role: UserRole.CUSTOMER,
      }),
    );

    expect(response.body.password).toBeUndefined();
  });

  it('should register the admin fixture', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/users')
      .send({
        email: adminEmail,
        password,
        firstName: 'E2E',
        lastName: 'Admin',
        phone: '0240000003',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        email: adminEmail,
        role: UserRole.CUSTOMER,
      }),
    );

    expect(response.body.password).toBeUndefined();
  });

  it('should promote the mechanic and admin fixtures in the test database', async () => {
    const userRepository =
      dataSource.getRepository(User);

    const mechanic = await userRepository.findOneBy({
      email: mechanicEmail,
    });

    const admin = await userRepository.findOneBy({
      email: adminEmail,
    });

    expect(mechanic).not.toBeNull();
    expect(admin).not.toBeNull();

    await userRepository.update(
      { id: mechanic!.id },
      { role: UserRole.MECHANIC },
    );

    await userRepository.update(
      { id: admin!.id },
      { role: UserRole.ADMIN },
    );

    const updatedMechanic =
      await userRepository.findOneBy({
        email: mechanicEmail,
      });

    const updatedAdmin =
      await userRepository.findOneBy({
        email: adminEmail,
      });

    expect(updatedMechanic?.role).toBe(
      UserRole.MECHANIC,
    );

    expect(updatedAdmin?.role).toBe(
      UserRole.ADMIN,
    );
  });

  it('POST /auth/login should login the customer', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/auth/login')
      .send({
        email: customerEmail,
        password,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        user: expect.objectContaining({
          email: customerEmail,
          role: UserRole.CUSTOMER,
        }),
      }),
    );

    customerToken = response.body.accessToken;
  });

  it('POST /auth/login should login the mechanic', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/auth/login')
      .send({
        email: mechanicEmail,
        password,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        user: expect.objectContaining({
          email: mechanicEmail,
          role: UserRole.MECHANIC,
        }),
      }),
    );

    mechanicToken = response.body.accessToken;
  });

  it('POST /auth/login should login the admin', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/auth/login')
      .send({
        email: adminEmail,
        password,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        user: expect.objectContaining({
          email: adminEmail,
          role: UserRole.ADMIN,
        }),
      }),
    );

    adminToken = response.body.accessToken;
  });

  it('POST /vehicles should allow the customer to create a vehicle', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/vehicles')
      .set(
        'Authorization',
        `Bearer ${customerToken}`,
      )
      .send({
        make: 'Toyota',
        model: 'Corolla',
        year: 2021,
        plateNumber: `ROLE-E2E-${Date.now()}`,
        vin: `ROLE${Date.now()
          .toString()
          .slice(-13)}`,
        color: 'Silver',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        make: 'Toyota',
        model: 'Corolla',
        year: 2021,
        userId: expect.any(String),
      }),
    );

    vehicleId = response.body.id;
  });

  it('POST /jobs should allow the customer to create a pending job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/jobs')
      .set(
        'Authorization',
        `Bearer ${customerToken}`,
      )
      .send({
        title: 'Mechanic E2E brake job',
        description:
          'Inspect and repair the braking system',
        vehicleId,
        estimatedCost: 850,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        title: 'Mechanic E2E brake job',
        status: 'pending',
        vehicleId,
        userId: expect.any(String),
      }),
    );

    jobId = response.body.id;
  });

  it('GET /jobs/available should reject a customer', async () => {
    await request(
      app.getHttpServer(),
    )
      .get('/jobs/available')
      .set(
        'Authorization',
        `Bearer ${customerToken}`,
      )
      .expect(403);
  });

  it('GET /jobs/available should allow the mechanic to see the pending job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get('/jobs/available')
      .set(
        'Authorization',
        `Bearer ${mechanicToken}`,
      )
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: jobId,
          status: 'pending',
          mechanicId: null,
        }),
      ]),
    );
  });

  it('PATCH /jobs/:id/accept should reject the customer', async () => {
    await request(
      app.getHttpServer(),
    )
      .patch(`/jobs/${jobId}/accept`)
      .set(
        'Authorization',
        `Bearer ${customerToken}`,
      )
      .expect(403);
  });

  it('PATCH /jobs/:id/accept should allow the mechanic to accept the job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .patch(`/jobs/${jobId}/accept`)
      .set(
        'Authorization',
        `Bearer ${mechanicToken}`,
      )
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: jobId,
        status: 'in_progress',
        mechanicId: expect.any(String),
      }),
    );
  });

  it('GET /jobs should show the accepted job to the mechanic', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get('/jobs')
      .set(
        'Authorization',
        `Bearer ${mechanicToken}`,
      )
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: jobId,
          status: 'in_progress',
        }),
      ]),
    );
  });

  it('GET /jobs/:id should allow the assigned mechanic to view the job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get(`/jobs/${jobId}`)
      .set(
        'Authorization',
        `Bearer ${mechanicToken}`,
      )
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: jobId,
        status: 'in_progress',
      }),
    );
  });

  it('PATCH /jobs/:id/complete should reject the customer', async () => {
    await request(
      app.getHttpServer(),
    )
      .patch(`/jobs/${jobId}/complete`)
      .set(
        'Authorization',
        `Bearer ${customerToken}`,
      )
      .send({
        finalCost: 950,
      })
      .expect(403);
  });

  it('PATCH /jobs/:id/complete should allow the assigned mechanic to complete the job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .patch(`/jobs/${jobId}/complete`)
      .set(
        'Authorization',
        `Bearer ${mechanicToken}`,
      )
      .send({
        finalCost: 950,
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: jobId,
        status: 'completed',
      }),
    );
  });

  it('GET /jobs should allow the admin to view all jobs', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get('/jobs')
      .set(
        'Authorization',
        `Bearer ${adminToken}`,
      )
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: jobId,
          status: 'completed',
        }),
      ]),
    );
  });

  it('POST /jobs should allow the customer to create another pending job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/jobs')
      .set(
        'Authorization',
        `Bearer ${customerToken}`,
      )
      .send({
        title: 'Admin cancellation test',
        description:
          'Pending job for admin cancellation',
        vehicleId,
        estimatedCost: 500,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        title: 'Admin cancellation test',
        status: 'pending',
        vehicleId,
      }),
    );

    adminJobId = response.body.id;
  });

  it('PATCH /jobs/:id/cancel should reject the mechanic when the job is not assigned to them', async () => {
    await request(
      app.getHttpServer(),
    )
      .patch(`/jobs/${adminJobId}/cancel`)
      .set(
        'Authorization',
        `Bearer ${mechanicToken}`,
      )
      .expect(404);
  });

  it('PATCH /jobs/:id/cancel should allow the admin to cancel the pending job', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .patch(`/jobs/${adminJobId}/cancel`)
      .set(
        'Authorization',
        `Bearer ${adminToken}`,
      )
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: adminJobId,
        status: 'cancelled',
      }),
    );
  });

  it('PATCH /jobs/:id/accept should no longer allow the mechanic to accept the cancelled job', async () => {
    await request(
      app.getHttpServer(),
    )
      .patch(`/jobs/${adminJobId}/accept`)
      .set(
        'Authorization',
        `Bearer ${mechanicToken}`,
      )
      .expect(404);
  });

  it('GET /jobs without authentication should still reject the request', async () => {
    await request(
      app.getHttpServer(),
    )
      .get('/jobs')
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});