import * as fs from "node:fs";

const MIRA_API_KEY = process.env.MIRA_API_KEY;
const CONVEX_SITE_URL =
  process.env.CONVEX_SITE_URL || "https://hidden-tern-314.convex.site";

if (!MIRA_API_KEY) {
  console.error("MIRA_API_KEY environment variable is required");
  process.exit(1);
}

const CSV_PATH = "/Users/dan/clawd/health/blood_results.csv";
const BATCH_SIZE = 25;

interface BloodLabEntry {
  drawDate: string;
  markerName: string;
  markerDescription: string | undefined;
  value: number;
  units: string | undefined;
  referenceRange: string | undefined;
  source: string | undefined;
}

function convertDate(raw: string): string {
  const parts = raw.split("/");
  const month = parts[0].padStart(2, "0");
  const day = parts[1].padStart(2, "0");
  const year = parts[2];
  return `${year}-${month}-${day}`;
}

function orUndefined(val: string): string | undefined {
  return val.trim() === "" ? undefined : val.trim();
}

function parseCSV(content: string): BloodLabEntry[] {
  const lines = content.split("\n").filter((l) => l.trim() !== "");
  // Skip header row
  const dataLines = lines.slice(1);
  const entries: BloodLabEntry[] = [];
  let skipped = 0;

  for (const line of dataLines) {
    const cols = line.split(",");
    // Columns: Draw Date, Marker Name, Marker Description, Value, Units, Reference Range, Source
    const rawDate = cols[0]?.trim() ?? "";
    const markerName = cols[1]?.trim() ?? "";
    const markerDescription = cols[2]?.trim() ?? "";
    const rawValue = cols[3]?.trim() ?? "";
    const units = cols[4]?.trim() ?? "";
    const referenceRange = cols[5]?.trim() ?? "";
    const source = cols[6]?.trim() ?? "";

    const value = parseFloat(rawValue);
    if (rawValue === "" || isNaN(value)) {
      skipped++;
      continue;
    }

    entries.push({
      drawDate: convertDate(rawDate),
      markerName,
      markerDescription: orUndefined(markerDescription),
      value,
      units: orUndefined(units),
      referenceRange: orUndefined(referenceRange),
      source: orUndefined(source),
    });
  }

  if (skipped > 0) {
    console.log(`Skipped ${skipped} rows with empty/non-numeric values`);
  }

  return entries;
}

async function postBatch(entries: BloodLabEntry[]): Promise<Response> {
  return fetch(`${CONVEX_SITE_URL}/api/bloodlabs/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MIRA_API_KEY}`,
    },
    body: JSON.stringify({ entries }),
  });
}

async function main() {
  console.log(`Target: ${CONVEX_SITE_URL}`);
  console.log(`Source: ${CSV_PATH}\n`);

  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const entries = parseCSV(raw);
  console.log(`Parsed ${entries.length} valid entries\n`);

  const totalBatches = Math.ceil(entries.length / BATCH_SIZE);
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < totalBatches; i++) {
    const batch = entries.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const batchNum = i + 1;

    try {
      const res = await postBatch(batch);
      if (res.ok) {
        console.log(`  Batch ${batchNum}/${totalBatches} - success (${batch.length} entries)`);
        succeeded += batch.length;
      } else {
        const body = await res.text();
        console.log(`  Batch ${batchNum}/${totalBatches} - FAILED: ${res.status} ${res.statusText} ${body}`);
        failed += batch.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  Batch ${batchNum}/${totalBatches} - FAILED: ${msg}`);
      failed += batch.length;
    }
  }

  const total = succeeded + failed;
  console.log(`\nDone! ${succeeded}/${total} succeeded, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
