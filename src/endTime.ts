const deadline = `2026-02-22T00:00:00.000Z`;

export function hasDeadlinePassed() {
  return new Date() > new Date(deadline);
}