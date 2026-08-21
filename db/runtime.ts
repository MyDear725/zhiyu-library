import { getD1 } from ".";

let bootstrapPromise: Promise<void> | null = null;

const usingSeats: Record<string, number[]> = {
  "1F": [2, 3, 6, 7, 11, 16, 17, 18, 23, 24, 29, 32, 35, 39, 42, 46],
  "2F": [1, 4, 5, 9, 13, 14, 20, 21, 26, 30, 33, 38, 43, 47],
  "3F": [2, 7, 8, 13, 19, 20, 28, 32, 37, 44],
  "4F": [3, 5, 6, 10, 15, 18, 22, 27, 31, 34, 36, 41, 45],
};

const awaySeats: Record<string, number[]> = {
  "1F": [9, 21, 33, 44],
  "2F": [7, 18, 29, 40],
  "3F": [4, 17, 27, 41],
  "4F": [8, 20, 30, 43],
};

export async function ensureDatabase() {
  bootstrapPromise ??= bootstrap();
  return bootstrapPromise;
}

async function bootstrap() {
  const d1 = getD1();

  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_iterations INTEGER NOT NULL DEFAULT 120000,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      floor TEXT NOT NULL,
      label TEXT NOT NULL,
      zone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'free' CHECK(status IN ('free', 'using', 'away')),
      map_x INTEGER NOT NULL,
      map_y INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(floor, label)
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seat_id INTEGER NOT NULL REFERENCES seats(id),
      booking_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'completed')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS borrow_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id)
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS study_intents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK(purpose IN ('focus', 'discuss', 'read', 'other')),
      topic TEXT CHECK(topic IS NULL OR topic IN ('tech', 'design', 'competition', 'course', 'other')),
      recommended_floor TEXT NOT NULL,
      recommended_zone TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, booking_date, time_slot)
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS community_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      items_json TEXT NOT NULL,
      total_cents INTEGER NOT NULL CHECK(total_cents >= 0),
      delivery_floor TEXT NOT NULL,
      delivery_seat TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'preparing' CHECK(status IN ('paid', 'preparing', 'delivering', 'delivered')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS community_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      room TEXT NOT NULL CHECK(room IN ('study', 'course', 'hackathon')),
      content TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0 CHECK(is_anonymous IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_seats_floor_status ON seats(floor, status)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_reservations_user_status ON reservations(user_id, status)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_reservations_seat_date ON reservations(seat_id, booking_date)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_active_seat_slot ON reservations(seat_id, booking_date, time_slot) WHERE status = 'active'"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_active_user_slot ON reservations(user_id, booking_date, time_slot) WHERE status = 'active'"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_borrow_list_user_id ON borrow_list(user_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_study_intents_matching ON study_intents(booking_date, time_slot, purpose, topic)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_community_orders_user_created ON community_orders(user_id, created_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_community_messages_room_id ON community_messages(room, id)"),
  ]);

  const messageColumns = await d1.prepare("PRAGMA table_info(community_messages)").all<{ name: string }>();
  if (!messageColumns.results.some((column) => column.name === "is_anonymous")) {
    await d1.prepare("ALTER TABLE community_messages ADD COLUMN is_anonymous INTEGER NOT NULL DEFAULT 0 CHECK(is_anonymous IN (0, 1))").run();
  }

  const count = await d1.prepare("SELECT COUNT(*) AS count FROM seats").first<{ count: number }>();
  if (Number(count?.count ?? 0) === 0) {
    const statements: D1PreparedStatement[] = [];
    for (const floor of ["1F", "2F", "3F", "4F"]) {
      for (let seat = 1; seat <= 48; seat += 1) {
        const zoneIndex = Math.floor((seat - 1) / 16);
        const zone = String.fromCharCode(65 + zoneIndex);
        const label = `${zone}-${String(((seat - 1) % 16) + 1).padStart(2, "0")}`;
        const status = usingSeats[floor].includes(seat)
          ? "using"
          : awaySeats[floor].includes(seat)
            ? "away"
            : "free";
        const mapX = zoneIndex * 100 + ((seat - 1) % 4) * 20;
        const mapY = Math.floor(((seat - 1) % 16) / 4) * 20;
        statements.push(
          d1.prepare("INSERT INTO seats (floor, label, zone, status, map_x, map_y) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(floor, label, zone, status, mapX, mapY),
        );
      }
    }
    for (let index = 0; index < statements.length; index += 50) {
      await d1.batch(statements.slice(index, index + 50));
    }
  }

  const communityMessageCount = await d1.prepare("SELECT COUNT(*) AS count FROM community_messages").first<{ count: number }>();
  if (Number(communityMessageCount?.count ?? 0) === 0) {
    await d1.batch([
      d1.prepare("INSERT INTO community_messages (user_id, room, content) VALUES (NULL, 'study', ?)").bind("欢迎来到学习搭子广场。可以说说你今天的学习目标和所在楼层。"),
      d1.prepare("INSERT INTO community_messages (user_id, room, content) VALUES (NULL, 'course', ?)").bind("这里适合交流课程资料与解题思路，请避免直接发布作业答案。"),
      d1.prepare("INSERT INTO community_messages (user_id, room, content) VALUES (NULL, 'hackathon', ?)").bind("正在寻找竞赛队友？介绍一下你的方向、技能和可协作时间吧。"),
    ]);
  }

  await d1.prepare("DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP").run();
  await d1.prepare("PRAGMA optimize").run();
}
