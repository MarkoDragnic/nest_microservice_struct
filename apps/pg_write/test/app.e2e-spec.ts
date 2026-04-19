import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PgWriteModule } from './../src/pg_write.module';

describe('PgWriteController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PgWriteModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });
});
