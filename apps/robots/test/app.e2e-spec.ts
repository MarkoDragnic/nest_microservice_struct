import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { RobotsModule } from './../src/robots.module';

describe('RobotsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RobotsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });
});
