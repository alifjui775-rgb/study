let examActive = false;
const listeners = new Set<() => void>();

export function getExamActive() {
  return examActive;
}

export function setExamActive(value: boolean) {
  if (examActive === value) return;
  examActive = value;
  listeners.forEach((fn) => fn());
}

export function subscribeExamActive(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
