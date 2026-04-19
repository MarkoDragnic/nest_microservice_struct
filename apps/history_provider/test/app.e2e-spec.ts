import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HistoryProviderModule } from './../src/history_provider.module';

describe('HistoryProviderController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HistoryProviderModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });
});
