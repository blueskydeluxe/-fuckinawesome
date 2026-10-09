// A stalled optional request must never hold the card queue open indefinitely.
export function withDeadline(request, milliseconds = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The request took too long. Please try again.')), milliseconds);
    Promise.resolve().then(request).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export async function previewJSON(url, {signal, timeout = 8000} = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, {once:true});
  try {
    return await withDeadline(async () => {
      const response = await fetch(url, {signal:controller.signal});
      return response.ok ? await response.json() : {};
    }, timeout);
  } finally {
    controller.abort();
    signal?.removeEventListener('abort', abort);
  }
}
