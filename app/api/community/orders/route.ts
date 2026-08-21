import { getD1 } from "../../../../db";
import { ensureDatabase } from "../../../../db/runtime";
import { communityProductMap } from "../../../../lib/community/catalog";
import { getSessionUser } from "../../../../lib/server/auth";

type StoredOrderItem = { id: string; name: string; quantity: number; priceCents: number };
type OrderRow = {
  id: number;
  itemsJson: string;
  totalCents: number;
  deliveryFloor: string;
  deliverySeat: string;
  status: "paid" | "preparing" | "delivering" | "delivered";
  createdAt: string;
};

function serializeOrder(row: OrderRow) {
  let items: StoredOrderItem[] = [];
  try { items = JSON.parse(row.itemsJson) as StoredOrderItem[]; } catch { items = []; }
  return {
    id: row.id,
    items,
    totalCents: row.totalCents,
    deliveryFloor: row.deliveryFloor,
    deliverySeat: row.deliverySeat,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const rows = await getD1().prepare(`SELECT id, items_json AS itemsJson, total_cents AS totalCents,
    delivery_floor AS deliveryFloor, delivery_seat AS deliverySeat, status, created_at AS createdAt
    FROM community_orders WHERE user_id = ? ORDER BY id DESC LIMIT 5`).bind(user.id).all<OrderRow>();
  return Response.json({ orders: rows.results.map(serializeOrder) });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const payload = await request.json() as { items?: Array<{ id?: string; quantity?: number }> };
  if (!Array.isArray(payload.items) || payload.items.length === 0 || payload.items.length > 8) {
    return Response.json({ error: "请选择要购买的补给" }, { status: 400 });
  }

  const quantities = new Map<string, number>();
  for (const rawItem of payload.items) {
    const id = String(rawItem.id ?? "");
    const quantity = Number(rawItem.quantity);
    if (!communityProductMap.has(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
      return Response.json({ error: "订单商品信息无效" }, { status: 400 });
    }
    quantities.set(id, Math.min(5, (quantities.get(id) ?? 0) + quantity));
  }

  const reservation = await getD1().prepare(`SELECT seats.floor, seats.label
    FROM reservations JOIN seats ON seats.id = reservations.seat_id
    WHERE reservations.user_id = ? AND reservations.status = 'active'
    ORDER BY reservations.id DESC LIMIT 1`).bind(user.id).first<{ floor: string; label: string }>();
  if (!reservation) return Response.json({ error: "请先预约并选择当前座位，再使用配送服务" }, { status: 409 });

  const items: StoredOrderItem[] = [];
  let totalCents = 0;
  for (const [id, quantity] of quantities) {
    const product = communityProductMap.get(id)!;
    items.push({ id, name: product.name, quantity, priceCents: product.priceCents });
    totalCents += product.priceCents * quantity;
  }

  const result = await getD1().prepare(`INSERT INTO community_orders
    (user_id, items_json, total_cents, delivery_floor, delivery_seat, status)
    VALUES (?, ?, ?, ?, ?, 'preparing')`)
    .bind(user.id, JSON.stringify(items), totalCents, reservation.floor, reservation.label).run();

  const row: OrderRow = {
    id: Number(result.meta.last_row_id),
    itemsJson: JSON.stringify(items),
    totalCents,
    deliveryFloor: reservation.floor,
    deliverySeat: reservation.label,
    status: "preparing",
    createdAt: new Date().toISOString(),
  };
  return Response.json({ order: serializeOrder(row) }, { status: 201 });
}
