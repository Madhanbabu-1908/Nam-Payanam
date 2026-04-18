import { useState, useEffect } from 'react';

// Offline expense queue stored in localStorage
const QUEUE_KEY = 'np_offline_queue';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on  = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return isOffline;
}

export function queueExpense(expenseData) {
  const q = getQueue();
  q.push({ ...expenseData, _queued_at: Date.now(), _id: crypto.randomUUID() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]'); } catch { return []; }
}

export function clearQueue() { localStorage.removeItem(QUEUE_KEY); }

export async function flushQueue(addExpenseFn) {
  const q = getQueue();
  if (!q.length) return 0;
  let flushed = 0;
  for (const item of q) {
    try {
      const { _queued_at, _id, ...data } = item;
      await addExpenseFn(data);
      flushed++;
    } catch { break; }
  }
  if (flushed === q.length) clearQueue();
  else localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(flushed)));
  return flushed;
}
