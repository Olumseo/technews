// Vercel entry point: runs the Express API as a serverless function.
// Vercel's filesystem is read-only and nothing written at runtime is kept, so the database built
// during deployment is copied to the temp folder and the API runs read-only (see READ_ONLY in server/index.js).
import { copyFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const live = join(tmpdir(), 'technews.db')
if (!existsSync(live)) copyFileSync(join(process.cwd(), 'data', 'technews.db'), live)

process.env.DB_PATH = live
process.env.UPLOADS_DIR = join(tmpdir(), 'technews-uploads')
process.env.READ_ONLY = '1'

// Imported after the settings above, because the server reads them as it loads.
const { default: app } = await import('../server/index.js')

export default app
