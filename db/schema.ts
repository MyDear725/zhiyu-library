import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    studentId: text("student_id").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    passwordIterations: integer("password_iterations").notNull().default(120000),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_users_student_id").on(table.studentId)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_sessions_token_hash").on(table.tokenHash),
    index("idx_sessions_user_id").on(table.userId),
  ],
);

export const seats = sqliteTable(
  "seats",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    floor: text("floor").notNull(),
    label: text("label").notNull(),
    zone: text("zone").notNull(),
    status: text("status", { enum: ["free", "using", "away"] }).notNull().default("free"),
    mapX: integer("map_x").notNull(),
    mapY: integer("map_y").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_seats_floor_label").on(table.floor, table.label),
    index("idx_seats_floor_status").on(table.floor, table.status),
  ],
);

export const reservations = sqliteTable(
  "reservations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    seatId: integer("seat_id").notNull().references(() => seats.id),
    bookingDate: text("booking_date").notNull(),
    timeSlot: text("time_slot").notNull(),
    status: text("status", { enum: ["active", "cancelled", "completed"] }).notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_reservations_user_status").on(table.userId, table.status),
    index("idx_reservations_seat_date").on(table.seatId, table.bookingDate),
    uniqueIndex("idx_reservations_active_seat_slot")
      .on(table.seatId, table.bookingDate, table.timeSlot)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex("idx_reservations_active_user_slot")
      .on(table.userId, table.bookingDate, table.timeSlot)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const borrowList = sqliteTable(
  "borrow_list",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    bookId: integer("book_id").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_borrow_list_user_book").on(table.userId, table.bookId),
    index("idx_borrow_list_user_id").on(table.userId),
  ],
);

export const studyIntents = sqliteTable(
  "study_intents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    bookingDate: text("booking_date").notNull(),
    timeSlot: text("time_slot").notNull(),
    purpose: text("purpose", { enum: ["focus", "discuss", "read", "other"] }).notNull(),
    topic: text("topic", { enum: ["tech", "design", "competition", "course", "other"] }),
    recommendedFloor: text("recommended_floor").notNull(),
    recommendedZone: text("recommended_zone").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_study_intents_user_slot").on(table.userId, table.bookingDate, table.timeSlot),
    index("idx_study_intents_matching").on(table.bookingDate, table.timeSlot, table.purpose, table.topic),
  ],
);

export const communityOrders = sqliteTable(
  "community_orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    itemsJson: text("items_json").notNull(),
    totalCents: integer("total_cents").notNull(),
    deliveryFloor: text("delivery_floor").notNull(),
    deliverySeat: text("delivery_seat").notNull(),
    status: text("status", { enum: ["paid", "preparing", "delivering", "delivered"] }).notNull().default("preparing"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_community_orders_user_created").on(table.userId, table.createdAt)],
);

export const communityMessages = sqliteTable(
  "community_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    room: text("room", { enum: ["study", "course", "hackathon"] }).notNull(),
    content: text("content").notNull(),
    isAnonymous: integer("is_anonymous", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_community_messages_room_id").on(table.room, table.id)],
);

export const activityEvents = sqliteTable(
  "activity_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadataJson: text("metadata_json"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_activity_events_user_created").on(table.userId, table.createdAt),
    index("idx_activity_events_type_created").on(table.eventType, table.createdAt),
    index("idx_activity_events_entity").on(table.entityType, table.entityId),
  ],
);
