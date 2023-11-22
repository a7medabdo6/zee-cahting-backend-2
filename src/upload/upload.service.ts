import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class UploadService {

    private s3: AWS.S3;

    constructor() {
        this.s3 = new AWS.S3({
            endpoint: 'https://fra1.digitaloceanspaces.com',
            accessKeyId: 'DO00UP6CT8T6GBZNRJ9W',
            secretAccessKey: 'oeMbPMl4X62zcEVpilJzwviwRzuNN9wrWy6/pif7jYg',
            region: 'fra1',
        });
    }

    async upload(file: Express.Multer.File): Promise<any> {
        try {
            const fileSplit = file.originalname.split('.');

            const fileName = `${Date.now()}.${fileSplit[fileSplit.length - 1]}`;

            await this.s3.upload({
                Bucket: 'zee-chat',
                Key: fileName,
                Body: file.buffer,
                ACL: 'public-read',
            }).promise();
            return { url: fileName };
        } catch (e) {
            throw new InternalServerErrorException('Something went wrong');
        }
    }
}