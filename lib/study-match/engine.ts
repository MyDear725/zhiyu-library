import type { LibraryTimeSlot } from "../library/time";

export type StudyPurpose = "focus" | "discuss" | "read" | "other";
export type StudyTopic = "tech" | "design" | "competition" | "course" | "other";

export type ZoneAvailability = {
  floor: string;
  zone: string;
  freeSeats: number;
  totalSeats: number;
};

export type Candidate = {
  floor: string;
  zone: string;
  zoneName: string;
  score: number;
  freeSeats: number;
  totalSeats: number;
  peerCount: number;
  includesDemoBaseline: boolean;
  factors: {
    sceneFit: number;
    availability: number;
    peerDemand: number;
  };
  reason: string;
};

type SceneDimension = "quiet" | "collaboration" | "reading" | "equipment";
type SceneVector = Record<SceneDimension, number>;
type ZoneProfile = SceneVector & { floor: string; zone: string; zoneName: string };

const zoneProfiles: ZoneProfile[] = [
  { floor: "1F", zone: "A", zoneName: "临窗阅读区", quiet: 65, collaboration: 45, reading: 82, equipment: 65 },
  { floor: "1F", zone: "B", zoneName: "课程讨论区", quiet: 40, collaboration: 78, reading: 70, equipment: 60 },
  { floor: "1F", zone: "C", zoneName: "安静阅览区", quiet: 88, collaboration: 20, reading: 88, equipment: 55 },
  { floor: "2F", zone: "A", zoneName: "灵感阅读区", quiet: 65, collaboration: 45, reading: 82, equipment: 65 },
  { floor: "2F", zone: "B", zoneName: "设计共创区", quiet: 35, collaboration: 95, reading: 45, equipment: 80 },
  { floor: "2F", zone: "C", zoneName: "深度自习区", quiet: 92, collaboration: 25, reading: 75, equipment: 75 },
  { floor: "3F", zone: "A", zoneName: "临窗专注区", quiet: 85, collaboration: 30, reading: 82, equipment: 85 },
  { floor: "3F", zone: "B", zoneName: "中央自习区", quiet: 70, collaboration: 55, reading: 65, equipment: 90 },
  { floor: "3F", zone: "C", zoneName: "静音区", quiet: 100, collaboration: 10, reading: 80, equipment: 80 },
  { floor: "4F", zone: "A", zoneName: "技术协作区", quiet: 40, collaboration: 92, reading: 45, equipment: 100 },
  { floor: "4F", zone: "B", zoneName: "项目研讨区", quiet: 35, collaboration: 100, reading: 40, equipment: 90 },
  { floor: "4F", zone: "C", zoneName: "独立研究区", quiet: 90, collaboration: 35, reading: 70, equipment: 95 },
];

const demoBaselines: Record<LibraryTimeSlot, Record<string, number>> = {
  "08:30—12:00": { "1F:A": 3, "2F:C": 1, "3F:A": 2, "3F:C": 1, "4F:C": 1 },
  "14:30—18:00": { "1F:B": 1, "2F:B": 3, "3F:B": 2, "3F:C": 2, "4F:A": 1, "4F:B": 2 },
  "18:00—21:30": { "1F:A": 1, "2F:B": 2, "2F:C": 2, "3F:C": 3, "4F:A": 2, "4F:B": 4 },
};

const purposeVectors: Record<Exclude<StudyPurpose, "discuss">, SceneVector> = {
  focus: { quiet: 100, collaboration: 10, reading: 70, equipment: 75 },
  read: { quiet: 85, collaboration: 10, reading: 100, equipment: 40 },
  other: { quiet: 65, collaboration: 55, reading: 65, equipment: 65 },
};

const discussionVectors: Record<StudyTopic, SceneVector> = {
  tech: { quiet: 30, collaboration: 100, reading: 30, equipment: 100 },
  design: { quiet: 35, collaboration: 100, reading: 55, equipment: 85 },
  competition: { quiet: 25, collaboration: 100, reading: 35, equipment: 90 },
  course: { quiet: 45, collaboration: 90, reading: 75, equipment: 70 },
  other: { quiet: 35, collaboration: 95, reading: 50, equipment: 70 },
};

const dimensionCopy: Record<SceneDimension, string> = {
  quiet: "安静度与专注氛围",
  collaboration: "协作讨论条件",
  reading: "阅读与资料使用体验",
  equipment: "电源与设备便利度",
};

function zoneKey(floor: string, zone: string) {
  return `${floor}:${zone}`;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function requestedScene(purpose: StudyPurpose, topic: StudyTopic | null) {
  if (purpose === "discuss") return discussionVectors[topic ?? "other"];
  return purposeVectors[purpose];
}

function sceneFit(profile: ZoneProfile, request: SceneVector) {
  const dimensions = Object.keys(request) as SceneDimension[];
  const totalWeight = dimensions.reduce((total, dimension) => total + request[dimension], 0);
  return dimensions.reduce(
    (total, dimension) => total + profile[dimension] * request[dimension],
    0,
  ) / totalWeight;
}

function dominantDimension(profile: ZoneProfile, request: SceneVector) {
  return (Object.keys(request) as SceneDimension[]).sort(
    (left, right) => profile[right] * request[right] - profile[left] * request[left],
  )[0];
}

export function recommendStudyZones(input: {
  purpose: StudyPurpose;
  topic: StudyTopic | null;
  timeSlot: LibraryTimeSlot;
  availability: ZoneAvailability[];
  livePeerCounts: Record<string, number>;
}) {
  const request = requestedScene(input.purpose, input.topic);
  const availabilityByZone = new Map(
    input.availability.map((entry) => [zoneKey(entry.floor, entry.zone), entry]),
  );

  return zoneProfiles
    .flatMap((profile) => {
      const key = zoneKey(profile.floor, profile.zone);
      const capacity = availabilityByZone.get(key);
      if (!capacity || capacity.totalSeats <= 0 || capacity.freeSeats <= 0) return [];

      const demoBaseline = demoBaselines[input.timeSlot][key] ?? 0;
      const peerCount = Math.max(0, input.livePeerCounts[key] ?? 0) + demoBaseline;
      const factors = {
        sceneFit: roundOne(sceneFit(profile, request) * 0.5),
        availability: roundOne((capacity.freeSeats / capacity.totalSeats) * 30),
        peerDemand: roundOne(Math.min(peerCount / 10, 1) * 20),
      };
      const score = factors.sceneFit + factors.availability + factors.peerDemand;
      const emphasis = dimensionCopy[dominantDimension(profile, request)];
      const reason = `${emphasis}更贴合本次学习方式，当前还有 ${capacity.freeSeats} 个空位。`;

      return [{
        floor: profile.floor,
        zone: profile.zone,
        zoneName: profile.zoneName,
        score,
        freeSeats: capacity.freeSeats,
        totalSeats: capacity.totalSeats,
        peerCount,
        includesDemoBaseline: demoBaseline > 0,
        factors,
        reason,
      } satisfies Candidate];
    })
    .sort((left, right) => (
      right.score - left.score
      || right.factors.availability - left.factors.availability
      || right.factors.sceneFit - left.factors.sceneFit
      || left.floor.localeCompare(right.floor)
      || left.zone.localeCompare(right.zone)
    ))
    .slice(0, 3);
}
