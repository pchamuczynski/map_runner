/**
 * Time overlap between workouts, and the global choice for what to do about it.
 * A workout without a start time cannot overlap anything. One without a duration
 * is a single instant at its start.
 */

export const OVERLAP_POLICIES = Object.freeze([
  { id: 'old', label: 'Keep old' },
  { id: 'new', label: 'Keep new' },
  { id: 'both', label: 'Keep both' },
]);

const POLICY_IDS = new Set(OVERLAP_POLICIES.map((policy) => policy.id));

export const isOverlapPolicy = (value) => POLICY_IDS.has(value);

/** @returns {{ start: number, end: number } | null} Milliseconds. End equals start when duration is unknown. */
export const workoutInterval = (workout) => {
  const start = Date.parse(workout?.startedAt);
  if (!Number.isFinite(start)) return null;
  const durationMs = workout.duration > 0 ? workout.duration * 1000 : 0;
  return { start, end: start + durationMs };
};

/** Inclusive of a shared start, exclusive of a range that only touches the next one. */
export const intervalsOverlap = (a, b) => {
  if (a.start === a.end && b.start === b.end) return a.start === b.start;
  if (a.start === a.end) return b.start <= a.start && a.start < b.end;
  if (b.start === b.end) return a.start <= b.start && b.start < a.end;
  return a.start < b.end && b.start < a.end;
};

const sameRecording = (a, b) =>
  a.externalId != null && b.externalId != null && a.source === b.source && String(a.externalId) === String(b.externalId);

const overlapsOneOf = (workout, others) => {
  const interval = workoutInterval(workout);
  if (!interval) return false;
  return others.some((other) => {
    if (sameRecording(workout, other)) return false;
    const existing = workoutInterval(other);
    return existing != null && intervalsOverlap(interval, existing);
  });
};

/** How many incoming workouts overlap something already stored, ignoring a repeat of the same recording. */
export const countOverlappingImports = (existing, incoming) =>
  incoming.reduce((count, workout) => count + (overlapsOneOf(workout, existing) ? 1 : 0), 0);

/**
 * @param {{ added?: number, filled?: number, overlaps?: number, removed?: number, policy?: string, name?: string }} result
 */
export const describeImportResult = ({ added = 0, filled = 0, overlaps = 0, removed = 0, policy = 'both', name = '' } = {}) => {
  const sentences = [];
  if (added > 0) {
    const place = name ? ` to ${name}` : '';
    sentences.push(`Added ${added} workout${added === 1 ? '' : 's'}${place}.`);
  }
  if (filled > 0) sentences.push(`Recorded the elapsed time on ${filled} workout${filled === 1 ? '' : 's'}.`);
  if (overlaps > 0 && policy === 'old') {
    sentences.push(`${overlaps} overlapping workout${overlaps === 1 ? ' was' : 's were'} left out.`);
  }
  if (overlaps > 0 && policy === 'new') {
    sentences.push(
      `${overlaps} overlapping workout${overlaps === 1 ? '' : 's'} replaced ${removed} already on the route.`,
    );
  }
  if (overlaps > 0 && policy === 'both') {
    sentences.push(`${overlaps} workout${overlaps === 1 ? ' overlaps' : 's overlap'} existing ones. Both were kept.`);
  }
  if (sentences.length === 0) return 'Nothing new was added. These workouts may already be on the route.';
  return sentences.join(' ');
};
