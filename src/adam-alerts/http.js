export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message = payload?.message || payload?.errors || payload?.raw || response.statusText;
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(message)}`);
  }

  return payload;
}
