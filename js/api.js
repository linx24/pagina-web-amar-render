
const AMAR_API_URL = "https://backend-bun-express.onrender.com";
const AMAR_TOKEN_KEY = "amar_access_token";

async function amarRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    auth = true
  } = options;

  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = sessionStorage.getItem(AMAR_TOKEN_KEY);

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${AMAR_API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el backend de A.M.A.R. Revisá la conexión."
    );
  }

  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "El servidor devolvió una respuesta inválida." };
    }
  }

  if (!response.ok) {
    if (auth && response.status === 401) {
      sessionStorage.removeItem(AMAR_TOKEN_KEY);
    }

    throw new Error(
      data.error || `Error del servidor (${response.status}).`
    );
  }

  return data;
}

window.AMARApi = {
  request: amarRequest,

  async register({ email, password, name }) {
    const result = await amarRequest("/api/auth/register", {
      method: "POST",
      body: { email, password, name },
      auth: false
    });

    sessionStorage.setItem(AMAR_TOKEN_KEY, result.token);
    return result;
  },

  async login({ email, password }) {
    const result = await amarRequest("/api/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false
    });

    sessionStorage.setItem(AMAR_TOKEN_KEY, result.token);
    return result;
  },

  async getMe() {
    return amarRequest("/api/auth/me");
  },

  logout() {
    sessionStorage.removeItem(AMAR_TOKEN_KEY);
  },

  getToken() {
    return sessionStorage.getItem(AMAR_TOKEN_KEY);
  }
};

