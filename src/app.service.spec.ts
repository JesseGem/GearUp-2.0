import { AppService } from './app.service.js';

describe('AppService', () => {
  it('returns the API health payload', () => {
    const service = new AppService();

    expect(service.getHealth()).toEqual({
      status: 'ok',
      service: 'gearup-api',
    });
  });
});
