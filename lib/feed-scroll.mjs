export function mergeDiscoveries(existing, incoming) {
  const rows = new Map(existing.map(item => [item.id, item]));
  for (const item of incoming) rows.set(item.id, item);
  return [...rows.values()];
}

// The feed returns 50 records plus one look-ahead record.
export async function readFeedBatch(fetchPage, {offset = 0, count = 50} = {}) {
  let data = [], more = false;
  do {
    let result;
    try { result = await fetchPage(offset + data.length); }
    catch (error) { return {data: [], error, more: false}; }
    if (result.error) return {data: [], error: result.error, more: false};
    const rows = result.data || [];
    more = rows.length > 50;
    data.push(...rows.slice(0, 50));
  } while (more && data.length < count);
  return {data, error: null, more};
}
