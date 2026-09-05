import { ScheduleBlock } from "./schedule";

export type BlockTuple = [number, number];
export type BlockLike = ScheduleBlock | BlockTuple;

export const DEFAULT_SCHEDULE_BLOCKS: BlockTuple[] = [
  [480, 600],   // 8:00 AM – 10:00 AM
  [630, 780],   // 10:30 AM – 1:00 PM
  [840, 900],   // 2:00 PM – 3:00 PM
  [960, 1080],  // 4:00 PM – 6:00 PM
  [1140, 1260], // 7:00 PM – 10:00 PM
  [1290, 1440], // 10:30 PM – 12:00 AM
];

function toTuple(block: BlockLike): BlockTuple {
  if (Array.isArray(block)) return block;
  return [block.startMin, block.endMin];
}

export function scheduleTotalSeconds(blocks: BlockLike[]): number {
  return blocks.reduce(
    (sum, b) => {
      const [s, e] = toTuple(b);
      return sum + (e - s) * 60;
    },
    0
  );
}

export function scheduleTargetAtMinute(
  blocks: BlockLike[],
  minuteOfDay: number
): number {
  let acc = 0;
  for (const b of blocks) {
    const [start, end] = toTuple(b);
    if (minuteOfDay <= start) break;
    const overlap = Math.min(minuteOfDay, end) - start;
    acc += overlap * 60;
  }
  return acc;
}

export function minutesToTimeLabel(min: number): string {
  const m = Math.max(0, Math.min(1439, min));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(mm).padStart(2, "0")} ${suffix}`;
}

export function timeInputToMinute(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 24 || mm < 0 || mm > 59) return null;
  if (h === 24 && mm !== 0) return null;
  return Math.min(h * 60 + mm, 1440);
}

export function minuteToTimeInput(min: number): string {
  const m = Math.max(0, Math.min(1440, min));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export interface ScheduleBlockProgress {
  startMin: number;
  endMin: number;
  completedMinutes: number;
  missedMinutes: number;
}

export function computeBlockProgress(
  blocks: BlockLike[],
  studyIntervals: [number, number][]
): ScheduleBlockProgress[] {
  const tuples = blocks.map(toTuple).sort((a, b) => a[0] - b[0]);
  const N = tuples.length;
  if (N === 0) return [];

  const assignment = new Int16Array(1440);
  assignment.fill(-1);

  for (let m = 0; m < 1440; m++) {
    let inside = -1;
    for (let i = 0; i < N; i++) {
      const [s, e] = tuples[i];
      if (m >= s && m < e) {
        inside = i;
        break;
      }
    }
    if (inside !== -1) {
      assignment[m] = inside;
      continue;
    }
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < N; i++) {
      const [s, e] = tuples[i];
      const dist = m < s ? s - m : m >= e ? m - e + 1 : 0;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    assignment[m] = best;
  }

  const studied = new Uint8Array(1440);
  for (const [a, b] of studyIntervals) {
    const start = Math.max(0, Math.min(1439, Math.floor(a)));
    const end = Math.max(start, Math.min(1440, Math.ceil(b)));
    for (let m = start; m < end; m++) studied[m] = 1;
  }

  const completed = new Array(N).fill(0);
  for (let m = 0; m < 1440; m++) {
    const a = assignment[m];
    if (a >= 0 && studied[m]) completed[a]++;
  }

  return tuples.map(([s, e], i) => {
    const scheduled = e - s;
    const done = Math.min(scheduled, completed[i]);
    return {
      startMin: s,
      endMin: e,
      completedMinutes: done,
      missedMinutes: scheduled - done,
    };
  });
}
