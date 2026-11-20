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

interface ImportMetaEnv {
  /** Browser key for Google address suggestions on the kit builder (restrict it to the site's domains). Optional. */
  readonly PUBLIC_GOOGLE_MAPS_API_KEY?: string;
}
