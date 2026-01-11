import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const sql = neon(process.env.DATABASE_URL)

function stripComments(stmt) {
  // Remove full-line comments and get actual SQL
  return stmt
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim()
}

function splitStatements(content) {
  // Split on semicolons but keep track of string literals
  const statements = []
  let current = ""
  let inString = false
  let stringChar = null

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const prevChar = content[i - 1]

    // Track string boundaries (handle escaped quotes)
    if ((char === "'" || char === '"') && prevChar !== "\\") {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        // Check for escaped single quote in PostgreSQL style ''
        if (char === "'" && content[i + 1] === "'") {
          current += char
          i++
          current += content[i]
          continue
        }
        inString = false
        stringChar = null
      }
    }

    if (char === ";" && !inString) {
      const stmt = stripComments(current)
      if (stmt) {
        statements.push(stmt)
      }
      current = ""
    } else {
      current += char
    }
  }

  // Add any remaining content
  const remaining = stripComments(current)
  if (remaining) {
    statements.push(remaining)
  }

  return statements.filter((s) => s.length > 0)
}

async function runMigrations() {
  const migrations = [
    "001-create-schema.sql",
    "002-add-password-hash.sql",
    "003-seed-mobility-exercises.sql",
  ]

  for (const file of migrations) {
    console.log(`Running ${file}...`)
    const content = readFileSync(join(__dirname, file), "utf-8")
    const statements = splitStatements(content)

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (!stmt || stmt.match(/^--/)) continue
      try {
        await sql.query(stmt)
      } catch (error) {
        console.error(`✗ ${file} statement ${i + 1} failed:`, error.message)
        console.error("Statement:", stmt.substring(0, 100))
        throw error
      }
    }
    console.log(`✓ ${file} completed (${statements.length} statements)`)
  }

  console.log("\nAll migrations completed successfully!")
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
