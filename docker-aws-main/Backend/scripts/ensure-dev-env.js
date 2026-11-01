import { randomBytes } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

const envPath = fileURLToPath(new URL("../.env", import.meta.url))
const envContents = existsSync(envPath) ? readFileSync(envPath, "utf8") : ""

if (process.env.JWT_SECRET?.trim() || dotenv.parse(envContents).JWT_SECRET?.trim()) {
  process.exit(0)
}

const secret = randomBytes(32).toString("hex")
const secretLine = `JWT_SECRET=${secret}`
const assignment = /^\s*JWT_SECRET\s*=.*$/m
const updatedContents = assignment.test(envContents)
  ? envContents.replace(assignment, secretLine)
  : `${envContents}${envContents && !envContents.endsWith("\n") ? "\n" : ""}${secretLine}\n`

writeFileSync(envPath, updatedContents, "utf8")
console.log("Created a private JWT_SECRET in Backend/.env for local development.")
