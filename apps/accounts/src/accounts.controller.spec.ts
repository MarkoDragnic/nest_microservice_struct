import { Test, TestingModule } from '@nestjs/testing';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { CryptoService } from './crypto.service';
import { LoggerService } from '@app/common/logger';
import { InternalRpcGuard } from '@app/common';

describe('AccountsController', () => {
  let accountsController: AccountsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        { provide: AccountsService, useValue: {} },
        { provide: CryptoService, useValue: {} },
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
      ],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    accountsController = app.get<AccountsController>(AccountsController);
  });

  it('should be defined', () => {
    expect(accountsController).toBeDefined();
  });
});
