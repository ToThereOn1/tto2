
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

const client = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" // Using the connection string from the failed psql command
})

async function migrate() {
    try {
        await client.connect()
        console.log('Connected to database.')

        const sqlPath = path.join(process.cwd(), 'sql', 'module10_payments.sql')
        const sql = fs.readFileSync(sqlPath, 'utf8')

        console.log('Executing SQL...')
        await client.query(sql)
        console.log('Migration successful!')
    } catch (err) {
        console.error('Migration failed:', err)
        process.exit(1)
    } finally {
        await client.end()
    }
}

migrate()
