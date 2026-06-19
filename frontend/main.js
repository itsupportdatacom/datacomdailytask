"use strict";

const SESSION_KEY = "datacomDailySchedule.session";
const DELETED_USERNAMES_KEY = "datacomDailySchedule.deletedUsernames";
const API_BASE_URL = window.DATACOM_API_BASE_URL || "https://desktop-19n0dfj.taildafd1a.ts.net:8444/api";

const elements = {
  formEyebrow: document.getElementById("formEyebrow"),
  formTitle: document.getElementById("formTitle"),
  formIntro: document.getElementById("formIntro"),
  loginForm: document.getElementById("loginForm"),
  signupForm: document.getElementById("signupForm"),
  username: document.getElementById("username"),
  password: document.getElementById("password"),
  passwordToggle: document.getElementById("passwordToggle"),
  toggleLabel: document.getElementById("toggleLabel"),
  signupUsername: document.getElementById("signupUsername"),
  signupPassword: document.getElementById("signupPassword"),
  confirmPassword: document.getElementById("confirmPassword"),
  signupRole: document.getElementById("signupRole"),
  forgotLink: document.getElementById("forgotLink"),
  signupLink: document.getElementById("signupLink"),
  loginLink: document.getElementById("loginLink"),
  signupPrompt: document.getElementById("signupPrompt"),
  loginPrompt: document.getElementById("loginPrompt"),
  formMessage: document.getElementById("formMessage"),
  usernameError: document.getElementById("usernameError"),
  passwordError: document.getElementById("passwordError"),
  signupUsernameError: document.getElementById("signupUsernameError"),
  signupPasswordError: document.getElementById("signupPasswordError"),
  confirmPasswordError: document.getElementById("confirmPasswordError"),
  signupRoleError: document.getElementById("signupRoleError")
};

initialize();

function initialize() {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.signupForm.addEventListener("submit", handleSignup);
  elements.passwordToggle.addEventListener("click", togglePassword);
  elements.forgotLink.addEventListener("click", showUnavailableNotice);
  elements.signupLink.addEventListener("click", (event) => {
    event.preventDefault();
    showSignupForm();
  });
  elements.loginLink.addEventListener("click", (event) => {
    event.preventDefault();
    showLoginForm();
  });

  [elements.username, elements.password].forEach((input) => bindClearError(input));
  [elements.signupUsername, elements.signupPassword, elements.confirmPassword, elements.signupRole]
    .forEach((input) => bindClearError(input));
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || "Unable to complete the request.");
  }
  return body;
}

async function handleLogin(event) {
  event.preventDefault();
  clearMessage();

  const validUsername = validateRequired(elements.username, elements.usernameError, "Please enter your username.");
  const validPassword = validateRequired(elements.password, elements.passwordError, "Please enter your password.");
  if (!validUsername || !validPassword) {
    return;
  }

  try {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: elements.username.value.trim(),
        password: elements.password.value
      })
    });
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      token: result.token,
      ...result.user
    }));
    window.location.href = "dashboard.html";
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  clearMessage();

  const validUsername = validateRequired(
    elements.signupUsername,
    elements.signupUsernameError,
    "Please enter a username."
  );
  const validPassword = validateRequired(
    elements.signupPassword,
    elements.signupPasswordError,
    "Please create a password."
  );
  const validConfirm = validateRequired(
    elements.confirmPassword,
    elements.confirmPasswordError,
    "Please confirm your password."
  );
  const validRole = validateRequired(
    elements.signupRole,
    elements.signupRoleError,
    "Please select your role."
  );
  if (!validUsername || !validPassword || !validConfirm || !validRole) {
    return;
  }
  if (elements.signupPassword.value !== elements.confirmPassword.value) {
    setError(elements.confirmPassword, elements.confirmPasswordError, "Passwords do not match.");
    return;
  }
  const username = elements.signupUsername.value.trim();
  try {
    await apiRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        username,
        password: elements.signupPassword.value,
        role: elements.signupRole.value
      })
    });
    forgetDeletedUsername(username);
    elements.signupForm.reset();
    showLoginForm(false);
    showMessage("Account created. Your account is pending Admin approval before login.", true);
  } catch (error) {
    setError(elements.signupUsername, elements.signupUsernameError, error.message);
  }
}

function loadDeletedUsernames() {
  try {
    const deletedUsernames = JSON.parse(localStorage.getItem(DELETED_USERNAMES_KEY) || "[]");
    return Array.isArray(deletedUsernames) ? deletedUsernames : [];
  } catch (error) {
    return [];
  }
}

function forgetDeletedUsername(username) {
  const normalizedName = username.toLowerCase();
  const remainingNames = loadDeletedUsernames().filter((entry) => entry !== normalizedName);
  localStorage.setItem(DELETED_USERNAMES_KEY, JSON.stringify(remainingNames));
}

function showSignupForm() {
  clearMessage();
  elements.loginForm.classList.add("hidden");
  elements.signupForm.classList.remove("hidden");
  elements.signupPrompt.classList.add("hidden");
  elements.loginPrompt.classList.remove("hidden");
  elements.formEyebrow.textContent = "Account Registration";
  elements.formTitle.textContent = "Create Account";
  elements.formIntro.textContent = "Register for access. Admin approval is required before login.";
  elements.signupUsername.focus();
}

function showLoginForm(clearStatus = true) {
  if (clearStatus) {
    clearMessage();
  }
  elements.signupForm.classList.add("hidden");
  elements.loginForm.classList.remove("hidden");
  elements.loginPrompt.classList.add("hidden");
  elements.signupPrompt.classList.remove("hidden");
  elements.formEyebrow.textContent = "Secure Login";
  elements.formTitle.textContent = "Welcome Back";
  elements.formIntro.textContent = "Sign in to access the Daily Schedule System.";
}

function bindClearError(input) {
  input.addEventListener("input", () => clearFieldError(input));
  input.addEventListener("change", () => clearFieldError(input));
}

function validateRequired(input, errorElement, message) {
  const valid = input.value.trim() !== "";
  if (!valid) {
    setError(input, errorElement, message);
  } else {
    clearFieldError(input);
  }
  return valid;
}

function setError(input, errorElement, message) {
  input.closest(".field").classList.add("invalid");
  errorElement.textContent = message;
}

function clearFieldError(input) {
  const errorElement = document.getElementById(`${input.id}Error`);
  input.closest(".field").classList.remove("invalid");
  errorElement.textContent = "";
}

function togglePassword() {
  const isHidden = elements.password.type === "password";
  elements.password.type = isHidden ? "text" : "password";
  elements.toggleLabel.textContent = isHidden ? "Hide" : "Show";
  elements.passwordToggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
}

function showUnavailableNotice(event) {
  event.preventDefault();
  showMessage("Password recovery will be available when account services are connected.", true);
}

function showMessage(message, info) {
  elements.formMessage.textContent = message;
  elements.formMessage.classList.toggle("info", info);
  elements.formMessage.classList.add("visible");
}

function clearMessage() {
  elements.formMessage.textContent = "";
  elements.formMessage.classList.remove("visible", "info");
}

