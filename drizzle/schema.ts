import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const quotes = sqliteTable('quotes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  vehicleType: text('vehicle_type'),
  vehicleModel: text('vehicle_model'),
  serviceType: text('service_type'),
  message: text('message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
