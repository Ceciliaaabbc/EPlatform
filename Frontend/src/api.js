// The real value always comes from an env file: .env.local for `npm run dev`
// (local backend), .env.production for `vite build` (the deployed backend
// on Render). This hardcoded fallback should basically never be hit — it's
// just a safe default (local backend) instead of silently pointing at some
// specific remote server if the env files are ever missing.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export function getToken() {
  return localStorage.getItem("token");
}

async function parseError(response) {
  const text = await response.text();
  return text || `Request failed with status ${response.status}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Render's free tier spins the backend down after ~15 min idle. The first
// request that wakes it back up can 502/503 (or the fetch can just fail to
// connect) for up to ~50s while the container boots. Retry a few times with
// backoff instead of surfacing that as "failed to fetch" to the user.
const WAKE_UP_RETRY_DELAYS_MS = [2000, 4000, 6000, 8000, 10000, 10000];

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  let body = options.body;

  if (body && !(body instanceof FormData) && typeof body !== "string") {
    body = JSON.stringify(body);
  }

  if (!(body instanceof FormData) && body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const isRetryable = !options.method || options.method === "GET";

  let response;
  let attempt = 0;

  while (true) {
    try {
      response = await fetch(API_BASE_URL + path, {
        ...options,
        body,
        headers,
      });
    } catch (networkError) {
      if (isRetryable && attempt < WAKE_UP_RETRY_DELAYS_MS.length) {
        await sleep(WAKE_UP_RETRY_DELAYS_MS[attempt]);
        attempt += 1;
        continue;
      }
      throw networkError;
    }

    const isColdStartStatus = response.status === 502 || response.status === 503;
    if (isColdStartStatus && isRetryable && attempt < WAKE_UP_RETRY_DELAYS_MS.length) {
      await sleep(WAKE_UP_RETRY_DELAYS_MS[attempt]);
      attempt += 1;
      continue;
    }

    break;
  }

  // 401 = your token is missing/invalid/expired -> force re-login.
  // 403 = you're authenticated but not allowed to do *this one thing* ->
  // just let the caller show an error, don't nuke the whole session over
  // a single forbidden/broken request.
  if (response.status === 401) {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  return response;
}

async function json(path, options = {}) {
  const response = await apiRequest(path, options);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function text(path, options = {}) {
  const response = await apiRequest(path, options);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.text();
}

export const apiClient = {
  get: (path) => json(path),
  post: (path, body) => json(path, { method: "POST", body }),
  put: (path, body) => json(path, { method: "PUT", body }),
  delete: (path) => text(path, { method: "DELETE" }),
  postText: (path, body) => text(path, { method: "POST", body }),
  putText: (path, body) => text(path, { method: "PUT", body }),
  postForm: (path, formData) => json(path, { method: "POST", body: formData }),
};

export default API_BASE_URL;
