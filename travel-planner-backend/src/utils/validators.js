// Only Gmail addresses (proper email format, @gmail.com domain) are allowed to register/log in.
export const GMAIL_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@gmail\.com$/;

// At least 8 characters, with at least one lowercase letter, one uppercase
// letter, one digit, and one special character.
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const isValidGmailAddress = (email) =>
  typeof email === "string" && GMAIL_REGEX.test(email.trim().toLowerCase());

export const isValidPassword = (password) =>
  typeof password === "string" && PASSWORD_REGEX.test(password);

export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.";
