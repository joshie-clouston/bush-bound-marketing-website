/// <reference path="../.astro/types.d.ts" />

type Runtime = import('@astrojs/cloudflare').Runtime<{
  DB: D1Database;
  ASSETS: Fetcher;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  NOTIFICATION_EMAIL: string;
}>;

declare namespace App {
  interface Locals extends Runtime {}
}
