import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PriceCalculatorModule } from './../src/price_calculator.module';

describe('PriceCalculatorController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PriceCalculatorModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });
});
