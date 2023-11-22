import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserGuard } from 'src/common/user_guard';

@Controller('upload')
@UseGuards(UserGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('')
	@UseInterceptors(FileInterceptor('file'))
	async uploadFile(@UploadedFile() file: Express.Multer.File) {
		return this.uploadService.upload(file);
	}
}
