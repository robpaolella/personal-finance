import dotenv from 'dotenv';
dotenv.config();

import { sqlite } from './index.js';
import { migrateFinancialInstitutions } from './migrate-financial-institutions.js';
import { migrateVendorLogos } from './migrate-vendor-logos.js';
import { fetchInstitutionLogo, fetchVendorLogo, logoDevConfigured } from '../services/institutionLogos.js';

/**
 * One-off: fetch logos from logo.dev for every seeded institution AND vendor that
 * doesn't have one cached yet, cache them under /uploads, then backfill those
 * vendor logos onto existing merchants. Idempotent — only fills gaps.
 *
 *   1. Sign up at logo.dev, copy your publishable token (pk_...).
 *   2. LOGODEV_TOKEN=pk_... npm run logos   (from packages/server)
 */
async function hydrate(
  table: string,
  fetcher: (id: number, domain: string) => Promise<string | null>,
): Promise<void> {
  const rows = sqlite.prepare(
    `SELECT id, name, domain FROM ${table} WHERE logo_url IS NULL AND domain IS NOT NULL AND TRIM(domain) <> ''`
  ).all() as { id: number; name: string; domain: string }[];
  console.log(`\n${table}: hydrating ${rows.length} logo(s) from logo.dev...`);
  const setLogo = sqlite.prepare(`UPDATE ${table} SET logo_url = ? WHERE id = ?`);
  let ok = 0;
  const missed: string[] = [];
  for (const r of rows) {
    const url = await fetcher(r.id, r.domain);
    if (url) { setLogo.run(url, r.id); ok++; process.stdout.write('.'); }
    else { missed.push(`${r.name} (${r.domain})`); process.stdout.write('x'); }
  }
  console.log(`\n  ${ok} cached, ${missed.length} not found.`);
  if (missed.length) console.log('  Missing:', missed.join(', '));
}

async function main(): Promise<void> {
  if (!logoDevConfigured()) {
    console.error('LOGODEV_TOKEN is not set. Add it to packages/server/.env, then re-run: npm run logos');
    process.exit(1);
  }

  // Ensure tables + seed rows exist even if the server was never started.
  migrateFinancialInstitutions(sqlite);
  migrateVendorLogos(sqlite);

  await hydrate('financial_institutions', fetchInstitutionLogo);
  await hydrate('vendor_logos', fetchVendorLogo);

  // Re-run the vendor migration so its merchant-logo backfill picks up the logos
  // we just cached (attaches them to existing merchants whose name matches).
  migrateVendorLogos(sqlite);

  console.log('\nDone. (Logos that were not found render a colored monogram.)');
  sqlite.close();
}

main().catch((err) => { console.error('Logo hydration failed:', err); process.exit(1); });
