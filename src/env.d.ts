/// <reference path="../.astro/types.d.ts" />

type Runtime = import('@astrojs/cloudflare').Runtime<{
  DB: D1Database;
  ASSETS: Fetcher;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  NOTIFICATION_EMAIL: string;
  ALERT_EMAIL: string;
  NOTION_TOKEN: string;
  NOTION_DATABASE_ID: string;
}>;

declare namespace App {
  interface Locals extends Runtime {}
}
