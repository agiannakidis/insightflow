import { base44 } from '@/api/base44Client';

/**
 * Wraps base44.functions.invoke and dispatches 'obs:unauthorized'
 * if the response contains a 401 or error === 'Unauthorized'.
 */
export async function apiCall(fnName, payload) {
  const token = localStorage.getItem('obs_token');
  const res = await base44.functions.invoke(fnName, { ...payload, token });

  if (
    res?.status === 401 ||
    res?.data?.error === 'Unauthorized' ||
    res?.data?.error === 'unauthorized'
  ) {
    window.dispatchEvent(new Event('obs:unauthorized'));
    throw new Error('Unauthorized');
  }

  return res;
}