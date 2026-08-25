export function recommendSpace({ purpose = "other", topic = null, availableSeats = 0 } = {}) {
  const key = purpose === "discuss" ? `discuss:${topic ?? "other"}` : purpose;
  const presets = { focus: ["3F", "C", "静音区"], read: ["1F", "A", "临窗阅读区"], other: ["2F", "B", "中央灵活区"], "discuss:tech": ["4F", "A", "技术协作区"], "discuss:competition": ["4F", "B", "项目研讨区"], "discuss:design": ["2F", "B", "设计共创区"], "discuss:course": ["1F", "B", "课程讨论区"], "discuss:other": ["4F", "B", "开放研讨区"] };
  const [floor, zone, zoneName] = presets[key] ?? presets.other;
  return { floor, zone, zoneName, score: Math.min(100, 62 + Math.min(availableSeats, 20)), reasonFactors: ["现有学习目的", "可用座位"], reason: `根据当前学习目的和现有座位，推荐${zoneName}。` };
}
