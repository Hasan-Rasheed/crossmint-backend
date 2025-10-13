import { Injectable } from '@nestjs/common';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

@Injectable()
export class AwsService {
  private kmsClient: KMSClient;
  private keyId: string;

  constructor() {
    this.kmsClient = new KMSClient({
      region: process.env.AWS_REGION,


      //// remove endpoint for actual aws usage ////
      /////////////////////////////////////////////
       
      endpoint: process.env.AWS_ENDPOINT, // 👈 localstack endpoint
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.keyId = process.env.KMS_KEY_ID!;
  }

  async encryptData(plainText: string): Promise<any> {
    const command = new EncryptCommand({
      KeyId: this.keyId,
      Plaintext: Buffer.from(plainText),
    });
    const result = await this.kmsClient.send(command);
    return Buffer.from(result.CiphertextBlob as Uint8Array).toString('base64');

  }

 async decryptData(cipherText: string): Promise<string> {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(cipherText, 'base64'),
    });

    const result = await this.kmsClient.send(command);

    // Convert decrypted bytes to UTF-8 text
    return Buffer.from(result.Plaintext as Uint8Array).toString('utf8');
  }
}
