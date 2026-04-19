import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PgReadModule } from './../src/pg_read.module';

describe('PgReadController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PgReadModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });
});
