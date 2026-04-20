
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL found');
} else {
    console.log('DATABASE_URL NOT found');
}
