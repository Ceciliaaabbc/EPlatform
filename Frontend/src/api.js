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

  const response = await fetch(API_BASE_URL + path, {
    ...options,
    body,
    headers,
  });

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
