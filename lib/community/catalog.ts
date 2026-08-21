export type CommunityProduct = {
  id: string;
  name: string;
  category: "咖啡" | "烘焙" | "轻食" | "饮品";
  priceCents: number;
  mark: string;
  description: string;
};

export const communityProducts: CommunityProduct[] = [
  { id: "americano", name: "图书馆美式", category: "咖啡", priceCents: 1200, mark: "咖", description: "中度烘焙，清爽不甜" },
  { id: "latte", name: "燕麦拿铁", category: "咖啡", priceCents: 1600, mark: "拿", description: "燕麦奶与浓缩咖啡" },
  { id: "croissant", name: "原味可颂", category: "烘焙", priceCents: 1000, mark: "颂", description: "每日现烤，酥脆轻盈" },
  { id: "sandwich", name: "全麦三明治", category: "轻食", priceCents: 1500, mark: "麦", description: "鸡蛋、生菜与全麦吐司" },
  { id: "milk", name: "低温鲜牛乳", category: "饮品", priceCents: 800, mark: "乳", description: "冷藏配送，原味无糖" },
  { id: "cookie", name: "燕麦曲奇", category: "烘焙", priceCents: 600, mark: "曲", description: "独立包装，低声享用" },
];

export const communityProductMap = new Map(communityProducts.map((product) => [product.id, product]));
