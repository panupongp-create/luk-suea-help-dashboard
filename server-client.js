// A small adapter for the self-hosted API. The existing public/staff UI can
// use the same response shape while GitHub Pages keeps its Supabase connection.
async function api(path, options) {
  const response = await fetch(path, {credentials: "same-origin", ...options});
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  return result.data;
}

export function createServerClient() {
  return {
    async rpc(name, params = {}) {
      try {
        return {data: await api(`/api/rpc/${encodeURIComponent(name)}`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(params)
        }), error: null};
      } catch (error) {
        return {data: null, error};
      }
    },
    from(table) {
      if (table !== "public_requests") throw new Error("Unsupported table");
      return {
        select() {
          return {
            order(column, {ascending} = {}) {
              if (column !== "received_at" || ascending !== false) throw new Error("Unsupported order");
              return {
                async limit(count) {
                  try {
                    const data = await api(`/api/public-requests?limit=${Math.min(Number(count) || 500, 500)}`);
                    return {data, error: null};
                  } catch (error) {
                    return {data: null, error};
                  }
                }
              };
            }
          };
        }
      };
    },
    channel() {
      let eventSource;
      let onChange;
      return {
        on(_event, _filter, callback) { onChange = callback; return this; },
        subscribe(onStatus) {
          eventSource = new EventSource("/api/events");
          eventSource.onopen = () => { onStatus?.("SUBSCRIBED"); onChange?.(); };
          eventSource.onmessage = () => onChange?.();
          return this;
        },
        close() { eventSource?.close(); }
      };
    },
    removeChannel(channel) { channel?.close(); }
  };
}
