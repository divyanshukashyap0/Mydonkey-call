let totalHttpBytesServed = 0;
let totalHttpRequestsServed = 0;

export function trackResponseBytes(bytes: number) {
  if (bytes > 0) {
    totalHttpBytesServed += bytes;
    totalHttpRequestsServed += 1;
  }
}

export function getBandwidthStats() {
  return {
    totalHttpBytesServed,
    totalHttpRequestsServed,
  };
}
