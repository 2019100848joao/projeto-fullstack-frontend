import { createContext, useContext, useEffect, useRef, useState } from "react";
import { login, getCurrentUser } from "../services/api.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "clinic_access_token";
const apiBase = () =>
  (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

function documentRequestError(status) {
  const messages = {
    401: "Sua sessão expirou. Entre novamente para cadastrar o documento.",
    403: "Sua conta está inativa e não pode cadastrar documentos.",
    404: "O tipo de documento selecionado não está cadastrado na clínica.",
    409: "Já existe um documento cadastrado para um desses tipos.",
    422: "Confira os documentos informados e tente novamente.",
  };
  const error = new Error(
    messages[status] || "Não foi possível salvar o documento. Tente novamente.",
  );
  error.status = status;
  return error;
}

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // The current session still works when browser storage is unavailable.
  }
}

function removeStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // The in-memory session is cleared even when browser storage is unavailable.
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [storedToken, setStoredToken] = useState(getStoredToken);
  const [restoreStatus, setRestoreStatus] = useState(
    storedToken ? "restoring" : "ready",
  );
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const restoreGeneration = useRef(0);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== TOKEN_KEY && event.key !== null) return;

      const nextToken = event.key === null ? getStoredToken() : event.newValue;
      restoreGeneration.current += 1;
      setSession(null);
      setStoredToken(nextToken);
      setRestoreStatus(nextToken ? "restoring" : "ready");
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!storedToken) return;

    let active = true;
    const generation = ++restoreGeneration.current;
    getCurrentUser(storedToken)
      .then((user) => {
        if (!active || generation !== restoreGeneration.current) return;
        setSession({ token: storedToken, user });
        setRestoreStatus("ready");
      })
      .catch((error) => {
        if (!active || generation !== restoreGeneration.current) return;
        if (error.status === 401 || error.status === 403) {
          removeStoredToken();
          setStoredToken(null);
          setRestoreStatus("ready");
        } else {
          setRestoreStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, [storedToken, restoreAttempt]);

  async function signIn(email, password) {
    const generation = restoreGeneration.current;
    const { access_token: token } = await login(email, password);
    const user = await getCurrentUser(token);
    if (generation !== restoreGeneration.current) {
      throw new Error("A sessão mudou em outra aba. Tente novamente.");
    }
    storeToken(token);
    setSession({ token, user });
  }

  function logout() {
    restoreGeneration.current += 1;
    removeStoredToken();
    setStoredToken(null);
    setSession(null);
    setRestoreStatus("ready");
  }

  function retryRestore() {
    setRestoreStatus("restoring");
    setRestoreAttempt((attempt) => attempt + 1);
  }

  async function registerDocument(documents) {
    if (!session) throw documentRequestError(401);
    const requested = Array.isArray(documents) ? documents : [documents];
    if (!requested.length) throw documentRequestError(422);

    let typesResponse;
    try {
      typesResponse = await fetch(`${apiBase()}/document-types`);
    } catch {
      throw new Error("Não foi possível carregar os tipos de documento.");
    }
    if (!typesResponse.ok) throw documentRequestError(typesResponse.status);
    const availableTypes = await typesResponse.json();
    if (!Array.isArray(availableTypes)) throw documentRequestError(422);

    const seenTypes = new Set();
    const payload = requested.map(({ type, value }) => {
      const normalizedType = String(type || "")
        .trim()
        .toLocaleUpperCase("pt-BR");
      if (
        !normalizedType ||
        seenTypes.has(normalizedType) ||
        !String(value || "").trim()
      ) {
        throw documentRequestError(422);
      }
      seenTypes.add(normalizedType);
      const documentType = availableTypes.find(
        (entry) =>
          String(entry.type || "")
            .trim()
            .toLocaleUpperCase("pt-BR") === normalizedType,
      );
      if (!documentType) throw documentRequestError(404);
      return { type_id: documentType.id, value: String(value).trim() };
    });

    let response;
    try {
      response = await fetch(`${apiBase()}/users/me/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error("Não foi possível conectar à clínica. Tente novamente.");
    }
    if (!response.ok) throw documentRequestError(response.status);
    const createdDocuments = await response.json();
    if (!Array.isArray(createdDocuments)) throw documentRequestError(422);

    setSession((current) => {
      if (!current || current.token !== session.token) return current;
      const existingIds = new Set(
        (current.user.documents || []).map((doc) => doc.id),
      );
      return {
        ...current,
        user: {
          ...current.user,
          documents: [
            ...(current.user.documents || []),
            ...createdDocuments.filter((doc) => !existingIds.has(doc.id)),
          ],
        },
      };
    });
    return createdDocuments;
  }
  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        signIn,
        logout,
        restoreStatus,
        retryRestore,
        registerDocument,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// The context provider and its consumer hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
