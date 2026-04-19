import { Global, Module } from '@nestjs/common';
import { SerializerService } from './serializer.service';
import { GeneralService } from './general.service';

@Global()
@Module({
  providers: [SerializerService, GeneralService],
  exports: [SerializerService, GeneralService],
})
export class CommonLibsModule {}
