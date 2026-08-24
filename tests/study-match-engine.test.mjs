import assert from "node:assert/strict";
import test from "node:test";

import { recommendStudyZones } from "../lib/study-match/engine.ts";

const afternoon = "14:30—18:00";

function zone(floor, zoneName, freeSeats = 10, totalSeats = 20) {
  return { floor, zone: zoneName, freeSeats, totalSeats };
}

test("scene fit changes the ranking for focus and discussion", () => {
  const availability = [zone("3F", "C"), zone("4F", "A")];
  const focus = recommendStudyZones({
    purpose: "focus",
    topic: null,
    timeSlot: afternoon,
    availability,
    livePeerCounts: {},
  });
  const discuss = recommendStudyZones({
    purpose: "discuss",
    topic: "tech",
    timeSlot: afternoon,
    availability,
    livePeerCounts: {},
  });

  assert.equal(`${focus[0].floor}:${focus[0].zone}`, "3F:C");
  assert.equal(`${discuss[0].floor}:${discuss[0].zone}`, "4F:A");
});

test("slot availability can change the winner", () => {
  const scarceQuietZone = recommendStudyZones({
    purpose: "focus",
    topic: null,
    timeSlot: afternoon,
    availability: [zone("3F", "C", 1, 20), zone("2F", "C", 20, 20)],
    livePeerCounts: {},
  });
  const openQuietZone = recommendStudyZones({
    purpose: "focus",
    topic: null,
    timeSlot: afternoon,
    availability: [zone("3F", "C", 20, 20), zone("2F", "C", 1, 20)],
    livePeerCounts: {},
  });

  assert.equal(`${scarceQuietZone[0].floor}:${scarceQuietZone[0].zone}`, "2F:C");
  assert.equal(`${openQuietZone[0].floor}:${openQuietZone[0].zone}`, "3F:C");
});

test("peer demand can change the winner and is capped", () => {
  const chooseA = recommendStudyZones({
    purpose: "discuss",
    topic: "competition",
    timeSlot: afternoon,
    availability: [zone("4F", "A"), zone("4F", "B")],
    livePeerCounts: { "4F:A": 20, "4F:B": 0 },
  });
  const chooseB = recommendStudyZones({
    purpose: "discuss",
    topic: "competition",
    timeSlot: afternoon,
    availability: [zone("4F", "A"), zone("4F", "B")],
    livePeerCounts: { "4F:A": 0, "4F:B": 20 },
  });

  assert.equal(`${chooseA[0].floor}:${chooseA[0].zone}`, "4F:A");
  assert.equal(`${chooseB[0].floor}:${chooseB[0].zone}`, "4F:B");
  assert.ok(chooseA[0].factors.peerDemand <= 20);
});

test("excludes full zones and returns one primary plus at most two alternatives", () => {
  const candidates = recommendStudyZones({
    purpose: "read",
    topic: null,
    timeSlot: afternoon,
    availability: [
      zone("1F", "A"),
      zone("1F", "B"),
      zone("1F", "C"),
      zone("2F", "A"),
      zone("2F", "B", 0, 20),
      zone("2F", "C", 0, 0),
    ],
    livePeerCounts: {},
  });

  assert.equal(candidates.length, 3);
  assert.equal(candidates.some((candidate) => candidate.freeSeats === 0), false);
});

test("returns explainable contribution points whose sum equals the score", () => {
  const [candidate] = recommendStudyZones({
    purpose: "focus",
    topic: null,
    timeSlot: afternoon,
    availability: [zone("3F", "C", 13, 20)],
    livePeerCounts: { "3F:C": 2 },
  });

  assert.equal(
    candidate.factors.sceneFit + candidate.factors.availability + candidate.factors.peerDemand,
    candidate.score,
  );
  assert.match(candidate.reason, /空位|安静|专注|设备|阅读/);
});

test("labels demo baselines and keeps zero-baseline candidates unlabelled", () => {
  const morning = "08:30—12:00";
  const candidates = recommendStudyZones({
    purpose: "read",
    topic: null,
    timeSlot: morning,
    availability: [zone("1F", "A"), zone("1F", "C")],
    livePeerCounts: {},
  });
  const byKey = Object.fromEntries(candidates.map((candidate) => [`${candidate.floor}:${candidate.zone}`, candidate]));

  assert.equal(byKey["1F:A"].includesDemoBaseline, true);
  assert.equal(byKey["1F:C"].includesDemoBaseline, false);
});

test("uses stable floor and zone tie-breaking and returns no full-zone fallback", () => {
  const tied = recommendStudyZones({
    purpose: "other",
    topic: null,
    timeSlot: afternoon,
    availability: [zone("2F", "A"), zone("1F", "A")],
    livePeerCounts: { "1F:A": 0, "2F:A": 0 },
  });
  const full = recommendStudyZones({
    purpose: "focus",
    topic: null,
    timeSlot: afternoon,
    availability: [zone("3F", "C", 0, 20)],
    livePeerCounts: {},
  });

  assert.deepEqual(tied.map((candidate) => `${candidate.floor}:${candidate.zone}`), ["1F:A", "2F:A"]);
  assert.deepEqual(full, []);
});
