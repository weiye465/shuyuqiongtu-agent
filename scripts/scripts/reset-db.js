"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../lib/db");
async function resetDatabase() {
    console.log("🗑️  Dropping all tables...");
    try {
        // Drop tables in reverse order due to foreign key constraints
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS messages CASCADE`);
        console.log("✓ Dropped messages table");
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS chats CASCADE`);
        console.log("✓ Dropped chats table");
        // Drop any other tables that might exist from previous migrations
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS verification CASCADE`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS user CASCADE`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS account CASCADE`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS payment CASCADE`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS session CASCADE`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS affiliates CASCADE`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS apikeys CASCADE`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS credits CASCADE`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS feedbacks CASCADE`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS orders CASCADE`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS posts CASCADE`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS users CASCADE`);
        console.log("✓ All tables dropped successfully");
        console.log("\n📝 Creating new tables...");
        // Create chats table
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
        console.log("✓ Created chats table");
        // Create messages table
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        parts JSON NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
        console.log("✓ Created messages table");
        // Create indexes for better performance
        await db_1.db.execute((0, drizzle_orm_1.sql) `CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)`);
        await db_1.db.execute((0, drizzle_orm_1.sql) `CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`);
        console.log("✓ Created indexes");
        console.log("\n✅ Database reset completed successfully!");
    }
    catch (error) {
        console.error("❌ Error resetting database:", error);
        throw error;
    }
    finally {
        process.exit(0);
    }
}
// Run the reset
resetDatabase().catch(console.error);
