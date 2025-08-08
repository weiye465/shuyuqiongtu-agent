"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messages = exports.chats = exports.MessageRole = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const nanoid_1 = require("nanoid");
// Message role enum type
var MessageRole;
(function (MessageRole) {
    MessageRole["USER"] = "user";
    MessageRole["ASSISTANT"] = "assistant";
    MessageRole["TOOL"] = "tool";
})(MessageRole || (exports.MessageRole = MessageRole = {}));
exports.chats = (0, pg_core_1.pgTable)('chats', {
    id: (0, pg_core_1.text)('id').primaryKey().notNull().$defaultFn(() => (0, nanoid_1.nanoid)()),
    userId: (0, pg_core_1.text)('user_id').notNull(),
    title: (0, pg_core_1.text)('title').notNull().default('New Chat'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.text)('id').primaryKey().notNull().$defaultFn(() => (0, nanoid_1.nanoid)()),
    chatId: (0, pg_core_1.text)('chat_id').notNull().references(() => exports.chats.id, { onDelete: 'cascade' }),
    role: (0, pg_core_1.text)('role').notNull(), // user, assistant, or tool
    parts: (0, pg_core_1.json)('parts').notNull(), // Store parts as JSON in the database
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
