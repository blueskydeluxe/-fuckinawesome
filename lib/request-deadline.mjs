// A stalled optional request must never hold the card queue open indefinitely.
export function withDeadline(request, milliseconds = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The request took too long. Please try again.')), milliseconds);
    Promise.resolve().then(request).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

const previewCache = new Map();
export function cachedPreview(url) {
 const hit=previewCache.get(url);if(hit&&hit.until>Date.now())return hit.data;previewCache.delete(url);return null;
}
export async function previewJSON(url, {signal, timeout = 8000} = {}) {
 const cached=cachedPreview(url);if(cached&&!signal?.aborted)return cached;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, {once:true});
  try {
    return await withDeadline(async () => {
      const response = await fetch(url, {signal:controller.signal});
      if(!response.ok)return {};
      const data=await response.json();
      if(!controller.signal.aborted){previewCache.set(url,{data,until:Date.now()+60000});if(previewCache.size>80)previewCache.delete(previewCache.keys().next().value);}
      return data;
    }, timeout);
  } finally {
    controller.abort();
    signal?.removeEventListener('abort', abort);
  }
}
