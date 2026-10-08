export const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com',
  'icloud.com', 'live.com', 'aol.com', 'protonmail.com',
];

export const isAllowedEmailDomain = (email: string): boolean => {
  const at = email.lastIndexOf('@');
  if (at === -1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
};

export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export const checkPasswordRequirements = (password: string): PasswordRequirements => ({
  minLength: password.length >= 8,
  hasUppercase: /[A-Z]/.test(password),
  hasLowercase: /[a-z]/.test(password),
  hasNumber: /\d/.test(password),
  hasSpecialChar: /[^a-zA-Z0-9]/.test(password),
});

export const isPasswordValid = (password: string): boolean => {
  const req = checkPasswordRequirements(password);
  return req.minLength && req.hasUppercase && req.hasLowercase && req.hasNumber && req.hasSpecialChar;
};