import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const quotes = sqliteTable('quotes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  vehicleType: text('vehicle_type'),
  vehicleModel: text('vehicle_model'),
  wishlist: text('wishlist'),
  message: text('message'),
  status: text('status'),
  referral: text('referral'),
  budget: text('budget'),
  timeline: text('timeline'),
  suburb: text('suburb'),
  state: text('state'),
  postcode: text('postcode'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmTerm: text('utm_term'),
  utmContent: text('utm_content'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const flatpackWaitlist = sqliteTable('flatpack_waitlist', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  rego: text('rego'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmTerm: text('utm_term'),
  utmContent: text('utm_content'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
