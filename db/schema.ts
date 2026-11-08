import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{id:text('id').primaryKey(),kind:text('kind').notNull(),data:text('data').notNull(),version:integer('version').notNull().default(1),updated:text('updated').notNull()},t=>[index('records_kind').on(t.kind)]);
export const sessions=sqliteTable('sessions',{token:text('token').primaryKey(),role:text('role').notNull(),name:text('name').notNull(),expires:integer('expires').notNull()});
export const audit=sqliteTable('audit',{id:text('id').primaryKey(),actor:text('actor').notNull(),action:text('action').notNull(),record:text('record'),before:text('before'),after:text('after'),time:text('time').notNull()});
export const reservations=sqliteTable('reservations',{responder:text('responder').primaryKey(),task:text('task').notNull().unique()});
