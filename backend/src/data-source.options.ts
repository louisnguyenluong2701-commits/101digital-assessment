import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Invoice } from './invoices/entities/invoice.entity';
import { InvoiceItem } from './invoices/entities/invoice-item.entity';
import { User } from './users/user.entity';

/**
 * Centralised TypeORM connection options, derived entirely from environment
 * variables. Shared by the Nest application (AppModule) and the standalone
 * seed script so both connect to the database in exactly the same way.
 */
export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
    username: config.get<string>('DB_USERNAME', 'simpleinvoice'),
    password: config.get<string>('DB_PASSWORD', 'simpleinvoice'),
    database: config.get<string>('DB_NAME', 'simpleinvoice'),
    entities: [Invoice, InvoiceItem, User],
    synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
  };
}
