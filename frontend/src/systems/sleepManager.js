import { IDLE_LINES } from '../constants/idleLines.js';
import { EEVEELUTIONS } from '../constants/eeveelutions.js';

export function createSleepManager({
  onIdleLine,
  onSleep,
  getCurrentForm,
}) {
  let idleTimer = null;
  let sleepTimer = null;

  function schedule() {
    clearTimers();

    idleTimer = window.setTimeout(() => {
      const form = getCurrentForm();
      const pool = EEVEELUTIONS[form]?.idleLines || IDLE_LINES;
      const line = pool[Math.floor(Math.random() * pool.length)];
      onIdleLine(line);
    }, 10 * 60 * 1000);

    sleepTimer = window.setTimeout(() => {
      onSleep();
    }, 30 * 60 * 1000);
  }

  function clearTimers() {
    window.clearTimeout(idleTimer);
    window.clearTimeout(sleepTimer);
  }

  return {
    poke() {
      schedule();
    },
    stop() {
      clearTimers();
    },
  };
}

