const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  if (!username) {
    return "Username is required.";
  }

  if (!USERNAME_PATTERN.test(username)) {
    return "Username must be 3-20 characters and use only lowercase letters, numbers, or underscores.";
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export function validateDisplayName(displayName: string): string | null {
  if (!displayName) {
    return null;
  }

  if (displayName.length > 40) {
    return "Display name must be 40 characters or fewer.";
  }

  return null;
}
