import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

@Module({
	controllers: [UploadController],
	providers: [UploadService],
	imports: [],
})
export class UploadModule { }
