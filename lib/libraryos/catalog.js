export const books = [
  { id: 1, title: "百年孤独", author: "加西亚·马尔克斯", category: "文学", callNumber: "I775.45 / 12", location: "三层文学区 · 18架", available: 2, total: 4, exposure: 65, topics: ["家族记忆", "拉美历史", "魔幻现实"] },
  { id: 2, title: "置身事内：中国政府与经济发展", author: "兰小欢", category: "社科", callNumber: "F12 / 286", location: "四层社科区 · 07架", available: 3, total: 6, exposure: 48, topics: ["政府运行", "区域经济", "制度设计"] },
  { id: 3, title: "设计心理学", author: "唐纳德·诺曼", category: "设计", callNumber: "TB47 / 91", location: "二层艺术区 · 12架", available: 1, total: 3, exposure: 55, topics: ["认知心理", "产品体验", "人机交互"] },
  { id: 4, title: "芯片战争：世界最关键技术的争夺战", author: "克里斯·米勒", category: "科技", callNumber: "TN4 / 203", location: "五层科技区 · 24架", available: 0, total: 5, exposure: 41, topics: ["半导体", "产业政策", "国际关系"] },
  { id: 5, title: "额尔古纳河右岸", author: "迟子建", category: "文学", callNumber: "I247.57 / 844", location: "三层文学区 · 26架", available: 4, total: 7, exposure: 34, topics: ["民族叙事", "生态文学", "现代化"] },
  { id: 6, title: "人类简史：从动物到上帝", author: "尤瓦尔·赫拉利", category: "社科", callNumber: "K02 / 117", location: "四层社科区 · 02架", available: 2, total: 8, exposure: 78, topics: ["文明演化", "经济制度", "科技革命"] },
  { id: 7, title: "乡土中国", author: "费孝通", category: "社科", callNumber: "C912.82 / 31", location: "四层社科区 · 11架", available: 5, total: 9, exposure: 39, topics: ["社会结构", "文化传统", "城乡变迁"] },
  { id: 8, title: "月亮与六便士", author: "威廉·萨默塞特·毛姆", category: "文学", callNumber: "I561.45 / 182", location: "三层文学区 · 09架", available: 3, total: 6, exposure: 52, topics: ["艺术理想", "个体选择", "社会规范"] },
  { id: 9, title: "创新者的窘境", author: "克莱顿·克里斯坦森", category: "设计", callNumber: "F273.1 / 76", location: "二层创新区 · 05架", available: 2, total: 4, exposure: 44, topics: ["破坏式创新", "组织管理", "技术周期"] },
  { id: 10, title: "艺术的故事", author: "E.H.贡布里希", category: "设计", callNumber: "J110.9 / 48", location: "二层艺术区 · 03架", available: 1, total: 3, exposure: 28, topics: ["艺术史", "视觉表达", "时代文化"] },
  { id: 11, title: "浪潮之巅", author: "吴军", category: "科技", callNumber: "F49 / 164", location: "五层科技区 · 18架", available: 4, total: 5, exposure: 36, topics: ["科技产业", "商业模式", "创新周期"] },
  { id: 12, title: "乌合之众", author: "古斯塔夫·勒庞", category: "社科", callNumber: "C912.64 / 22", location: "四层社科区 · 15架", available: 2, total: 7, exposure: 46, topics: ["群体心理", "传播机制", "社会行为"] },
];

export const relatedBookIds = { 1: [6, 7, 10], 2: [3, 4, 9], 3: [4, 2, 11], 4: [2, 9, 6], 5: [7, 6, 10], 6: [4, 3, 10], 7: [5, 3, 4], 8: [10, 3, 7], 9: [11, 2, 6], 10: [8, 6, 4], 11: [9, 2, 7], 12: [3, 4, 8] };

const queryTopics = [
  { tokens: ["rag", "agent", "ai", "人工智能", "黑客松", "编程", "技术"], topics: ["科技产业", "创新周期", "半导体"], ids: [11, 9, 4] },
  { tokens: ["设计", "产品", "交互", "创意"], topics: ["产品体验", "破坏式创新", "视觉表达"], ids: [3, 9, 10] },
  { tokens: ["阅读", "文学", "小说", "故事"], topics: ["家族记忆", "艺术理想", "生态文学"], ids: [1, 8, 5] },
  { tokens: ["社会", "经济", "课程", "研究"], topics: ["社会结构", "政府运行", "群体心理"], ids: [7, 2, 12] },
];

export function findBooks(query) {
  const normalized = String(query ?? "").trim().toLowerCase();
  const direct = books.filter((book) => [book.title, book.author, book.category, book.callNumber, ...book.topics].join(" ").toLowerCase().includes(normalized));
  if (direct.length) return direct;
  const mapping = queryTopics.find((item) => item.tokens.some((token) => normalized.includes(token)));
  return mapping ? mapping.ids.map((id) => books.find((book) => book.id === id)).filter(Boolean) : books.slice(0, 3);
}

export function inferTopics(query) {
  const normalized = String(query ?? "").toLowerCase();
  const mapping = queryTopics.find((item) => item.tokens.some((token) => normalized.includes(token)));
  return mapping?.topics ?? findBooks(query).flatMap((book) => book.topics).slice(0, 3);
}

export function recommendLowExposureBook(topics = [], excludedIds = []) {
  const query = topics.join(" ").toLowerCase();
  const candidates = books.filter((book) => !excludedIds.includes(book.id) && book.available > 0);
  return candidates.sort((left, right) => {
    const leftScore = left.topics.some((topic) => query.includes(topic.toLowerCase())) ? 100 - left.exposure : -left.exposure;
    const rightScore = right.topics.some((topic) => query.includes(topic.toLowerCase())) ? 100 - right.exposure : -right.exposure;
    return rightScore - leftScore;
  })[0] ?? null;
}
