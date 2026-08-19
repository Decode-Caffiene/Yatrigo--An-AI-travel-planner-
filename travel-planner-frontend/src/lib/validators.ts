// Only Gmail addresses (proper email format, @gmail.com domain) are allowed to register/log in.
export const GMAIL_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@gmail\.com$/;

export const isValidGmailAddress = (email: string) =>
  GMAIL_REGEX.test(email.trim().toLowerCase());

export const GMAIL_ERROR_MESSAGE = "Please enter a valid Gmail address (e.g. name@gmail.com).";

// At least 8 characters, with at least one lowercase letter, one uppercase
// letter, one digit, and one special character.
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const isValidPassword = (password: string) => PASSWORD_REGEX.test(password);

export const PASSWORD_ERROR_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.";

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
};

export const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels: PasswordStrength["label"][] = [
    "Very weak",
    "Weak",
    "Fair",
    "Strong",
    "Very strong",
  ];

  return { score: clamped, label: labels[clamped] };
};
