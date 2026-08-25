import { getD1 } from "../../db";
import { sanitizeActivityMetadata } from "./activity-metadata.js";

export type ActivityEventType = "book_search" | "book_added" | "assistant_question" | "librarian_plan_created" | "reservation_created" | "study_intent_saved" | "community_posted" | "checkout_completed";

type ActivityInput = {
  userId: number | null;
  eventType: ActivityEventType;
  entityType?: string;
  entityId?: string | number;
  metadata?: Record<string, unknown>;
};

export async function recordActivity(input: ActivityInput) {
  try {
    const metadata = sanitizeActivityMetadata(input.metadata);
    await getD1().prepare(`INSERT INTO activity_events (user_id, event_type, entity_type, entity_id, metadata_json)
      VALUES (?, ?, ?, ?, ?)`)
      .bind(input.userId, input.eventType, input.entityType ?? null, input.entityId == null ? null : String(input.entityId), Object.keys(metadata).length ? JSON.stringify(metadata) : null)
      .run();
  } catch (error) {
    console.warn("LibraryOS activity write skipped", error);
  }
}
