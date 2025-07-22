import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: { origin: '*' },
  });
  await app.listen(3000, '0.0.0.0');
  app.use('/assets', express.static(join(__dirname, '..', 'assets')));

  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await app.close();
    console.log('App closed gracefully');
  });
}
bootstrap();
