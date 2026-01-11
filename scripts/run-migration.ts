import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
const envContent = readFileSync('.env.local', 'utf8');
const envVars: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    // Remove surrounding quotes if present
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[match[1].trim()] = value;
  }
}

const DATABASE_URL = envVars.DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigration() {
  const migrationSQL = readFileSync('scripts/002-training-exercises-templates.sql', 'utf8');

  // Remove comment lines and then split by semicolons
  const sqlWithoutComments = migrationSQL
    .split('\n')
    .map(line => line.startsWith('--') ? '' : line)
    .join('\n');

  const statements = sqlWithoutComments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Running ${statements.length} statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    try {
      const preview = statement.substring(0, 60).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);
      await sql.query(statement);
      console.log('  ✓ Success');
    } catch (err: unknown) {
      const error = err as Error;
      // Ignore 'already exists' errors for idempotent operations
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log('  ⊘ Skipped (already exists)');
      } else {
        console.error('  ✗ Error:', error.message);
      }
    }
  }

  console.log('\n✓ Migration complete!');
}

runMigration().catch(console.error);
