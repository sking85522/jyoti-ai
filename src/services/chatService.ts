import { ref, set, update, remove } from 'firebase/database';
import { rtdb } from '../lib/firebase';

export const safeRtdbSet = async (path: string, data: any) => {
  try {
    await set(ref(rtdb, path), data);
  } catch (err) {
    console.warn("RTDB set permission warning (fallback to LocalStorage active):", err);
  }
};

export const safeRtdbUpdate = async (path: string, data: any) => {
  try {
    await update(ref(rtdb, path), data);
  } catch (err) {
    console.warn("RTDB update permission warning (fallback to LocalStorage active):", err);
  }
};

export const safeRtdbDelete = async (path: string) => {
  try {
    await remove(ref(rtdb, path));
  } catch (err) {
    console.warn("RTDB remove permission warning (fallback to LocalStorage active):", err);
  }
};
