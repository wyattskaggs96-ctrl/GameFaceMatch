import type { StandardFaceProfile } from "@/types/domain";
import { deserializeProfile, serializeProfile } from "@/lib/profile/standard-face-profile";

export const SAVED_PROFILE_STORAGE_KEY = "gameface-match:saved-derived-profiles";
export const SAVED_PROFILE_STORAGE_VERSION = "saved-standard-face-profile-v1";

export type SavedProfileEncryptionStatus = "encrypted" | "unavailable";

export interface SavedProfileSummary {
  profileID: string;
  profileVersion: string;
  profileContractVersion: string;
  savedAt: string;
  encryptionStatus: SavedProfileEncryptionStatus;
}

export interface SavedProfileStorageStatus {
  storageLocation: "browser-session-storage" | "memory";
  encryptionAvailable: boolean;
  encryptionDescription: string;
  storedProfileCount: number;
  unreadableProfileCount: number;
  lastError: string | null;
}

export interface SaveProfileResult {
  ok: boolean;
  summary: SavedProfileSummary | null;
  error: string | null;
}

export interface SavedProfileStorage {
  saveProfile(profile: StandardFaceProfile, now?: Date): Promise<SaveProfileResult>;
  listProfileSummaries(): SavedProfileSummary[];
  loadProfile(profileID: string): Promise<{ profile: StandardFaceProfile | null; error: string | null }>;
  deleteProfile(profileID: string): boolean;
  deleteAllProfiles(): void;
  getStatus(): SavedProfileStorageStatus;
}

interface StoredProfileEnvelope extends SavedProfileSummary {
  schemaVersion: typeof SAVED_PROFILE_STORAGE_VERSION;
  payload: string;
  iv: string | null;
}

export function createMemorySavedProfileStorage(): SavedProfileStorage {
  const profiles = new Map<string, StandardFaceProfile>();
  const savedAtByID = new Map<string, string>();
  return {
    async saveProfile(profile, now = new Date()) {
      try {
        const serialized = serializeProfile(profile);
        const sanitized = deserializeProfile(serialized);
        profiles.set(profile.id, sanitized);
        savedAtByID.set(profile.id, now.toISOString());
        return {
          ok: true,
          summary: createSummary(sanitized, savedAtByID.get(profile.id) ?? now.toISOString(), "unavailable"),
          error: null
        };
      } catch (error) {
        return { ok: false, summary: null, error: errorMessage(error) };
      }
    },
    listProfileSummaries() {
      return Array.from(profiles.values()).map((profile) => createSummary(profile, savedAtByID.get(profile.id) ?? profile.createdAt, "unavailable"));
    },
    async loadProfile(profileID) {
      return { profile: profiles.get(profileID) ?? null, error: null };
    },
    deleteProfile(profileID) {
      savedAtByID.delete(profileID);
      return profiles.delete(profileID);
    },
    deleteAllProfiles() {
      profiles.clear();
      savedAtByID.clear();
    },
    getStatus() {
      return {
        storageLocation: "memory",
        encryptionAvailable: false,
        encryptionDescription: "Saved profiles are held in memory only in this environment.",
        storedProfileCount: profiles.size,
        unreadableProfileCount: 0,
        lastError: null
      };
    }
  };
}

export function createBrowserSavedProfileStorage(storage: Storage, cryptoProvider: Crypto | null = globalThis.crypto): SavedProfileStorage {
  let sessionKeyPromise: Promise<CryptoKey> | null = null;
  let lastError: string | null = null;

  function encryptionAvailable() {
    return Boolean(cryptoProvider?.subtle && cryptoProvider.getRandomValues);
  }

  async function getSessionKey() {
    if (!cryptoProvider?.subtle) throw new Error("WebCrypto encryption is unavailable.");
    sessionKeyPromise ??= cryptoProvider.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    return sessionKeyPromise;
  }

  function readEnvelopes() {
    const raw = storage.getItem(SAVED_PROFILE_STORAGE_KEY);
    if (!raw) return [] as StoredProfileEnvelope[];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("Saved profile storage is not an array.");
      return parsed.filter(isEnvelope);
    } catch (error) {
      lastError = `Saved profile storage could not be read: ${errorMessage(error)}`;
      return [];
    }
  }

  function writeEnvelopes(envelopes: StoredProfileEnvelope[]) {
    storage.setItem(SAVED_PROFILE_STORAGE_KEY, JSON.stringify(envelopes));
  }

  return {
    async saveProfile(profile, now = new Date()) {
      try {
        const serialized = serializeProfile(profile);
        const savedAt = now.toISOString();
        const encryptionStatus: SavedProfileEncryptionStatus = encryptionAvailable() ? "encrypted" : "unavailable";
        let payload = serialized;
        let iv: string | null = null;
        if (encryptionStatus === "encrypted" && cryptoProvider) {
          const ivBytes = cryptoProvider.getRandomValues(new Uint8Array(12));
          const encrypted = await cryptoProvider.subtle.encrypt({ name: "AES-GCM", iv: ivBytes }, await getSessionKey(), new TextEncoder().encode(serialized));
          payload = bytesToBase64(new Uint8Array(encrypted));
          iv = bytesToBase64(ivBytes);
        }
        const envelope: StoredProfileEnvelope = {
          ...createSummary(profile, savedAt, encryptionStatus),
          schemaVersion: SAVED_PROFILE_STORAGE_VERSION,
          payload,
          iv
        };
        writeEnvelopes([...readEnvelopes().filter((item) => item.profileID !== profile.id), envelope]);
        lastError = null;
        return { ok: true, summary: envelope, error: null };
      } catch (error) {
        lastError = errorMessage(error);
        return { ok: false, summary: null, error: lastError };
      }
    },
    listProfileSummaries() {
      return readEnvelopes().map(({ payload: _payload, iv: _iv, schemaVersion: _schemaVersion, ...summary }) => summary);
    },
    async loadProfile(profileID) {
      const envelope = readEnvelopes().find((item) => item.profileID === profileID);
      if (!envelope) return { profile: null, error: null };
      try {
        let serialized = envelope.payload;
        if (envelope.encryptionStatus === "encrypted") {
          if (!envelope.iv) throw new Error("Encrypted profile is missing its initialization vector.");
          if (!cryptoProvider?.subtle) throw new Error("WebCrypto is unavailable for this saved profile.");
          const decrypted = await cryptoProvider.subtle.decrypt(
            { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
            await getSessionKey(),
            base64ToBytes(envelope.payload)
          );
          serialized = new TextDecoder().decode(decrypted);
        }
        return { profile: deserializeProfile(serialized), error: null };
      } catch (error) {
        lastError = `Saved profile '${profileID}' could not be opened. Delete it and recreate the profile if needed.`;
        return { profile: null, error: `${lastError} ${errorMessage(error)}` };
      }
    },
    deleteProfile(profileID) {
      const before = readEnvelopes();
      const after = before.filter((item) => item.profileID !== profileID);
      writeEnvelopes(after);
      return after.length !== before.length;
    },
    deleteAllProfiles() {
      storage.removeItem(SAVED_PROFILE_STORAGE_KEY);
    },
    getStatus() {
      const raw = storage.getItem(SAVED_PROFILE_STORAGE_KEY);
      let unreadableProfileCount = 0;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          unreadableProfileCount = Array.isArray(parsed) ? parsed.filter((item) => !isEnvelope(item)).length : 1;
        } catch {
          unreadableProfileCount = 1;
        }
      }
      return {
        storageLocation: "browser-session-storage",
        encryptionAvailable: encryptionAvailable(),
        encryptionDescription: encryptionAvailable()
          ? "Saved profile payloads are encrypted with a session WebCrypto AES-GCM key before browser sessionStorage writes."
          : "WebCrypto is unavailable, so saved profiles use a session-only unencrypted fallback and can be deleted at any time.",
        storedProfileCount: readEnvelopes().length,
        unreadableProfileCount,
        lastError
      };
    }
  };
}

function createSummary(profile: StandardFaceProfile, savedAt: string, encryptionStatus: SavedProfileEncryptionStatus): SavedProfileSummary {
  return {
    profileID: profile.id,
    profileVersion: profile.profileVersion,
    profileContractVersion: profile.profileContractVersion,
    savedAt,
    encryptionStatus
  };
}

function isEnvelope(value: unknown): value is StoredProfileEnvelope {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<StoredProfileEnvelope>;
  return (
    record.schemaVersion === SAVED_PROFILE_STORAGE_VERSION &&
    typeof record.profileID === "string" &&
    typeof record.profileVersion === "string" &&
    typeof record.profileContractVersion === "string" &&
    typeof record.savedAt === "string" &&
    (record.encryptionStatus === "encrypted" || record.encryptionStatus === "unavailable") &&
    typeof record.payload === "string" &&
    (typeof record.iv === "string" || record.iv === null)
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown storage error.";
}
