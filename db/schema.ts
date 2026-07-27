import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const appointments = sqliteTable(
  "appointments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reference: text("reference").notNull().unique(),
    serviceId: text("service_id").notNull(),
    serviceName: text("service_name").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceDollars: integer("price_dollars").notNull(),
    appointmentDate: text("appointment_date").notNull(),
    appointmentTime: text("appointment_time").notNull(),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email").notNull(),
    clientPhone: text("client_phone").notNull(),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    uniqueIndex("appointments_slot_idx").on(table.appointmentDate, table.appointmentTime),
  ],
);
