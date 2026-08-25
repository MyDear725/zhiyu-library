export function buildPeerSignal({ normalizedTopic = "学习探索", peerCount = 0, purpose = "other" } = {}) {
  return { topic: normalizedTopic, count: Math.max(0, Number(peerCount) || 0), suggestedRoom: purpose === "discuss" ? "hackathon" : "study", privacyMode: "anonymous-aggregate" };
}
