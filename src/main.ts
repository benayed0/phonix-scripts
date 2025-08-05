import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: { origin: '*' },
  });
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await app.close();
    console.log('App closed gracefully');
  });
}
bootstrap();
