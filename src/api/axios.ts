import axios from "axios";
import { logout } from "@/lib/auth";





// const api = axios.create({
//     baseURL: import.meta.env.VITE_API_URL,
//     headers: {
//         "Content-Type": "application/json",
//     },
// });

// export default api;


export const API_URL: string =
  ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "") ||
  "http://localhost:8000/api";

export const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor to inject JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("khal.admin.token") : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and automatic logout on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Automatic logout on unauthorized
      if (typeof window !== "undefined") {
        await logout();
      }
    }
    
    // Format error message to match the old api wrapper behavior
    let msg = "Network Error";
    if (error.response) {
      msg = `${error.response.status} ${error.response.statusText}`;
      if (error.response.data) {
        if (typeof error.response.data === "string") {
          msg += ` — ${error.response.data}`;
        } else {
          msg += ` — ${JSON.stringify(error.response.data)}`;
        }
      }
    } else if (error.message) {
      msg = error.message;
    }
    return Promise.reject(new Error(msg));
  }
);

/**
 * Fetch wrapper similar to the old one but using axios under the hood.
 * Helps with gradual migration without breaking existing types immediately.
 */
type ApiFetchOptions = {
  method?: string;
  params?: Record<string, string | number | undefined | null>;
  headers?: Record<string, string>;
  body?: BodyInit | Record<string, unknown> | null;
};

export async function apiFetch<T = unknown>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const { params, headers, body, method = "GET" } = opts;

  // Determine the data to send:
  // - FormData: pass as-is, Axios sets boundary automatically
  // - string (JSON): parse it
  // - object: pass as-is (Axios serializes to JSON)
  let data: unknown = undefined;
  if (body instanceof FormData) {
    data = body; // Axios handles multipart/form-data + boundary automatically
  } else if (typeof body === "string") {
    try { data = JSON.parse(body); } catch { data = body; }
  } else {
    data = body ?? undefined;
  }
  
  const response = await axiosInstance.request<T>({
    url: path,
    method,
    params,
    headers,
    data,
  });
  
  return response.data;
}
