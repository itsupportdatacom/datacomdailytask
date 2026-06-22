"use strict";

const SESSION_KEY = "datacomDailySchedule.session";
const USER_STORAGE_KEY = "datacomDailySchedule.users";
const APP_DATA_KEY = "datacomDailySchedule.appData";
const LEGACY_APP_DATA_KEY = `datacomDailySchedule.${"m"}${"ockDatabase"}`;
const DELETED_USERNAMES_KEY = "datacomDailySchedule.deletedUsernames";
const API_BASE_URL = window.DATACOM_API_BASE_URL || "https://desktop-19n0dfj.taildafd1a.ts.net:8444/api";
const AUTO_REFRESH_INTERVAL_MS = 10000;

const roleMenus = {
  Sales: [
    { label: "Dashboard", icon: "\u25a6", section: "dashboard" },
    { label: "Add Schedule", icon: "+", section: "addSchedule" },
    { label: "My Schedule", icon: "\ud83d\udcc5", section: "dailySchedule" }
  ],
  Warehouse: [
    { label: "Dashboard", icon: "\u25a6", section: "dashboard" },
    { label: "Add Schedule", icon: "+", section: "addSchedule" },
    { label: "Daily Schedule", icon: "\ud83d\udcc5", section: "dailySchedule" },
    { label: "Auto Mail", icon: "\u2709", section: "autoMail" },
    { label: "Reports", icon: "\ud83d\udcca", section: "dailySchedule" },
    { label: "Update Status", icon: "\u2713", section: "dailySchedule" }
  ],
  Management: [
    { label: "Dashboard", icon: "\u25a6", section: "dashboard" },
    { label: "Daily Schedule", icon: "\ud83d\udcc5", section: "dailySchedule" },
    { label: "Reports", icon: "\ud83d\udcca", section: "dailySchedule" }
  ],
  Admin: [
    { label: "Dashboard", icon: "\u25a6", section: "dashboard" },
    { label: "User Management", icon: "\ud83d\udc65", section: "userManagement" },
    { label: "Role Settings", icon: "\ud83d\udd11", section: "roleSettings" },
    { label: "System Settings", icon: "\u2699", section: "systemSettings" },
    { label: "Auto Mail", icon: "\u2709", section: "autoMail" },
    { label: "Daily Schedule", icon: "\ud83d\udcc5", section: "dailySchedule" }
  ]
};

const rolePermissions = [
  {
    role: "Sales",
    viewOwnReport: true,
    viewAllReports: false,
    scheduleArrangement: false,
    updateStatus: false,
    userManagement: false,
    systemSettings: false,
    additional: "Dashboard Access, Add Schedule"
  },
  {
    role: "Warehouse",
    viewOwnReport: true,
    viewAllReports: true,
    scheduleArrangement: true,
    updateStatus: true,
    userManagement: false,
    systemSettings: false,
    additional: "Dashboard Access, Add Schedule, View Daily Schedule, Edit Schedule"
  },
  {
    role: "Management",
    viewOwnReport: true,
    viewAllReports: true,
    scheduleArrangement: false,
    updateStatus: false,
    userManagement: false,
    systemSettings: false,
    additional: "Dashboard Access, View Daily Schedule, View Summary"
  },
  {
    role: "Admin",
    viewOwnReport: true,
    viewAllReports: true,
    scheduleArrangement: true,
    updateStatus: true,
    userManagement: true,
    systemSettings: true,
    additional: "Full access to all features"
  }
];

const editablePermissionFields = [
  { key: "viewOwnReport", label: "View Own Report" },
  { key: "viewAllReports", label: "View All Reports" },
  { key: "scheduleArrangement", label: "Schedule Arrangement" },
  { key: "updateStatus", label: "Update Status" },
  { key: "userManagement", label: "User Management" },
  { key: "systemSettings", label: "System Settings" }
];

const overridePermissionOptions = [
  "View Team Report",
  "Edit Own Schedule",
  "Export Reports",
  "Schedule Arrangement"
];

let userOverrides = [];

const defaultScheduleTypes = [
  "Delivery",
  "Customer Self-Collection",
  "Collection at Vendor Place",
  "Engineer Onsite",
  "Technician Onsite",
  "Engineer Remote",
  "Delivery + Technician Onsite",
  "Delivery + Engineer Onsite",
  "Delivery + All Involved",
  "Site Survey",
  "Lazada Dropoff",
  "Shopee Dropoff"
];
const defaultScheduleStatuses = ["Submitted", "Pending", "Ready to Ship", "In Progress", "Completed", "Carried Forward", "Cancelled"];
const statusDescriptions = {
  Submitted: "Sales submitted the schedule request and Warehouse needs to review it.",
  Pending: "Waiting for arrangement, customer confirmation, vendor update, or TBA schedule details.",
  "Ready to Ship": "Warehouse has arranged the next action and goods are ready for dispatch.",
  "In Progress": "The job is currently being handled.",
  Completed: "The job has been completed.",
  "Carried Forward": "The job has been moved forward to another date.",
  Cancelled: "The job has been cancelled."
};
const anytimeRequestedTime = "Anytime (10am - 5pm)";
const tbaValue = "TBA";
const requestedTimeOptions = [
  anytimeRequestedTime,
  tbaValue,
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00"
];
const referenceNumberPattern = /\b(?:PS|PR|PO)-[A-Z0-9-]+\b/i;
let scheduleTypes = [...defaultScheduleTypes];
let scheduleStatuses = [...defaultScheduleStatuses];
const assignedRoleOptions = ["Driver", "Technician", "Engineer", "All Team"];
const assignedPersonOptions = ["Liang", "Chojen", "Karthik", "Bala", "Devi", "Funz", "Ivor"];
const priorityOptions = ["Normal", "Urgent", "Critical"];
const onsiteServiceTypes = [
  "Engineer Onsite",
  "Technician Onsite",
  "Engineer Remote",
  "Delivery + Technician Onsite",
  "Delivery + Engineer Onsite",
  "Delivery + All Involved",
  "Site Survey"
];
const fieldSyncStatuses = [
  "Not Sent",
  "Sent to Field Platform",
  "Accepted",
  "In Progress",
  "Completed",
  "Issue Reported",
  "Carried Forward"
];
const defaultAutoMailSettings = {
  enabled: true,
  recipientEmail: "itsupportdatacom@gmail.com",
  ccEmail: "",
  sendTime: "17:30",
  timezone: "Asia/Singapore",
  weekdaysOnly: false,
  includeTbaSchedules: false,
  emailSubject: "Datacom Daily Schedule Report",
  lastStatus: "Ready for backend scheduler",
  lastSentAt: ""
};
let autoMailSettings = { ...defaultAutoMailSettings };

const assignmentDirectory = {
  Driver: assignedPersonOptions,
  Technician: assignedPersonOptions,
  Engineer: assignedPersonOptions,
  "All Team": assignedPersonOptions
};

// Future backend audit fields: Created By, Created Role, Created Date/Time,
// Last Updated By, and Last Updated Date/Time.
// Backend later must connect Daily Schedule System with Field Job Platform
// using a shared database or API for assignment delivery and status synchronization.
const scheduleRecords = [];

const defaultUsers = [];
let dummyUsers = loadUsers();

let notifications = [];

const defaultTestingChecklist = [];
let testingChecklist = defaultTestingChecklist.map((test) => ({ ...test }));

const defaultAppData = {
  users: defaultUsers.map((user) => ({ ...user })),
  schedules: scheduleRecords.map((schedule) => ({ ...schedule })),
  notifications: notifications.map((notification) => ({ ...notification })),
  activityLogs: [],
  rolePermissions: rolePermissions.map((permission) => ({ ...permission })),
  userOverrides: userOverrides.map((override) => ({ ...override, permissions: [...override.permissions] })),
  testingChecklist: testingChecklist.map((test) => ({ ...test })),
  settings: {
    scheduleTypes: [...scheduleTypes],
    scheduleStatuses: [...scheduleStatuses],
    autoMail: { ...autoMailSettings }
  },
  uiState: {
    selectedDate: localDateString(new Date()),
    previewFilter: "all",
    scheduleQuickFilter: "",
    scheduleView: "table",
    filters: {
      search: "",
      type: "",
      status: "",
      assignedRole: "",
      inputBy: "",
      sort: "time-asc"
    }
  }
};

let activityLogs = [];
let uiState = {};
loadAppData();

const elements = {
  schedulePageHeading: document.getElementById("schedulePageHeading"),
  dashboardTitle: document.getElementById("dashboardTitle"),
  dashboardSubtitle: document.getElementById("dashboardSubtitle"),
  clearLaunchDataHeaderButton: document.getElementById("clearLaunchDataHeaderButton"),
  dateSelector: document.querySelector(".date-selector"),
  profileName: document.getElementById("profileName"),
  profileRole: document.getElementById("profileRole"),
  avatar: document.querySelector(".avatar"),
  notificationButton: document.getElementById("notificationButton"),
  notificationCenter: document.querySelector(".notification-center"),
  notificationCount: document.getElementById("notificationCount"),
  notificationPanel: document.getElementById("notificationPanel"),
  notificationList: document.getElementById("notificationList"),
  emptyNotifications: document.getElementById("emptyNotifications"),
  clearNotifications: document.getElementById("clearNotifications"),
  markAllNotificationsRead: document.getElementById("markAllNotificationsRead"),
  recentUpdatesPanel: document.querySelector(".recent-updates-panel"),
  recentUpdatesList: document.getElementById("recentUpdatesList"),
  emptyRecentUpdates: document.getElementById("emptyRecentUpdates"),
  viewAllUpdates: document.getElementById("viewAllUpdates"),
  markAllUpdatesRead: document.getElementById("markAllUpdatesRead"),
  accountMenuButton: document.getElementById("accountMenuButton"),
  accountDropdown: document.getElementById("accountDropdown"),
  myProfileAction: document.getElementById("myProfileAction"),
  changePasswordAction: document.getElementById("changePasswordAction"),
  accountLogoutLink: document.getElementById("accountLogoutLink"),
  sidebarNav: document.getElementById("sidebarNav"),
  logoutLink: document.getElementById("logoutLink"),
  dashboardSection: document.getElementById("dashboardSection"),
  selectedDateLabel: document.getElementById("selectedDateLabel"),
  dashboardLastUpdated: document.getElementById("dashboardLastUpdated"),
  scheduleDate: document.getElementById("scheduleDate"),
  previousDay: document.getElementById("previousDay"),
  nextDay: document.getElementById("nextDay"),
  selectTbaDate: document.getElementById("selectTbaDate"),
  totalScheduleCount: document.getElementById("totalScheduleCount"),
  deliveryCount: document.getElementById("deliveryCount"),
  selfCollectionCount: document.getElementById("selfCollectionCount"),
  vendorCollectionCount: document.getElementById("vendorCollectionCount"),
  technicalCount: document.getElementById("technicalCount"),
  submittedCount: document.getElementById("submittedCount"),
  pendingCount: document.getElementById("pendingCount"),
  readyToShipCount: document.getElementById("readyToShipCount"),
  inProgressCount: document.getElementById("inProgressCount"),
  completedCount: document.getElementById("completedCount"),
  carriedForwardCount: document.getElementById("carriedForwardCount"),
  metricCards: document.querySelector(".metrics"),
  currentFilterLabel: document.getElementById("currentFilterLabel"),
  clearPreviewFilter: document.getElementById("clearPreviewFilter"),
  previewRows: document.getElementById("previewRows"),
  emptyPreview: document.getElementById("emptyPreview"),
  scheduleRows: document.getElementById("scheduleRows"),
  dailyScheduleTable: document.getElementById("dailyScheduleTable"),
  emptySchedule: document.getElementById("emptySchedule"),
  scheduleHeading: document.getElementById("scheduleHeading"),
  scheduleLastUpdated: document.getElementById("scheduleLastUpdated"),
  scheduleSearch: document.getElementById("scheduleSearch"),
  scheduleTypeFilter: document.getElementById("scheduleTypeFilter"),
  scheduleStatusFilter: document.getElementById("scheduleStatusFilter"),
  assignedRoleFilter: document.getElementById("assignedRoleFilter"),
  inputByFilter: document.getElementById("inputByFilter"),
  scheduleSort: document.getElementById("scheduleSort"),
  scheduleQuickFilters: document.querySelectorAll("[data-schedule-quick]"),
  filteredScheduleCount: document.getElementById("filteredScheduleCount"),
  clearScheduleFilters: document.getElementById("clearScheduleFilters"),
  scheduleViewButtons: document.querySelectorAll("[data-schedule-view]"),
  dailyScheduleTimeline: document.getElementById("dailyScheduleTimeline"),
  timelineDateHeading: document.getElementById("timelineDateHeading"),
  timelineRows: document.getElementById("timelineRows"),
  emptyTimeline: document.getElementById("emptyTimeline"),
  printDailySchedule: document.getElementById("printDailySchedule"),
  exportScheduleCsv: document.getElementById("exportScheduleCsv"),
  exportSchedulePdf: document.getElementById("exportSchedulePdf"),
  printScheduleDate: document.getElementById("printScheduleDate"),
  printScheduleRows: document.getElementById("printScheduleRows"),
  dailySchedule: document.getElementById("dailySchedule"),
  addSchedule: document.getElementById("addSchedule"),
  addScheduleForm: document.getElementById("addScheduleForm"),
  addScheduleErrorSummary: document.getElementById("addScheduleErrorSummary"),
  newScheduleDate: document.getElementById("newScheduleDate"),
  newScheduleDateTba: document.getElementById("newScheduleDateTba"),
  newRequestedTime: document.getElementById("newRequestedTime"),
  newScheduleType: document.getElementById("newScheduleType"),
  typeShortcuts: document.querySelectorAll("[data-type-shortcut]"),
  newPsNo: document.getElementById("newPsNo"),
  psNumberOptions: document.getElementById("psNumberOptions"),
  newCompanyName: document.getElementById("newCompanyName"),
  newProducts: document.getElementById("newProducts"),
  newLocation: document.getElementById("newLocation"),
  newPic: document.getElementById("newPic"),
  newContactNumber: document.getElementById("newContactNumber"),
  newContactNumberNil: document.getElementById("newContactNumberNil"),
  newAssignedRole: document.getElementById("newAssignedRole"),
  newAssignedPerson: document.getElementById("newAssignedPerson"),
  newAssignedPersonButton: document.getElementById("newAssignedPersonButton"),
  newAssignedPersonPanel: document.getElementById("newAssignedPersonPanel"),
  newPriority: document.getElementById("newPriority"),
  newInputBy: document.getElementById("newInputBy"),
  newStatus: document.getElementById("newStatus"),
  newRemarks: document.getElementById("newRemarks"),
  clearAddScheduleForm: document.getElementById("clearAddScheduleForm"),
  userManagement: document.getElementById("userManagement"),
  roleSettings: document.getElementById("roleSettings"),
  systemSettings: document.getElementById("systemSettings"),
  autoMail: document.getElementById("autoMail"),
  autoMailForm: document.getElementById("autoMailForm"),
  autoMailEnabled: document.getElementById("autoMailEnabled"),
  autoMailRecipient: document.getElementById("autoMailRecipient"),
  autoMailCc: document.getElementById("autoMailCc"),
  autoMailSendTime: document.getElementById("autoMailSendTime"),
  autoMailTimezone: document.getElementById("autoMailTimezone"),
  autoMailWeekdays: document.getElementById("autoMailWeekdays"),
  autoMailIncludeTba: document.getElementById("autoMailIncludeTba"),
  autoMailSubject: document.getElementById("autoMailSubject"),
  autoMailPreviewDate: document.getElementById("autoMailPreviewDate"),
  autoMailPreviewCount: document.getElementById("autoMailPreviewCount"),
  autoMailLastStatus: document.getElementById("autoMailLastStatus"),
  autoMailLastSent: document.getElementById("autoMailLastSent"),
  autoMailCron: document.getElementById("autoMailCron"),
  autoMailPreviewRows: document.getElementById("autoMailPreviewRows"),
  saveAutoMailSettings: document.getElementById("saveAutoMailSettings"),
  testAutoMailButton: document.getElementById("testAutoMailButton"),
  testingChecklist: document.getElementById("testingChecklist"),
  testingChecklistRows: document.getElementById("testingChecklistRows"),
  userRows: document.getElementById("userRows"),
  permissionRows: document.getElementById("permissionRows"),
  roleEditor: document.getElementById("roleEditor"),
  roleEditorTitle: document.getElementById("roleEditorTitle"),
  rolePermissionForm: document.getElementById("rolePermissionForm"),
  editingRoleName: document.getElementById("editingRoleName"),
  rolePermissionOptions: document.getElementById("rolePermissionOptions"),
  cancelRoleEdit: document.getElementById("cancelRoleEdit"),
  overrideRows: document.getElementById("overrideRows"),
  overrideEditor: document.getElementById("overrideEditor"),
  overrideEditorTitle: document.getElementById("overrideEditorTitle"),
  overrideForm: document.getElementById("overrideForm"),
  editingOverrideId: document.getElementById("editingOverrideId"),
  overridePermissionOptions: document.getElementById("overridePermissionOptions"),
  cancelOverrideEdit: document.getElementById("cancelOverrideEdit"),
  companyProfileForm: document.getElementById("companyProfileForm"),
  scheduleTypeList: document.getElementById("scheduleTypeList"),
  addScheduleType: document.getElementById("addScheduleType"),
  statusSettingList: document.getElementById("statusSettingList"),
  addStatusSetting: document.getElementById("addStatusSetting"),
  workingHoursForm: document.getElementById("workingHoursForm"),
  exportDataButton: document.getElementById("exportDataButton"),
  auditLogButton: document.getElementById("auditLogButton"),
  scheduleDetailsModal: document.getElementById("scheduleDetailsModal"),
  detailsTitle: document.getElementById("detailsTitle"),
  detailDate: document.getElementById("detailDate"),
  detailTime: document.getElementById("detailTime"),
  detailType: document.getElementById("detailType"),
  detailPsNo: document.getElementById("detailPsNo"),
  detailCarriedForwardGroup: document.getElementById("detailCarriedForwardGroup"),
  detailCarriedForwardFrom: document.getElementById("detailCarriedForwardFrom"),
  detailStatus: document.getElementById("detailStatus"),
  detailProducts: document.getElementById("detailProducts"),
  detailCompany: document.getElementById("detailCompany"),
  detailLocation: document.getElementById("detailLocation"),
  detailPic: document.getElementById("detailPic"),
  detailContactNumber: document.getElementById("detailContactNumber"),
  detailAssignedRole: document.getElementById("detailAssignedRole"),
  detailAssignedPerson: document.getElementById("detailAssignedPerson"),
  detailPriority: document.getElementById("detailPriority"),
  detailInputBy: document.getElementById("detailInputBy"),
  detailRemarks: document.getElementById("detailRemarks"),
  detailCreated: document.getElementById("detailCreated"),
  detailUpdatedBy: document.getElementById("detailUpdatedBy"),
  detailUpdatedAt: document.getElementById("detailUpdatedAt"),
  sendToFieldPlatform: document.getElementById("sendToFieldPlatform"),
  editScheduleDetail: document.getElementById("editScheduleDetail"),
  updateScheduleStatus: document.getElementById("updateScheduleStatus"),
  carryForwardSchedule: document.getElementById("carryForwardSchedule"),
  printScheduleDetails: document.getElementById("printScheduleDetails"),
  closeScheduleDetails: document.getElementById("closeScheduleDetails"),
  closeDetailsIcon: document.getElementById("closeDetailsIcon"),
  scheduleEditPanel: document.getElementById("scheduleEditPanel"),
  scheduleEditForm: document.getElementById("scheduleEditForm"),
  editScheduleDate: document.getElementById("editScheduleDate"),
  editScheduleDateTba: document.getElementById("editScheduleDateTba"),
  editRequestedTime: document.getElementById("editRequestedTime"),
  editScheduleType: document.getElementById("editScheduleType"),
  editPsNo: document.getElementById("editPsNo"),
  editCompanyName: document.getElementById("editCompanyName"),
  editPic: document.getElementById("editPic"),
  editContactNumber: document.getElementById("editContactNumber"),
  editContactNumberNil: document.getElementById("editContactNumberNil"),
  editLocation: document.getElementById("editLocation"),
  editProducts: document.getElementById("editProducts"),
  editAssignedRole: document.getElementById("editAssignedRole"),
  editAssignedPerson: document.getElementById("editAssignedPerson"),
  editAssignedPersonButton: document.getElementById("editAssignedPersonButton"),
  editAssignedPersonPanel: document.getElementById("editAssignedPersonPanel"),
  editPriority: document.getElementById("editPriority"),
  editRemarks: document.getElementById("editRemarks"),
  cancelScheduleEdit: document.getElementById("cancelScheduleEdit"),
  statusUpdatePanel: document.getElementById("statusUpdatePanel"),
  statusUpdateForm: document.getElementById("statusUpdateForm"),
  newScheduleStatus: document.getElementById("newScheduleStatus"),
  statusRemarks: document.getElementById("statusRemarks"),
  cancelStatusUpdate: document.getElementById("cancelStatusUpdate"),
  carryForwardModal: document.getElementById("carryForwardModal"),
  carryForwardForm: document.getElementById("carryForwardForm"),
  carryForwardDate: document.getElementById("carryForwardDate"),
  carryForwardDateTba: document.getElementById("carryForwardDateTba"),
  carryForwardTime: document.getElementById("carryForwardTime"),
  carryForwardStatus: document.getElementById("carryForwardStatus"),
  carryForwardReason: document.getElementById("carryForwardReason"),
  carryForwardError: document.getElementById("carryForwardError"),
  cancelCarryForward: document.getElementById("cancelCarryForward"),
  closeCarryForwardIcon: document.getElementById("closeCarryForwardIcon"),
  resetPasswordModal: document.getElementById("resetPasswordModal"),
  resetPasswordForm: document.getElementById("resetPasswordForm"),
  resetPasswordUserId: document.getElementById("resetPasswordUserId"),
  resetPasswordUsername: document.getElementById("resetPasswordUsername"),
  newUserPassword: document.getElementById("newUserPassword"),
  confirmNewUserPassword: document.getElementById("confirmNewUserPassword"),
  newUserPasswordError: document.getElementById("newUserPasswordError"),
  confirmNewUserPasswordError: document.getElementById("confirmNewUserPasswordError"),
  cancelResetPassword: document.getElementById("cancelResetPassword"),
  closeResetPasswordIcon: document.getElementById("closeResetPasswordIcon"),
  changePasswordModal: document.getElementById("changePasswordModal"),
  changePasswordForm: document.getElementById("changePasswordForm"),
  currentUserPassword: document.getElementById("currentUserPassword"),
  changedUserPassword: document.getElementById("changedUserPassword"),
  confirmChangedUserPassword: document.getElementById("confirmChangedUserPassword"),
  currentUserPasswordError: document.getElementById("currentUserPasswordError"),
  changedUserPasswordError: document.getElementById("changedUserPasswordError"),
  confirmChangedUserPasswordError: document.getElementById("confirmChangedUserPasswordError"),
  cancelChangePassword: document.getElementById("cancelChangePassword"),
  closeChangePasswordIcon: document.getElementById("closeChangePasswordIcon"),
  deleteUserModal: document.getElementById("deleteUserModal"),
  deleteUserForm: document.getElementById("deleteUserForm"),
  deleteUserId: document.getElementById("deleteUserId"),
  deleteUsername: document.getElementById("deleteUsername"),
  cancelDeleteUser: document.getElementById("cancelDeleteUser"),
  closeDeleteUserIcon: document.getElementById("closeDeleteUserIcon"),
  editUserPanel: document.getElementById("editUserPanel"),
  editUserForm: document.getElementById("editUserForm"),
  editUserId: document.getElementById("editUserId"),
  editUsername: document.getElementById("editUsername"),
  editRole: document.getElementById("editRole"),
  cancelEditUser: document.getElementById("cancelEditUser"),
  addScheduleButton: document.getElementById("addScheduleButton"),
  menuToggle: document.getElementById("menuToggle"),
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  dashboardToast: document.getElementById("dashboardToast")
};

let toastTimer;
let session;
let currentSection = "dashboard";
let activeMenuLabel = "Dashboard";
let previewFilter = "all";
let selectedScheduleId = "";
let scheduleQuickFilter = "";
let scheduleView = "table";
let highlightedScheduleId = "";
let notificationHighlightTimer;
let autoRefreshTimer;
let autoRefreshInFlight = false;
let lastDataRefreshAt;

document.addEventListener("DOMContentLoaded", initializeDashboard);

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
      ...(options.headers || {})
    }
  });
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(body.errors) ? ` ${body.errors.join(" ")}` : "";
    throw new Error(`${body.message || "Unable to complete the request."}${details}`);
  }
  return body;
}

async function loadDatabaseData() {
  const scheduleData = await apiRequest("/schedules");
  scheduleRecords.splice(0, scheduleRecords.length, ...scheduleData.schedules.map(normalizeScheduleRecord));
  notifications = await loadNotificationData();
  lastDataRefreshAt = new Date();

  if (session.role === "Admin") {
    const [userData, permissionData] = await Promise.all([
      apiRequest("/users"),
      apiRequest("/role-permissions")
    ]);
    dummyUsers = userData.users;
    rolePermissions.splice(0, rolePermissions.length, ...permissionData.permissions);
  }
}

async function loadScheduleAndNotificationData() {
  const scheduleData = await apiRequest("/schedules");
  scheduleRecords.splice(0, scheduleRecords.length, ...scheduleData.schedules.map(normalizeScheduleRecord));
  notifications = await loadNotificationData();
  lastDataRefreshAt = new Date();
}

async function loadNotificationData() {
  try {
    const notificationData = await apiRequest("/notifications");
    return notificationData.notifications || [];
  } catch (error) {
    return [];
  }
}

function replaceSchedule(record) {
  record = normalizeScheduleRecord(record);
  const index = scheduleRecords.findIndex((entry) => entry.id === record.id);
  if (index === -1) {
    scheduleRecords.push(record);
  } else {
    scheduleRecords[index] = record;
  }
}

function getSelectedDateValue() {
  return uiState.selectedDate === tbaValue ? tbaValue : elements.scheduleDate.value;
}

function setDashboardDate(value) {
  if (value === tbaValue) {
    uiState.selectedDate = tbaValue;
    elements.scheduleDate.value = "";
    elements.selectTbaDate.classList.add("selected");
    elements.selectTbaDate.setAttribute("aria-pressed", "true");
    return;
  }
  uiState.selectedDate = value || localDateString(new Date());
  elements.scheduleDate.value = uiState.selectedDate;
  elements.selectTbaDate.classList.remove("selected");
  elements.selectTbaDate.setAttribute("aria-pressed", "false");
}

function setTbaDateControl(input, checkbox, useTba) {
  checkbox.checked = useTba;
  input.disabled = useTba;
  input.required = !useTba;
  if (useTba) {
    input.value = "";
  }
}

function setNilContactControl(input, checkbox, useNil, requiredWhenProvided = false) {
  checkbox.checked = useNil;
  input.disabled = useNil;
  input.required = requiredWhenProvided && !useNil;
  if (useNil) {
    input.value = "";
    input.classList.remove("invalid-field");
  }
}

async function initializeDashboard() {
  session = loadSession();
  if (!session) {
    window.location.href = "index.html";
    return;
  }
  try {
    await apiRequest("/session");
    await loadDatabaseData();
  } catch (error) {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
    return;
  }
  setDashboardDate(uiState.selectedDate || localDateString(new Date()));
  renderRoleDisplay();
  renderScheduleFilterOptions();
  restoreUiState();
  updateScheduleQuickButtons();
  renderMetrics();
  renderDashboardPreview();
  renderSchedule();
  renderDateHeading();
  renderUsers();
  renderPermissions();
  renderOverrides();
  renderSystemSettings();
  renderTestingChecklist();
  renderNotifications();
  updateLastUpdatedLabels();
  bindActions();
  startAutoRefresh();
  showUnreadUpdatesToast();
}

function updateLastUpdatedLabels() {
  const label = lastDataRefreshAt
    ? `Last updated: ${new Intl.DateTimeFormat("en-SG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).format(lastDataRefreshAt)}`
    : "Last updated: --:--:--";
  elements.dashboardLastUpdated.textContent = label;
  elements.scheduleLastUpdated.textContent = label;
}

function isAutoRefreshPaused() {
  const modalOpen = Boolean(document.querySelector(".modal-backdrop:not(.hidden)"));
  const editorOpen = [
    elements.editUserPanel,
    elements.roleEditor,
    elements.overrideEditor
  ].some((panel) => panel && !panel.classList.contains("hidden"));
  const activeForm = document.activeElement?.closest("form");
  return currentSection === "addSchedule" || modalOpen || editorOpen || Boolean(activeForm);
}

async function autoRefreshDashboardData() {
  if (autoRefreshInFlight || isAutoRefreshPaused()) {
    return;
  }
  autoRefreshInFlight = true;
  try {
    await loadScheduleAndNotificationData();
    renderScheduleFilterOptions();
    renderSelectedDate();
    renderNotifications();
    updateLastUpdatedLabels();
  } catch (error) {
    console.warn("Auto-refresh failed:", error.message);
  } finally {
    autoRefreshInFlight = false;
  }
}

function startAutoRefresh() {
  clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(autoRefreshDashboardData, AUTO_REFRESH_INTERVAL_MS);
}

function renderNotifications() {
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  elements.notificationCount.textContent = String(unreadCount);
  elements.notificationCount.classList.toggle("hidden", unreadCount === 0);
  elements.notificationButton.setAttribute(
    "aria-label",
    unreadCount ? `View notifications, ${unreadCount} unread` : "View notifications"
  );
  const fragment = document.createDocumentFragment();
  notifications.forEach((notification) => {
    const item = document.createElement("article");
    item.className = `notification-item clickable${notification.read ? "" : " unread"}`;
    item.dataset.notificationOpenId = notification.id;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Open notification: ${notification.title}`);
    const indicator = document.createElement("span");
    indicator.className = "notification-indicator";
    indicator.setAttribute("aria-hidden", "true");
    const body = document.createElement("div");
    body.className = "notification-body";
    const title = document.createElement("strong");
    title.textContent = notification.title;
    const message = document.createElement("p");
    message.textContent = notification.message;
    const meta = document.createElement("div");
    meta.className = "notification-meta";
    const time = document.createElement("time");
    time.textContent = notification.time;
    const state = document.createElement("span");
    state.className = "notification-state";
    state.textContent = notification.read ? "Read" : "Unread";
    meta.append(time, state);
    body.append(title, message, meta);
    item.append(indicator, body);
    if (!notification.read) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mark-read";
      button.dataset.notificationId = notification.id;
      button.textContent = "Mark as read";
      item.appendChild(button);
    }
    fragment.appendChild(item);
  });
  elements.notificationList.replaceChildren(fragment);
  elements.emptyNotifications.classList.toggle("hidden", notifications.length !== 0);
  elements.clearNotifications.disabled = notifications.length === 0;
  elements.markAllNotificationsRead.disabled = unreadCount === 0;
  elements.markAllUpdatesRead.disabled = unreadCount === 0;
  elements.recentUpdatesPanel.classList.add("hidden");
  renderRecentUpdates();
}

function getImportantUpdates() {
  const importantTitles = [
    "new schedule added",
    "status changed",
    "schedule status updated",
    "job carried forward",
    "user pending approval",
    "new user pending approval",
    "schedule edited",
    "field sync status changed",
    "field platform sync pending"
  ];
  return notifications.filter((notification) => (
    importantTitles.some((title) => notification.title.toLowerCase().includes(title))
  ));
}

function getUpdateReference(notification) {
  const text = `${notification.title} ${notification.message}`;
  return text.match(referenceNumberPattern)?.[0]
    || notification.message.match(/^([A-Za-z0-9._-]+)/)?.[0]
    || "-";
}

function getUpdateChangedBy(notification) {
  return notification.message.match(/Changed by ([^.]+)\.?/i)?.[1]?.trim()
    || (notification.title.toLowerCase().includes("pending approval") ? getUpdateReference(notification) : "System");
}

function renderRecentUpdates() {
  elements.recentUpdatesPanel.classList.add("hidden");
  elements.recentUpdatesList.replaceChildren();
  elements.emptyRecentUpdates.classList.add("hidden");
}

function toggleNotificationPanel() {
  const opening = elements.notificationPanel.classList.contains("hidden");
  elements.notificationPanel.classList.toggle("hidden", !opening);
  elements.notificationButton.setAttribute("aria-expanded", String(opening));
}

function closeNotificationPanel() {
  elements.notificationPanel.classList.add("hidden");
  elements.notificationButton.setAttribute("aria-expanded", "false");
}

function toggleAccountDropdown() {
  const opening = elements.accountDropdown.classList.contains("hidden");
  elements.accountDropdown.classList.toggle("hidden", !opening);
  elements.accountMenuButton.setAttribute("aria-expanded", String(opening));
  if (opening) {
    closeNotificationPanel();
  }
}

function closeAccountDropdown() {
  elements.accountDropdown.classList.add("hidden");
  elements.accountMenuButton.setAttribute("aria-expanded", "false");
}

async function handleNotificationAction(event) {
  const markReadButton = event.target.closest("[data-notification-id]");
  if (markReadButton) {
    const unreadNotification = notifications.find((entry) => entry.id === markReadButton.dataset.notificationId);
    if (unreadNotification) {
      await markNotificationRead(unreadNotification);
    }
    return;
  }
  const item = event.target.closest("[data-notification-open-id]");
  if (!item) {
    return;
  }
  const notification = notifications.find((entry) => entry.id === item.dataset.notificationOpenId);
  if (!notification) {
    return;
  }
  await markNotificationRead(notification);
  navigateFromNotification(notification);
}

function handleNotificationKeydown(event) {
  if (event.target.closest("[data-notification-id]")) {
    return;
  }
  const item = event.target.closest("[data-notification-open-id]");
  if (!item || !["Enter", " "].includes(event.key)) {
    return;
  }
  event.preventDefault();
  item.click();
}

async function markNotificationRead(notification) {
  if (notification.read) {
    return;
  }
  try {
    await apiRequest(`/notifications/${notification.id}/read`, { method: "PATCH" });
    notification.read = true;
    renderNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshNotifications() {
  try {
    const notificationData = await apiRequest("/notifications");
    notifications = notificationData.notifications;
    renderNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

async function markAllNotificationsRead() {
  const unreadUpdates = notifications.filter((notification) => !notification.read);
  if (!unreadUpdates.length) {
    return;
  }
  try {
    await apiRequest("/notifications/read-all", { method: "PATCH" });
    notifications = notifications.map((notification) => ({ ...notification, read: true }));
    renderNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

function showUnreadUpdatesToast() {
  const unreadImportantCount = getImportantUpdates().filter((notification) => !notification.read).length;
  if (unreadImportantCount > 0) {
    const updateLabel = unreadImportantCount === 1 ? "important update" : "important updates";
    showToast(`You have ${unreadImportantCount} unread ${updateLabel}.`);
  }
}

function findNotificationSchedule(notification) {
  const reference = `${notification.title} ${notification.message}`.match(referenceNumberPattern)?.[0];
  if (!reference) {
    return null;
  }
  return scheduleRecords
    .filter((entry) => entry.psNo.toLowerCase() === reference.toLowerCase())
    .sort((first, second) => second.date.localeCompare(first.date))[0] || null;
}

function openNotificationScheduleView(entry, statusFilter = "") {
  if (entry) {
    setDashboardDate(entry.date);
  }
  elements.scheduleSearch.value = "";
  elements.scheduleTypeFilter.value = "";
  elements.scheduleStatusFilter.value = statusFilter;
  elements.assignedRoleFilter.value = "";
  elements.inputByFilter.value = "";
  scheduleQuickFilter = statusFilter;
  updateScheduleQuickButtons();
  showSection("dailySchedule", session.role === "Sales" ? "My Schedule" : "Daily Schedule");
  renderSelectedDate();
  if (entry) {
    highlightNotificationSchedule(entry.id);
  }
}

function highlightNotificationSchedule(scheduleId) {
  clearTimeout(notificationHighlightTimer);
  highlightedScheduleId = scheduleId;
  renderDashboardPreview();
  renderSchedule();
  notificationHighlightTimer = setTimeout(() => {
    highlightedScheduleId = "";
    document.querySelectorAll(".notification-target").forEach((element) => {
      element.classList.remove("notification-target");
    });
  }, 3500);
}

function navigateFromNotification(notification) {
  const label = `${notification.title} ${notification.message}`.toLowerCase();
  const schedule = findNotificationSchedule(notification);
  closeNotificationPanel();

  if (label.includes("user") && label.includes("pending approval") && session.role === "Admin") {
    showSection("userManagement", "User Management");
    return;
  }
  if (label.includes("carried forward") || label.includes("continues on")) {
    openNotificationScheduleView(schedule);
    return;
  }
  if (label.includes("submitted schedule") || label.includes("requires action")) {
    openNotificationScheduleView(schedule, "Submitted");
    return;
  }
  if ((label.includes("field sync") || label.includes("field platform sync")) && schedule) {
    openNotificationScheduleView(schedule);
    openScheduleDetails(schedule.id);
    return;
  }
  if (schedule) {
    openNotificationScheduleView(schedule);
    openScheduleDetails(schedule.id);
  }
}

async function clearAllNotifications() {
  try {
    await apiRequest("/notifications", { method: "DELETE" });
    notifications = [];
    renderNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

async function handleRecentUpdateOpen(event) {
  const item = event.target.closest("[data-recent-update-id]");
  if (!item) {
    return;
  }
  const notification = notifications.find((entry) => entry.id === item.dataset.recentUpdateId);
  if (!notification) {
    return;
  }
  await markNotificationRead(notification);
  navigateFromNotification(notification);
}

function renderDateHeading() {
  const selectedDate = getSelectedDateValue();
  const label = selectedDate === tbaValue
    ? tbaValue
    : new Intl.DateTimeFormat("en-SG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(parseDate(selectedDate));
  elements.selectedDateLabel.textContent = label;
  const isSales = session.role === "Sales";
  const isScheduleView = currentSection === "dailySchedule";
  const isAddSchedule = currentSection === "addSchedule";
  elements.dateSelector.classList.toggle("hidden", isAddSchedule);
  if (isAddSchedule) {
    elements.dashboardTitle.textContent = "Add Schedule";
    elements.dashboardSubtitle.textContent = "Create a new office schedule job.";
    return;
  }
  elements.dashboardTitle.textContent = isScheduleView
    ? `${session.role === "Sales" ? "My Schedule" : "Daily Schedule"} - ${label}`
    : `${isSales ? "My Schedule Overview" : "Daily Operations Overview"} - ${label}`;
  elements.dashboardSubtitle.textContent = isSales
    ? `Showing schedules submitted by ${session.username} for ${label}.`
    : isScheduleView
      ? `Review scheduled activities for ${label}.`
      : `Monitor scheduled work and manage activities for ${label}.`;
}

function renderMetrics() {
  const selectedEntries = getSelectedSchedule();
  elements.totalScheduleCount.textContent = String(selectedEntries.length);
  elements.deliveryCount.textContent = countType(selectedEntries, "Delivery");
  elements.selfCollectionCount.textContent = countType(selectedEntries, "Customer Self-Collection");
  elements.vendorCollectionCount.textContent = countType(selectedEntries, "Collection at Vendor Place");
  elements.technicalCount.textContent = String(
    selectedEntries.filter((entry) => onsiteServiceTypes.includes(entry.type)).length
  );
  elements.submittedCount.textContent = countStatus(selectedEntries, "Submitted");
  elements.pendingCount.textContent = countStatus(selectedEntries, "Pending");
  elements.readyToShipCount.textContent = countStatus(selectedEntries, "Ready to Ship");
  elements.inProgressCount.textContent = countStatus(selectedEntries, "In Progress");
  elements.completedCount.textContent = countStatus(selectedEntries, "Completed");
  elements.carriedForwardCount.textContent = countStatus(selectedEntries, "Carried Forward");
}

function renderRoleDisplay() {
  elements.profileName.textContent = session.username;
  elements.profileRole.textContent = session.role;
  elements.avatar.textContent = initials(session.username);
  elements.notificationCenter.classList.remove("hidden");
  elements.clearLaunchDataHeaderButton.classList.toggle("hidden", !["Admin", "Management"].includes(session.role));
  elements.recentUpdatesPanel.classList.add("hidden");
  elements.addScheduleButton.classList.toggle(
    "hidden",
    !["Sales", "Warehouse"].includes(session.role)
  );
  elements.scheduleHeading.textContent = session.role === "Sales" ? "My Schedule" : "Daily Schedule";
  renderSidebar();
  showSection("dashboard");
}

function renderSidebar() {
  const fragment = document.createDocumentFragment();
  roleMenus[session.role].forEach((menuItem) => {
    const link = document.createElement("a");
    link.className = "nav-item";
    link.href = "#";
    link.dataset.section = menuItem.section;
    link.dataset.label = menuItem.label;
    if (menuItem.label === activeMenuLabel) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }

    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = menuItem.icon;
    link.append(icon, document.createTextNode(menuItem.label));
    fragment.appendChild(link);
  });
  elements.sidebarNav.replaceChildren(fragment);
}

function showSection(section, menuLabel = "") {
  const isUserManagement = session.role === "Admin" && section === "userManagement";
  const isRoleSettings = session.role === "Admin" && section === "roleSettings";
  const isSystemSettings = session.role === "Admin" && section === "systemSettings";
  const isAutoMail = ["Admin", "Warehouse"].includes(session.role) && section === "autoMail";
  const isTestingChecklist = session.role === "Admin" && section === "testingChecklist";
  const isDailySchedule = section === "dailySchedule";
  const isAddSchedule = ["Sales", "Warehouse"].includes(session.role) && section === "addSchedule";
  const isAdminPanel = isUserManagement || isRoleSettings || isSystemSettings || isTestingChecklist;
  const isStandalonePanel = isAdminPanel || isAutoMail;
  currentSection = isStandalonePanel || isDailySchedule || isAddSchedule ? section : "dashboard";
  document.body.classList.toggle("add-schedule-view", isAddSchedule);
  activeMenuLabel = menuLabel || (
    currentSection === "dashboard"
      ? "Dashboard"
      : currentSection === "addSchedule"
        ? "Add Schedule"
      : currentSection === "dailySchedule"
        ? session.role === "Sales" ? "My Schedule" : "Daily Schedule"
        : currentSection === "userManagement"
          ? "User Management"
          : currentSection === "roleSettings"
            ? "Role Settings"
            : currentSection === "systemSettings"
              ? "System Settings"
              : currentSection === "autoMail"
                ? "Auto Mail"
                : "Testing Checklist"
  );
  elements.schedulePageHeading.classList.toggle("hidden", isStandalonePanel);
  elements.addSchedule.classList.toggle("hidden", !isAddSchedule);
  elements.dailySchedule.classList.toggle("hidden", !isDailySchedule);
  elements.userManagement.classList.toggle("hidden", !isUserManagement);
  elements.roleSettings.classList.toggle("hidden", !isRoleSettings);
  elements.systemSettings.classList.toggle("hidden", !isSystemSettings);
  elements.autoMail.classList.toggle("hidden", !isAutoMail);
  elements.testingChecklist.classList.toggle("hidden", !isTestingChecklist);
  elements.dashboardSection.classList.toggle(
    "hidden",
    currentSection !== "dashboard"
  );
  elements.addScheduleButton.classList.toggle(
    "hidden",
    !isDailySchedule || !["Sales", "Warehouse"].includes(session.role)
  );
  if (isAddSchedule) {
    prepareAddScheduleForm();
  }
  if (isAutoMail) {
    renderAutoMailSettings();
    loadAutoMailSettings();
  }
  elements.scheduleHeading.textContent = session.role === "Sales" ? "My Schedule" : "Daily Schedule";
  if (!isRoleSettings) {
    closeRoleEditor();
    closeOverrideEditor();
  }
  renderDateHeading();
  renderSidebar();
}

function renderSystemSettings() {
  elements.scheduleTypeList.replaceChildren(...scheduleTypes.map(createSettingTag));
  elements.statusSettingList.replaceChildren(...scheduleStatuses.map(createSettingTag));
}

function renderAutoMailSettings() {
  elements.autoMailEnabled.checked = Boolean(autoMailSettings.enabled);
  elements.autoMailRecipient.value = autoMailSettings.recipientEmail || "";
  elements.autoMailCc.value = autoMailSettings.ccEmail || "";
  elements.autoMailSendTime.value = autoMailSettings.sendTime || "17:30";
  elements.autoMailTimezone.value = autoMailSettings.timezone || "Asia/Singapore";
  elements.autoMailWeekdays.checked = Boolean(autoMailSettings.weekdaysOnly);
  elements.autoMailIncludeTba.checked = Boolean(autoMailSettings.includeTbaSchedules);
  elements.autoMailSubject.value = autoMailSettings.emailSubject || "Datacom Daily Schedule Report";
  renderAutoMailPreview();
}

function normalizeAutoMailSettings(settings = {}) {
  return {
    ...defaultAutoMailSettings,
    ...autoMailSettings,
    enabled: settings.enabled ?? autoMailSettings.enabled ?? defaultAutoMailSettings.enabled,
    recipientEmail: settings.bossEmail ?? settings.recipientEmail ?? autoMailSettings.recipientEmail ?? defaultAutoMailSettings.recipientEmail,
    ccEmail: settings.ccEmail ?? autoMailSettings.ccEmail ?? defaultAutoMailSettings.ccEmail,
    sendTime: settings.sendTime || autoMailSettings.sendTime || defaultAutoMailSettings.sendTime,
    timezone: settings.timezone || autoMailSettings.timezone || defaultAutoMailSettings.timezone,
    weekdaysOnly: settings.weekdayOnly ?? settings.weekdaysOnly ?? autoMailSettings.weekdaysOnly ?? defaultAutoMailSettings.weekdaysOnly,
    includeTbaSchedules: settings.includeTbaSchedules ?? autoMailSettings.includeTbaSchedules ?? defaultAutoMailSettings.includeTbaSchedules,
    emailSubject: settings.emailSubject || settings.subject || autoMailSettings.emailSubject || defaultAutoMailSettings.emailSubject,
    lastStatus: settings.lastStatus || autoMailSettings.lastStatus || defaultAutoMailSettings.lastStatus,
    lastSentAt: settings.lastSentAt || autoMailSettings.lastSentAt || defaultAutoMailSettings.lastSentAt
  };
}

function normalizeEmailList(value) {
  return String(value || "")
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter(Boolean)
    .join(", ");
}

async function loadAutoMailSettings() {
  try {
    const result = await apiRequest("/auto-mail/settings");
    autoMailSettings = normalizeAutoMailSettings(result.settings);
    persistAppData();
    renderAutoMailSettings();
  } catch (error) {
    autoMailSettings = normalizeAutoMailSettings();
    renderAutoMailSettings();
    showToast(error.message);
  }
}

function renderAutoMailPreview() {
  const selectedDate = getSelectedDateValue();
  const previewDate = selectedDate === tbaValue ? localDateString(new Date()) : selectedDate;
  const label = new Intl.DateTimeFormat("en-SG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parseDate(previewDate));
  const previewEntries = scheduleRecords
    .filter((entry) => entry.date === previewDate || (autoMailSettings.includeTbaSchedules && entry.date === tbaValue))
    .sort((first, second) => scheduleTimeSortValue(first.requestedTime).localeCompare(scheduleTimeSortValue(second.requestedTime)));
  const [hour = "17", minute = "30"] = (autoMailSettings.sendTime || "17:30").split(":");
  elements.autoMailPreviewDate.textContent = label;
  elements.autoMailPreviewCount.textContent = String(previewEntries.length);
  elements.autoMailCron.textContent = `${Number(minute)} ${Number(hour)} * * ${autoMailSettings.weekdaysOnly === false ? "*" : "1-5"}`;
  elements.autoMailLastStatus.textContent = autoMailSettings.lastStatus || "Ready for backend scheduler";
  elements.autoMailLastSent.textContent = autoMailSettings.lastSentAt || "-";
  const rows = previewEntries.slice(0, 8).map((entry) => {
    const row = document.createElement("tr");
    const statusCell = document.createElement("td");
    statusCell.appendChild(createBadge(entry.status, statusClass(entry.status), "status-badge"));
    row.append(
      createCell(formatTime(entry.requestedTime)),
      createCell(entry.psNo),
      createCell(entry.companyName),
      statusCell
    );
    return row;
  });
  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "auto-mail-empty";
    cell.textContent = "No saved schedules for the selected date.";
    row.appendChild(cell);
    rows.push(row);
  }
  elements.autoMailPreviewRows.replaceChildren(...rows);
}

async function saveAutoMailSettings(event) {
  event.preventDefault();
  const settings = {
    enabled: elements.autoMailEnabled.checked,
    recipientEmail: elements.autoMailRecipient.value.trim(),
    ccEmail: normalizeEmailList(elements.autoMailCc.value),
    sendTime: elements.autoMailSendTime.value || "17:30",
    timezone: elements.autoMailTimezone.value.trim() || "Asia/Singapore",
    weekdaysOnly: elements.autoMailWeekdays.checked,
    includeTbaSchedules: elements.autoMailIncludeTba.checked,
    emailSubject: elements.autoMailSubject.value.trim() || "Datacom Daily Schedule Report"
  };
  elements.saveAutoMailSettings.disabled = true;
  try {
    const result = await apiRequest("/auto-mail/settings", {
      method: "PUT",
      body: JSON.stringify({
        enabled: settings.enabled,
        bossEmail: settings.recipientEmail,
        ccEmail: settings.ccEmail,
        sendTime: settings.sendTime,
        timezone: settings.timezone,
        weekdayOnly: settings.weekdaysOnly,
        includeTbaSchedules: settings.includeTbaSchedules,
        emailSubject: settings.emailSubject
      })
    });
    autoMailSettings = normalizeAutoMailSettings(result.settings || settings);
    autoMailSettings.lastStatus = result.message || "Auto mail settings saved.";
    persistAppData();
    renderAutoMailSettings();
    showToast(result.message || "Auto mail settings saved.");
  } catch (error) {
    showToast(error.message);
  } finally {
    elements.saveAutoMailSettings.disabled = false;
  }
}

async function requestAutoMailTest() {
  elements.testAutoMailButton.disabled = true;
  try {
    const result = await apiRequest("/auto-mail/daily-schedule/test", { method: "POST" });
    autoMailSettings.lastStatus = result.message || "Test mail sent successfully.";
    autoMailSettings.lastSentAt = new Intl.DateTimeFormat("en-SG", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date());
    persistAppData();
    renderAutoMailPreview();
    showToast(result.message || "Test mail sent successfully.");
  } catch (error) {
    showToast(error.message);
  } finally {
    elements.testAutoMailButton.disabled = false;
  }
}

function renderTestingChecklist() {
  const rows = testingChecklist.map((test) => {
    const row = document.createElement("tr");
    row.dataset.testId = test.id;
    row.appendChild(createCell(test.item, "checklist-item"));
    row.appendChild(createCell(test.expectedResult, "checklist-result"));

    const statusCell = document.createElement("td");
    const status = document.createElement("select");
    status.className = "checklist-select";
    status.dataset.checklistField = "status";
    status.setAttribute("aria-label", `Test status for ${test.item}`);
    ["Not Tested", "Pass", "Fail"].forEach((optionLabel) => {
      const option = document.createElement("option");
      option.value = optionLabel;
      option.textContent = optionLabel;
      option.selected = optionLabel === test.status;
      status.appendChild(option);
    });
    statusCell.appendChild(status);
    row.appendChild(statusCell);

    const remarksCell = document.createElement("td");
    const remarks = document.createElement("textarea");
    remarks.className = "checklist-remarks";
    remarks.dataset.checklistField = "remarks";
    remarks.rows = 2;
    remarks.placeholder = "Add test remarks";
    remarks.setAttribute("aria-label", `Remarks for ${test.item}`);
    remarks.value = test.remarks;
    remarksCell.appendChild(remarks);
    row.appendChild(remarksCell);
    return row;
  });
  elements.testingChecklistRows.replaceChildren(...rows);
}

function handleChecklistInput(event) {
  const field = event.target.closest("[data-checklist-field]");
  const row = event.target.closest("[data-test-id]");
  if (!field || !row || field.dataset.checklistField !== "remarks") {
    return;
  }
  const test = testingChecklist.find((entry) => entry.id === row.dataset.testId);
  if (!test) {
    return;
  }
  test.remarks = field.value;
  persistAppData();
}

function handleChecklistStatusChange(event) {
  const field = event.target.closest("[data-checklist-field='status']");
  const row = event.target.closest("[data-test-id]");
  if (!field || !row) {
    return;
  }
  const test = testingChecklist.find((entry) => entry.id === row.dataset.testId);
  if (!test) {
    return;
  }
  test.status = field.value;
  addActivityLog("Testing Checklist Updated", `${test.item} marked as ${test.status}.`);
  persistAppData();
}

function ensureResetLocalDataButton() {
  const maintenancePanel = document.querySelector(".maintenance-settings");
  if (!maintenancePanel) {
    return;
  }
  if (!document.getElementById("clearLaunchDataButton")) {
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.id = "clearLaunchDataButton";
    clearButton.className = "secondary-button maintenance-button";
    clearButton.textContent = "Clear All Records";
    clearButton.addEventListener("click", clearLaunchData);
    maintenancePanel.appendChild(clearButton);
  }
  if (!document.getElementById("resetLocalDataButton")) {
    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.id = "resetLocalDataButton";
    resetButton.className = "secondary-button maintenance-button";
    resetButton.textContent = "Reset Local Data";
    resetButton.addEventListener("click", resetLocalData);
    maintenancePanel.appendChild(resetButton);
  }
}

function renderScheduleFilterOptions() {
  setFilterOptions(elements.scheduleTypeFilter, scheduleTypes, "All Types");
  setFilterOptions(elements.scheduleStatusFilter, scheduleStatuses, "All Statuses");
  setFilterOptions(elements.assignedRoleFilter, assignedRoleOptions, "All Roles");
  const inputNames = [...new Set(scheduleRecords.map((entry) => entry.inputBy))].sort();
  setFilterOptions(elements.inputByFilter, inputNames, "All Users");
}

function restoreUiState() {
  elements.scheduleSearch.value = uiState.filters?.search || "";
  elements.scheduleTypeFilter.value = uiState.filters?.type || "";
  elements.scheduleStatusFilter.value = uiState.filters?.status || "";
  elements.assignedRoleFilter.value = uiState.filters?.assignedRole || "";
  elements.inputByFilter.value = uiState.filters?.inputBy || "";
  elements.scheduleSort.value = uiState.filters?.sort || "time-asc";
  previewFilter = uiState.previewFilter || "all";
  scheduleQuickFilter = uiState.scheduleQuickFilter || "";
  scheduleView = uiState.scheduleView || "table";
  elements.scheduleViewButtons.forEach((button) => {
    const selected = button.dataset.scheduleView === scheduleView;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const displayLabels = {
    all: "All Schedules",
    Delivery: "Deliveries",
    "Customer Self-Collection": "Customer Self-Collection",
    "Collection at Vendor Place": "Collection at Vendor Place"
  };
  elements.currentFilterLabel.textContent = displayLabels[previewFilter] || previewFilter;
  elements.metricCards.querySelectorAll("[data-filter]").forEach((card) => {
    const selected = card.dataset.filter === previewFilter;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
}

function prepareAddScheduleForm() {
  elements.addScheduleForm.reset();
  clearAddScheduleErrors();
  setRequiredSelectOptions(elements.newRequestedTime, requestedTimeOptions, "Select requested time");
  setRequiredSelectOptions(elements.newScheduleType, scheduleTypes, "Select schedule type");
  setFilterOptions(elements.newAssignedRole, assignedRoleOptions, "Optional");
  setRequiredSelectOptions(elements.newPriority, priorityOptions, "Select priority", "Normal");
  setRequiredSelectOptions(elements.newStatus, scheduleStatuses, "Select status", "Submitted");
  elements.newStatus.disabled = session.role === "Sales";
  elements.psNumberOptions.replaceChildren();
  renderAssignedPersonOptions();
  updateTypeShortcuts();
  setTbaDateControl(elements.newScheduleDate, elements.newScheduleDateTba, false);
  setNilContactControl(elements.newContactNumber, elements.newContactNumberNil, false, true);
  elements.newScheduleDate.value = "";
  elements.newInputBy.value = session.username;
}

function renderAssignedPersonOptions() {
  const selectedRole = elements.newAssignedRole.value;
  const people = selectedRole ? assignmentDirectory[selectedRole] || assignedPersonOptions : [];
  setMultiSelectOptions(elements.newAssignedPerson, people, selectedRole ? getSelectedMultiValues(elements.newAssignedPerson) : []);
  elements.newAssignedPersonButton.disabled = !selectedRole;
  if (selectedRole) {
    elements.newAssignedPerson.classList.remove("invalid-field");
    elements.newAssignedPersonButton.classList.remove("invalid-field");
    elements.addScheduleForm.querySelector('[data-error-for="assignedPerson"]').textContent = "";
  }
}

function updateTypeShortcuts() {
  elements.typeShortcuts.forEach((button) => {
    button.classList.toggle("selected", button.dataset.typeShortcut === elements.newScheduleType.value);
  });
}

function selectScheduleType(type) {
  elements.newScheduleType.value = type;
  elements.newScheduleType.classList.remove("invalid-field");
  const error = elements.addScheduleForm.querySelector('[data-error-for="type"]');
  if (error) {
    error.textContent = "";
  }
  updateTypeShortcuts();
}

function getSelectedMultiValues(selectElement) {
  return Array.from(selectElement.selectedOptions).map((option) => option.value).filter(Boolean);
}

function setMultiSelectOptions(selectElement, values, selectedValues = []) {
  const selectedSet = new Set(
    Array.isArray(selectedValues) ? selectedValues : String(selectedValues || "").split(",").map((value) => value.trim())
  );
  const options = values.map((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = selectedSet.has(value);
    return option;
  });
  selectElement.replaceChildren(...options);
  renderMultiSelectDropdown(selectElement);
}

function getMultiSelectParts(selectElement) {
  if (selectElement === elements.newAssignedPerson) {
    return {
      button: elements.newAssignedPersonButton,
      panel: elements.newAssignedPersonPanel,
      placeholder: "Select assigned person"
    };
  }
  if (selectElement === elements.editAssignedPerson) {
    return {
      button: elements.editAssignedPersonButton,
      panel: elements.editAssignedPersonPanel,
      placeholder: "Select assigned person"
    };
  }
  return {};
}

function updateMultiSelectSummary(selectElement) {
  const { button, placeholder } = getMultiSelectParts(selectElement);
  if (!button) {
    return;
  }
  const selectedValues = getSelectedMultiValues(selectElement);
  button.textContent = selectedValues.length ? selectedValues.join(", ") : placeholder;
  button.classList.toggle("has-value", selectedValues.length > 0);
}

function renderMultiSelectDropdown(selectElement) {
  const { panel } = getMultiSelectParts(selectElement);
  if (!panel) {
    return;
  }
  const checkboxes = Array.from(selectElement.options).map((option) => {
    const label = document.createElement("label");
    label.className = "multi-select-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = option.value;
    checkbox.checked = option.selected;
    checkbox.addEventListener("change", () => {
      option.selected = checkbox.checked;
      selectElement.classList.remove("invalid-field");
      getMultiSelectParts(selectElement).button?.classList.remove("invalid-field");
      updateMultiSelectSummary(selectElement);
    });
    label.append(checkbox, document.createTextNode(option.textContent));
    return label;
  });
  panel.replaceChildren(...checkboxes);
  updateMultiSelectSummary(selectElement);
}

function toggleMultiSelectPanel(selectElement) {
  const { button, panel } = getMultiSelectParts(selectElement);
  if (!button || !panel) {
    return;
  }
  const willOpen = panel.classList.contains("hidden");
  document.querySelectorAll(".multi-select-panel").forEach((openPanel) => {
    openPanel.classList.add("hidden");
  });
  document.querySelectorAll(".multi-select-button").forEach((openButton) => {
    openButton.setAttribute("aria-expanded", "false");
  });
  panel.classList.toggle("hidden", !willOpen);
  button.setAttribute("aria-expanded", String(willOpen));
}

function splitAssignedPeople(value) {
  return String(value || "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name && name !== "-");
}

function setRequiredSelectOptions(selectElement, values, placeholder, selectedValue = "") {
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  const options = values.map((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === selectedValue;
    if (statusDescriptions[value]) {
      option.title = statusDescriptions[value];
    }
    return option;
  });
  selectElement.replaceChildren(placeholderOption, ...options);
  selectElement.value = selectedValue;
}

function setFilterOptions(selectElement, values, allLabel, selectedValue) {
  const previousValue = selectedValue ?? selectElement.value;
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = allLabel;
  const options = values.map((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (statusDescriptions[value]) {
      option.title = statusDescriptions[value];
    }
    return option;
  });
  selectElement.replaceChildren(defaultOption, ...options);
  if (values.includes(previousValue) || previousValue === "") {
    selectElement.value = previousValue;
  }
}

function createSettingTag(setting) {
  const tag = document.createElement("span");
  tag.className = "setting-tag";
  tag.textContent = setting;
  if (statusDescriptions[setting]) {
    tag.title = statusDescriptions[setting];
  }
  return tag;
}

function renderPermissions() {
  const fragment = document.createDocumentFragment();
  rolePermissions.forEach((permission) => {
    const row = document.createElement("tr");
    row.appendChild(createCell(permission.role, "role-name"));
    row.appendChild(createPermissionCell(permission.viewOwnReport));
    row.appendChild(createPermissionCell(permission.viewAllReports));
    row.appendChild(createPermissionCell(permission.scheduleArrangement));
    row.appendChild(createPermissionCell(permission.updateStatus));
    row.appendChild(createPermissionCell(permission.userManagement));
    row.appendChild(createPermissionCell(permission.systemSettings));
    row.appendChild(createCell(permission.additional, "additional-permissions"));
    const actionsCell = document.createElement("td");
    actionsCell.appendChild(createAccessButton("Edit", "edit-role", permission.role));
    row.appendChild(actionsCell);
    fragment.appendChild(row);
  });
  elements.permissionRows.replaceChildren(fragment);
}

function createPermissionCell(allowed) {
  const cell = document.createElement("td");
  const mark = document.createElement("span");
  mark.className = `permission-mark ${allowed ? "allowed" : "denied"}`;
  mark.textContent = allowed ? "\u2713" : "-";
  mark.setAttribute("aria-label", allowed ? "Allowed" : "Not allowed");
  cell.appendChild(mark);
  return cell;
}

function renderOverrides() {
  const fragment = document.createDocumentFragment();
  userOverrides.forEach((override) => {
    const row = document.createElement("tr");
    row.appendChild(createCell(override.username, "user-name"));
    row.appendChild(createCell(override.baseRole, "user-role"));
    row.appendChild(createCell(override.permissions.join(", "), "extra-access"));

    const statusCell = document.createElement("td");
    statusCell.appendChild(createBadge(override.status, "user-status-active", "status-badge"));
    row.appendChild(statusCell);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "user-actions";
    actions.appendChild(createAccessButton("Edit Access", "edit-override", override.id));
    actions.appendChild(createAccessButton("Remove Override", "remove-override", override.id, "danger"));
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);
    fragment.appendChild(row);
  });
  elements.overrideRows.replaceChildren(fragment);
}

function createAccessButton(label, action, value, modifier = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action-button ${modifier}`.trim();
  button.dataset.accessAction = action;
  button.dataset.accessValue = value;
  button.textContent = label;
  return button;
}

function openRoleEditor(roleName) {
  const role = rolePermissions.find((permission) => permission.role === roleName);
  if (!role) {
    return;
  }
  elements.editingRoleName.value = roleName;
  elements.roleEditorTitle.textContent = `Update ${roleName} Permissions`;
  elements.rolePermissionOptions.replaceChildren(...editablePermissionFields.map((field) => (
    createPermissionCheckbox(field.label, field.key, role[field.key])
  )));
  elements.roleEditor.classList.remove("hidden");
}

function closeRoleEditor() {
  elements.rolePermissionForm.reset();
  elements.editingRoleName.value = "";
  elements.roleEditor.classList.add("hidden");
}

async function saveRolePermissions(event) {
  event.preventDefault();
  const role = rolePermissions.find((permission) => permission.role === elements.editingRoleName.value);
  if (!role) {
    return;
  }
  const updates = {};
  editablePermissionFields.forEach((field) => {
    const checkbox = elements.rolePermissionOptions.querySelector(`[name="${field.key}"]`);
    updates[field.key] = checkbox.checked;
  });
  try {
    await apiRequest(`/role-permissions/${encodeURIComponent(role.role)}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    });
    Object.assign(role, updates);
    renderPermissions();
    closeRoleEditor();
    showToast(`${role.role} permissions updated.`);
  } catch (error) {
    showToast(error.message);
  }
}

function openOverrideEditor(overrideId) {
  const override = userOverrides.find((entry) => entry.id === overrideId);
  if (!override) {
    return;
  }
  elements.editingOverrideId.value = overrideId;
  elements.overrideEditorTitle.textContent = `Edit Access - ${override.username}`;
  elements.overridePermissionOptions.replaceChildren(...overridePermissionOptions.map((permission) => (
    createPermissionCheckbox(permission, permission, override.permissions.includes(permission))
  )));
  elements.overrideEditor.classList.remove("hidden");
}

function closeOverrideEditor() {
  elements.overrideForm.reset();
  elements.editingOverrideId.value = "";
  elements.overrideEditor.classList.add("hidden");
}

function saveOverride(event) {
  event.preventDefault();
  const override = userOverrides.find((entry) => entry.id === elements.editingOverrideId.value);
  if (!override) {
    return;
  }
  closeOverrideEditor();
  showToast("User permission overrides require a database table before they can be saved.");
}

function createPermissionCheckbox(label, value, checked) {
  const wrapper = document.createElement("label");
  wrapper.className = "permission-option";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = value;
  input.value = value;
  input.checked = checked;
  wrapper.append(input, document.createTextNode(label));
  return wrapper;
}

function renderUsers() {
  const fragment = document.createDocumentFragment();
  dummyUsers.forEach((user) => fragment.appendChild(createUserRow(user)));
  elements.userRows.replaceChildren(fragment);
}

function createUserRow(user) {
  const row = document.createElement("tr");
  row.appendChild(createCell(user.username, "user-name"));
  row.appendChild(createCell(user.role, "user-role"));

  const statusCell = document.createElement("td");
  statusCell.appendChild(
    createBadge(user.status, `user-status-${user.status.toLowerCase().replaceAll(" ", "-")}`, "status-badge")
  );
  row.appendChild(statusCell);
  row.appendChild(createCell(formatDate(user.createdDate)));

  const actionsCell = document.createElement("td");
  const actions = document.createElement("div");
  actions.className = "user-actions";
  actions.appendChild(createUserButton("Edit", "edit-user", user.id));
  actions.appendChild(createUserButton("Reset Password", "reset-password", user.id));
  if (user.status === "Pending Approval") {
    actions.appendChild(createUserButton("Approve", "approve-user", user.id, "approve"));
  } else {
    const statusLabel = user.status === "Active" ? "Set Inactive" : "Activate";
    actions.appendChild(createUserButton(statusLabel, "toggle-user-status", user.id));
  }
  actions.appendChild(createUserButton("Delete", "delete-user", user.id, "danger"));
  actionsCell.appendChild(actions);
  row.appendChild(actionsCell);
  return row;
}

function createUserButton(label, action, id, modifier = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action-button ${modifier}`.trim();
  button.dataset.userAction = action;
  button.dataset.userId = id;
  button.textContent = label;
  return button;
}

function countType(entries, type) {
  return String(entries.filter((entry) => entry.type === type).length);
}

function countStatus(entries, status) {
  return String(entries.filter((entry) => entry.status === status).length);
}

function renderDashboardPreview() {
  const selectedEntries = filterPreviewSchedules(getSelectedSchedule())
    .slice()
    .sort((first, second) => scheduleTimeSortValue(first.requestedTime).localeCompare(scheduleTimeSortValue(second.requestedTime)))
    .slice(0, 5);
  const fragment = document.createDocumentFragment();
  selectedEntries.forEach((entry) => fragment.appendChild(createPreviewRow(entry)));
  elements.previewRows.replaceChildren(fragment);
  document.querySelector(".preview-table").classList.toggle("hidden", selectedEntries.length === 0);
  elements.emptyPreview.classList.toggle("hidden", selectedEntries.length !== 0);
}

function filterPreviewSchedules(entries) {
  switch (previewFilter) {
    case "Delivery":
    case "Customer Self-Collection":
    case "Collection at Vendor Place":
      return entries.filter((entry) => entry.type === previewFilter);
    case "Onsite / Remote Jobs":
      return entries.filter((entry) => onsiteServiceTypes.includes(entry.type));
    case "Submitted":
    case "Ready to Ship":
    case "In Progress":
    case "Completed":
    case "Carried Forward":
      return entries.filter((entry) => entry.status === previewFilter);
    default:
      return entries;
  }
}

function applyPreviewFilter(filter) {
  previewFilter = filter;
  const displayLabels = {
    all: "All Schedules",
    Delivery: "Deliveries",
    "Customer Self-Collection": "Customer Self-Collection",
    "Collection at Vendor Place": "Collection at Vendor Place"
  };
  elements.currentFilterLabel.textContent = displayLabels[filter] || filter;
  elements.metricCards.querySelectorAll("[data-filter]").forEach((card) => {
    const selected = card.dataset.filter === filter;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
  persistAppData();
  renderDashboardPreview();
}

function createPreviewRow(entry) {
  const row = document.createElement("tr");
  row.className = `schedule-row${entry.id === highlightedScheduleId ? " notification-target" : ""}`;
  row.dataset.scheduleId = entry.id;
  row.tabIndex = 0;
  row.setAttribute("aria-label", `View schedule details for ${entry.psNo}`);
  row.appendChild(createCell(formatTime(entry.requestedTime)));

  const typeCell = document.createElement("td");
  typeCell.appendChild(createBadge(entry.type, typeClass(entry.type), "type-badge"));
  row.appendChild(typeCell);
  row.appendChild(createCell(entry.psNo, "ps-number"));
  row.appendChild(createCell(entry.companyName, "company-name"));
  row.appendChild(createCell(entry.assignedPerson || "-"));

  const statusCell = document.createElement("td");
  statusCell.appendChild(
    createBadge(entry.status, statusClass(entry.status), "status-badge")
  );
  row.appendChild(statusCell);
  return row;
}

function renderSchedule() {
  const fragment = document.createDocumentFragment();
  const selectedEntries = getFilteredSchedule();
  selectedEntries.forEach((entry) => fragment.appendChild(createScheduleRow(entry)));
  elements.scheduleRows.replaceChildren();
  elements.scheduleRows.appendChild(fragment);
  const isTableView = scheduleView === "table";
  elements.dailyScheduleTable.classList.toggle("hidden", !isTableView || selectedEntries.length === 0);
  elements.emptySchedule.classList.toggle("hidden", !isTableView || selectedEntries.length !== 0);
  elements.dailyScheduleTimeline.classList.toggle("hidden", isTableView);
  renderTimeline(selectedEntries);
  const resultLabel = selectedEntries.length === 1 ? "result" : "results";
  elements.filteredScheduleCount.textContent = `${selectedEntries.length} ${resultLabel}`;
}

function renderTimeline(entries) {
  const timelineEntries = entries
    .slice()
    .sort((first, second) => scheduleTimeSortValue(first.requestedTime).localeCompare(scheduleTimeSortValue(second.requestedTime)));
  const fragment = document.createDocumentFragment();
  timelineEntries.forEach((entry) => fragment.appendChild(createTimelineEntry(entry)));
  elements.timelineDateHeading.textContent = formatDate(getSelectedDateValue());
  elements.timelineRows.replaceChildren(fragment);
  elements.emptyTimeline.classList.toggle("hidden", timelineEntries.length !== 0);
}

function createTimelineEntry(entry) {
  const timelineEntry = document.createElement("article");
  timelineEntry.className = `timeline-entry ${typeClass(entry.type)}`;

  const time = document.createElement("time");
  time.className = "timeline-time";
  time.textContent = formatTime(entry.requestedTime);

  const card = document.createElement("button");
  card.type = "button";
  card.className = `timeline-card${entry.id === highlightedScheduleId ? " notification-target" : ""}`;
  card.dataset.scheduleId = entry.id;
  card.setAttribute("aria-label", `View schedule details for ${entry.psNo}`);

  const top = document.createElement("div");
  top.className = "timeline-card-top";
  top.appendChild(createBadge(entry.type, typeClass(entry.type), "type-badge"));
  const psNo = document.createElement("span");
  psNo.className = "timeline-card-reference";
  psNo.textContent = entry.psNo;
  top.appendChild(psNo);

  const company = document.createElement("h4");
  company.textContent = entry.companyName;
  const footer = document.createElement("div");
  footer.className = "timeline-card-footer";
  const assignedPerson = document.createElement("span");
  assignedPerson.textContent = `Assigned: ${entry.assignedPerson || "-"}`;
  footer.appendChild(assignedPerson);
  footer.appendChild(
    createBadge(entry.status, statusClass(entry.status), "status-badge")
  );
  card.append(top, company, footer);
  timelineEntry.append(time, card);
  return timelineEntry;
}

function setScheduleView(view) {
  scheduleView = view;
  elements.scheduleViewButtons.forEach((button) => {
    const selected = button.dataset.scheduleView === view;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  persistAppData();
  renderSchedule();
}

function createScheduleRow(entry) {
  const row = document.createElement("tr");
  row.className = `schedule-row${entry.id === highlightedScheduleId ? " notification-target" : ""}`;
  row.dataset.scheduleId = entry.id;
  row.tabIndex = 0;
  row.setAttribute("aria-label", `View schedule details for ${entry.psNo}`);
  row.appendChild(createCell(formatDate(entry.date)));
  row.appendChild(createCell(formatTime(entry.requestedTime)));

  const typeCell = document.createElement("td");
  typeCell.appendChild(createBadge(entry.type, typeClass(entry.type), "type-badge"));
  row.appendChild(typeCell);

  row.appendChild(createCell(entry.psNo, "ps-number"));
  row.appendChild(createCell(entry.companyName, "company-name"));
  row.appendChild(createCell(entry.products, "products"));
  row.appendChild(createCell(entry.location));
  row.appendChild(createCell(entry.pic || "-"));
  row.appendChild(createCell(formatContactNumber(entry.contactNumber)));
  row.appendChild(createCell(entry.assignedRole || "-", "assigned-role"));
  row.appendChild(createCell(entry.assignedPerson || "-"));
  row.appendChild(createCell(entry.priority || "Normal"));
  row.appendChild(createCell(entry.inputBy, "input-by"));

  const statusCell = document.createElement("td");
  statusCell.appendChild(createBadge(entry.status, statusClass(entry.status), "status-badge"));
  row.appendChild(statusCell);

  return row;
}

function openScheduleDetails(scheduleId) {
  const entry = scheduleRecords.find((schedule) => schedule.id === scheduleId);
  if (!entry) {
    return;
  }
  selectedScheduleId = scheduleId;
  closeDetailWorkflows();
  elements.detailsTitle.textContent = `${entry.type} - ${entry.psNo}`;
  elements.detailDate.textContent = formatDate(entry.date);
  elements.detailTime.textContent = formatTime(entry.requestedTime);
  elements.detailType.replaceChildren(
    createBadge(entry.type, typeClass(entry.type), "type-badge")
  );
  elements.detailPsNo.textContent = entry.psNo;
  elements.detailCarriedForwardGroup.classList.toggle("hidden", !entry.carriedForwardFromPsNo);
  elements.detailCarriedForwardFrom.textContent = entry.carriedForwardFromPsNo || "";
  elements.detailStatus.replaceChildren(
    createBadge(entry.status, statusClass(entry.status), "status-badge")
  );
  elements.detailProducts.textContent = entry.products;
  elements.detailCompany.textContent = entry.companyName;
  elements.detailLocation.textContent = entry.location;
  elements.detailPic.textContent = entry.pic || "-";
  elements.detailContactNumber.textContent = formatContactNumber(entry.contactNumber);
  elements.detailAssignedRole.textContent = entry.assignedRole || "-";
  elements.detailAssignedPerson.textContent = entry.assignedPerson || "-";
  elements.detailPriority.textContent = entry.priority || "Normal";
  elements.detailInputBy.textContent = entry.inputBy;
  elements.detailRemarks.textContent = entry.remarks;
  elements.detailCreated.textContent = entry.createdAt;
  elements.detailUpdatedBy.textContent = entry.lastUpdatedBy;
  elements.detailUpdatedAt.textContent = entry.lastUpdatedAt;
  const canEdit = canEditSchedule(entry);
  const canUpdateStatus = canUpdateScheduleStatus(entry);
  elements.editScheduleDetail.classList.toggle("hidden", !canEdit);
  elements.updateScheduleStatus.classList.toggle("hidden", !canUpdateStatus);
  elements.carryForwardSchedule.classList.toggle("hidden", !canCarryForwardSchedule(entry));
  elements.sendToFieldPlatform.classList.toggle("hidden", !["Admin", "Warehouse"].includes(session.role));
  elements.scheduleDetailsModal.classList.remove("hidden");
  elements.scheduleDetailsModal.setAttribute("aria-hidden", "false");
  elements.closeDetailsIcon.focus();
}

function closeScheduleDetails() {
  closeDetailWorkflows();
  closeCarryForwardModal();
  selectedScheduleId = "";
  elements.scheduleDetailsModal.classList.add("hidden");
  elements.scheduleDetailsModal.setAttribute("aria-hidden", "true");
}

function getSelectedScheduleRecord() {
  return scheduleRecords.find((schedule) => schedule.id === selectedScheduleId);
}

function closeDetailWorkflows() {
  elements.scheduleEditPanel.classList.add("hidden");
  elements.statusUpdatePanel.classList.add("hidden");
  elements.scheduleEditForm.reset();
  elements.statusUpdateForm.reset();
}

function openCarryForwardModal() {
  const entry = getSelectedScheduleRecord();
  if (!entry) {
    return;
  }
  closeDetailWorkflows();
  elements.carryForwardForm.reset();
  if (entry.date === tbaValue) {
    elements.carryForwardDate.min = "";
    setTbaDateControl(elements.carryForwardDate, elements.carryForwardDateTba, true);
  } else {
    const nextDate = parseDate(entry.date);
    nextDate.setDate(nextDate.getDate() + 1);
    elements.carryForwardDate.min = localDateString(nextDate);
    setTbaDateControl(elements.carryForwardDate, elements.carryForwardDateTba, false);
    elements.carryForwardDate.value = localDateString(nextDate);
  }
  setRequiredSelectOptions(elements.carryForwardTime, requestedTimeOptions, "Select requested time", entry.requestedTime);
  elements.carryForwardStatus.value = "Submitted";
  elements.carryForwardError.textContent = "";
  elements.carryForwardError.classList.add("hidden");
  elements.carryForwardModal.classList.remove("hidden");
  elements.carryForwardModal.setAttribute("aria-hidden", "false");
  elements.carryForwardDate.focus();
}

function closeCarryForwardModal() {
  elements.carryForwardModal.classList.add("hidden");
  elements.carryForwardModal.setAttribute("aria-hidden", "true");
  elements.carryForwardError.textContent = "";
  elements.carryForwardError.classList.add("hidden");
}

function setSelectOptions(selectElement, options, selectedValue) {
  const optionElements = options.map((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === selectedValue;
    if (statusDescriptions[value]) {
      option.title = statusDescriptions[value];
    }
    return option;
  });
  selectElement.replaceChildren(...optionElements);
}

function formatAuditTimestamp() {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date());
}

function updateAuditFields(entry) {
  entry.lastUpdatedBy = session.username;
  entry.lastUpdatedAt = formatAuditTimestamp();
}

function refreshScheduleViews(entry) {
  persistAppData();
  renderMetrics();
  renderDashboardPreview();
  renderSchedule();
  openScheduleDetails(entry.id);
}

function isCurrentUserSchedule(entry) {
  return String(entry.inputBy || "").toLowerCase() === String(session.username || "").toLowerCase();
}

function getEditableScheduleFields(entry) {
  if (session.role === "Admin") {
    return "all";
  }
  if (session.role === "Warehouse") {
    return ["Submitted", "Pending", "Ready to Ship", "In Progress", "Carried Forward"].includes(entry.status) ? "all" : [];
  }
  if (session.role !== "Sales" || !isCurrentUserSchedule(entry)) {
    return [];
  }
  const salesEditRules = {
    Submitted: "all",
    Pending: ["date", "requestedTime", "companyName", "location", "products", "remarks"],
    "In Progress": ["remarks", "contactNumber"],
    "Ready to Ship": ["remarks"],
    "Carried Forward": ["date", "requestedTime", "remarks"],
    Completed: [],
    Cancelled: []
  };
  return salesEditRules[entry.status] || [];
}

function canEditSchedule(entry) {
  const fields = getEditableScheduleFields(entry);
  return fields === "all" || fields.length > 0;
}

function canUpdateScheduleStatus(entry) {
  if (session.role === "Admin") {
    return true;
  }
  return session.role === "Warehouse" && !["Completed", "Cancelled"].includes(entry.status);
}

function canCarryForwardSchedule(entry) {
  return ["Admin", "Warehouse"].includes(session.role) && !["Completed", "Cancelled"].includes(entry.status);
}

function setScheduleEditAccess(entry) {
  const fields = getEditableScheduleFields(entry);
  const editableAll = fields === "all";
  const editableSet = new Set(editableAll ? [] : fields);
  const fieldMap = {
    date: [elements.editScheduleDate, elements.editScheduleDateTba],
    requestedTime: [elements.editRequestedTime],
    type: [elements.editScheduleType],
    psNo: [elements.editPsNo],
    companyName: [elements.editCompanyName],
    location: [elements.editLocation],
    products: [elements.editProducts],
    pic: [elements.editPic],
    contactNumber: [elements.editContactNumber, elements.editContactNumberNil],
    assignedRole: [elements.editAssignedRole],
    assignedPerson: [elements.editAssignedPerson],
    priority: [elements.editPriority],
    remarks: [elements.editRemarks]
  };
  Object.entries(fieldMap).forEach(([fieldName, controls]) => {
    const canEditField = editableAll || editableSet.has(fieldName);
    controls.forEach((control) => {
      control.disabled = !canEditField;
    });
  });
}

function openScheduleEditor() {
  const entry = getSelectedScheduleRecord();
  if (!entry) {
    return;
  }
  if (!canEditSchedule(entry)) {
    showToast("This schedule is read only for your role and current status.");
    return;
  }
  elements.statusUpdatePanel.classList.add("hidden");
  setTbaDateControl(elements.editScheduleDate, elements.editScheduleDateTba, entry.date === tbaValue);
  if (entry.date !== tbaValue) {
    elements.editScheduleDate.value = entry.date;
  }
  setRequiredSelectOptions(elements.editRequestedTime, requestedTimeOptions, "Select requested time", entry.requestedTime);
  setSelectOptions(elements.editScheduleType, scheduleTypes, entry.type);
  elements.editPsNo.value = entry.psNo;
  elements.editCompanyName.value = entry.companyName;
  elements.editPic.value = entry.pic === "-" ? "" : entry.pic;
  setNilContactControl(elements.editContactNumber, elements.editContactNumberNil, !entry.contactNumber || ["-", "Nil"].includes(entry.contactNumber));
  if (entry.contactNumber && !["-", "Nil"].includes(entry.contactNumber)) {
    elements.editContactNumber.value = entry.contactNumber;
  }
  elements.editLocation.value = entry.location;
  elements.editProducts.value = entry.products;
  setFilterOptions(elements.editAssignedRole, assignedRoleOptions, "Optional", entry.assignedRole === "-" ? "" : entry.assignedRole);
  renderEditAssignedPersonOptions(entry.assignedPerson);
  setSelectOptions(elements.editPriority, priorityOptions, entry.priority || "Normal");
  elements.editRemarks.value = entry.remarks;
  setScheduleEditAccess(entry);
  elements.scheduleEditPanel.classList.remove("hidden");
  elements.editScheduleDate.focus();
}

function renderEditAssignedPersonOptions(selectedPeople = "") {
  const selectedRole = elements.editAssignedRole.value;
  const people = selectedRole ? assignmentDirectory[selectedRole] || assignedPersonOptions : [];
  setMultiSelectOptions(elements.editAssignedPerson, people, selectedRole ? splitAssignedPeople(selectedPeople) : []);
  elements.editAssignedPersonButton.disabled = !selectedRole;
}

async function saveScheduleChanges(event) {
  event.preventDefault();
  const entry = getSelectedScheduleRecord();
  if (!entry) {
    return;
  }
  const assignment = getScheduleAssignmentPayload(elements.editAssignedRole, elements.editAssignedPerson);
  const updates = {
    date: elements.editScheduleDateTba.checked ? tbaValue : elements.editScheduleDate.value,
    requestedTime: elements.editRequestedTime.value,
    type: elements.editScheduleType.value,
    psNo: elements.editPsNo.value.trim(),
    companyName: elements.editCompanyName.value.trim(),
    pic: elements.editPic.value.trim() || "-",
    contactNumber: elements.editContactNumberNil.checked ? "Nil" : elements.editContactNumber.value.trim() || "Nil",
    location: elements.editLocation.value.trim(),
    products: elements.editProducts.value.trim(),
    assignedRole: assignment.assignedRole,
    assignedPerson: assignment.assignedPerson,
    priority: elements.editPriority.value,
    remarks: elements.editRemarks.value.trim() || "-",
    status: entry.status
  };
  try {
    const result = await apiRequest(`/schedules/${entry.id}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    });
    const savedSchedule = { ...updates, ...result.schedule };
    replaceSchedule(savedSchedule);
    refreshScheduleViews(savedSchedule);
    showToast(`${savedSchedule.psNo} schedule details updated.`);
    await refreshNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

function openStatusEditor(selectedStatus) {
  const entry = getSelectedScheduleRecord();
  if (!entry) {
    return;
  }
  if (!canUpdateScheduleStatus(entry)) {
    showToast("Status updates are not available for your role on this schedule.");
    return;
  }
  elements.scheduleEditPanel.classList.add("hidden");
  const regularStatuses = scheduleStatuses;
  const selectedValue = regularStatuses.includes(selectedStatus || entry.status)
    ? selectedStatus || entry.status
    : "Ready to Ship";
  setSelectOptions(elements.newScheduleStatus, regularStatuses, selectedValue);
  elements.statusRemarks.value = "";
  elements.statusUpdatePanel.classList.remove("hidden");
  elements.newScheduleStatus.focus();
}

async function saveScheduleStatus(event) {
  event.preventDefault();
  const entry = getSelectedScheduleRecord();
  const remarks = elements.statusRemarks.value.trim();
  if (!entry || !remarks) {
    return;
  }
  try {
    const result = await apiRequest(`/schedules/${entry.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: elements.newScheduleStatus.value, remarks })
    });
    replaceSchedule(result.schedule);
    refreshScheduleViews(result.schedule);
    showToast(`${result.schedule.psNo} status updated to ${result.schedule.status}.`);
    await refreshNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

async function saveCarryForwardSchedule(event) {
  event.preventDefault();
  const entry = getSelectedScheduleRecord();
  const reason = elements.carryForwardReason.value.trim();
  const newDate = elements.carryForwardDateTba.checked ? tbaValue : elements.carryForwardDate.value;
  if (!entry) {
    return;
  }
  if (!newDate || (newDate !== tbaValue && entry.date !== tbaValue && newDate <= entry.date)) {
    elements.carryForwardError.textContent = "Select a new schedule date after the current job date.";
    elements.carryForwardError.classList.remove("hidden");
    elements.carryForwardDate.focus();
    return;
  }
  if (!elements.carryForwardTime.value || !reason) {
    elements.carryForwardError.textContent = "Requested time and carry forward reason are required.";
    elements.carryForwardError.classList.remove("hidden");
    (elements.carryForwardTime.value ? elements.carryForwardReason : elements.carryForwardTime).focus();
    return;
  }
  try {
    const result = await apiRequest(`/schedules/${entry.id}/carry-forward`, {
      method: "POST",
      body: JSON.stringify({
        date: newDate,
        requestedTime: elements.carryForwardTime.value,
        reason,
        status: elements.carryForwardStatus.value
      })
    });
    result.continuation.carriedForwardFromPsNo = result.original.psNo;
    replaceSchedule(result.original);
    replaceSchedule(result.continuation);
    setDashboardDate(result.continuation.date);
    closeCarryForwardModal();
    renderScheduleFilterOptions();
    renderSelectedDate();
    openScheduleDetails(result.continuation.id);
    showToast(`${result.original.psNo} carried forward to ${formatDate(result.continuation.date)}.`);
    await refreshNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

async function sendSelectedScheduleToFieldPlatform() {
  const entry = getSelectedScheduleRecord();
  if (!entry) {
    return;
  }
  try {
    const result = await apiRequest(`/schedules/${entry.id}/sync`, { method: "PATCH" });
    replaceSchedule(result.schedule);
    refreshScheduleViews(result.schedule);
    showToast(`${result.schedule.psNo} sent to Field Job Platform.`);
    await refreshNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

function printSelectedScheduleDetails() {
  if (!getSelectedScheduleRecord()) {
    return;
  }
  document.body.classList.add("printing-schedule-details");
  window.print();
}

function getScheduleExportCells(entry) {
  return [
    formatDate(entry.date),
    formatTime(entry.requestedTime),
    entry.type,
    entry.psNo,
    entry.companyName,
    entry.products,
    entry.location,
    entry.pic || "-",
    formatContactNumber(entry.contactNumber),
    entry.assignedRole || "-",
    entry.assignedPerson || "-",
    entry.priority || "Normal",
    entry.inputBy,
    entry.status
  ];
}

function printSelectedDateSchedule() {
  const entries = getSelectedSchedule()
    .slice()
    .sort((first, second) => scheduleTimeSortValue(first.requestedTime).localeCompare(scheduleTimeSortValue(second.requestedTime)));
  const rows = entries.map((entry) => {
    const row = document.createElement("tr");
    getScheduleExportCells(entry).forEach((value) => row.appendChild(createCell(value)));
    return row;
  });
  elements.printScheduleDate.textContent = formatDate(getSelectedDateValue());
  elements.printScheduleRows.replaceChildren(...rows);
  document.body.classList.add("printing-daily-schedule");
  window.print();
}

function escapeCsvValue(value) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function exportFilteredScheduleCsv() {
  const headers = [
    "Date",
    "Time",
    "Type",
    "Reference Number (PS/PR/PO)",
    "Company Name",
    "Products / Items",
    "Location",
    "PIC",
    "Contact Number",
    "Assigned Role",
    "Assigned Person",
    "Priority",
    "Input By",
    "Status"
  ];
  const rows = getFilteredSchedule().map(getScheduleExportCells);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const downloadLink = document.createElement("a");
  const downloadUrl = URL.createObjectURL(blob);
  downloadLink.href = downloadUrl;
  downloadLink.download = `daily-schedule-${getSelectedDateValue().toLowerCase()}.csv`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
  showToast(`${rows.length} filtered schedule record(s) exported to CSV.`);
}

function createCell(value, className = "") {
  const cell = document.createElement("td");
  cell.className = className;
  cell.textContent = value;
  return cell;
}

function createBadge(value, modifier, baseClass) {
  const badge = document.createElement("span");
  badge.className = `${baseClass} ${modifier}`;
  badge.textContent = value;
  if (baseClass === "status-badge" && statusDescriptions[value]) {
    badge.title = statusDescriptions[value];
  }
  return badge;
}

function typeClass(value) {
  return `type-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function statusClass(value) {
  return `status-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function formatDate(value) {
  if (value === tbaValue) {
    return tbaValue;
  }
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function parseDate(value) {
  if (value === tbaValue) {
    return new Date();
  }
  return new Date(`${value}T00:00:00`);
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSelectedSchedule() {
  const selectedDate = getSelectedDateValue();
  return scheduleRecords.filter((entry) => {
    const matchesDate = entry.date === selectedDate;
    const submittedByUser = entry.inputBy.toLowerCase() === session.username.toLowerCase();
    return matchesDate && (session.role !== "Sales" || submittedByUser);
  });
}

function getFilteredSchedule() {
  const query = elements.scheduleSearch.value.trim().toLowerCase();
  const entries = getSelectedSchedule().filter((entry) => {
    const searchableValues = [
      entry.psNo,
      entry.companyName,
      entry.products,
      entry.location,
      entry.pic || "",
      entry.contactNumber || "",
      entry.assignedPerson || "",
      entry.priority || "",
      entry.inputBy
    ].join(" ").toLowerCase();
    const matchesSearch = !query || searchableValues.includes(query);
    const matchesType = !elements.scheduleTypeFilter.value || entry.type === elements.scheduleTypeFilter.value;
    const matchesStatus = !elements.scheduleStatusFilter.value || entry.status === elements.scheduleStatusFilter.value;
    const matchesRole = !elements.assignedRoleFilter.value || entry.assignedRole === elements.assignedRoleFilter.value;
    const matchesInputBy = !elements.inputByFilter.value || entry.inputBy === elements.inputByFilter.value;
    return matchesSearch && matchesType && matchesStatus && matchesRole && matchesInputBy;
  });
  return entries.sort(compareSchedules);
}

function compareSchedules(first, second) {
  switch (elements.scheduleSort.value) {
    case "date-desc":
      return second.date.localeCompare(first.date) || scheduleTimeSortValue(first.requestedTime).localeCompare(scheduleTimeSortValue(second.requestedTime));
    case "time-asc":
      return scheduleTimeSortValue(first.requestedTime).localeCompare(scheduleTimeSortValue(second.requestedTime));
    case "time-desc":
      return scheduleTimeSortValue(second.requestedTime).localeCompare(scheduleTimeSortValue(first.requestedTime));
    case "status-asc":
      return scheduleStatuses.indexOf(first.status) - scheduleStatuses.indexOf(second.status)
        || scheduleTimeSortValue(first.requestedTime).localeCompare(scheduleTimeSortValue(second.requestedTime));
    default:
      return first.date.localeCompare(second.date) || scheduleTimeSortValue(first.requestedTime).localeCompare(scheduleTimeSortValue(second.requestedTime));
  }
}

function updateScheduleQuickButtons() {
  elements.scheduleQuickFilters.forEach((button) => {
    const selected = button.dataset.scheduleQuick === scheduleQuickFilter;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function applyScheduleQuickFilter(filter) {
  scheduleQuickFilter = filter;
  if (filter === tbaValue) {
    setDashboardDate(tbaValue);
    renderSelectedDate();
  } else if (["today", "tomorrow"].includes(filter)) {
    const selectedDate = new Date();
    if (filter === "tomorrow") {
      selectedDate.setDate(selectedDate.getDate() + 1);
    }
    setDashboardDate(localDateString(selectedDate));
    renderSelectedDate();
  } else {
    elements.scheduleStatusFilter.value = filter;
    renderSchedule();
  }
  updateScheduleQuickButtons();
  persistAppData();
}

function clearScheduleFilters() {
  elements.scheduleSearch.value = "";
  elements.scheduleTypeFilter.value = "";
  elements.scheduleStatusFilter.value = "";
  elements.assignedRoleFilter.value = "";
  elements.inputByFilter.value = "";
  elements.scheduleSort.value = "time-asc";
  scheduleQuickFilter = "";
  updateScheduleQuickButtons();
  renderSchedule();
  persistAppData();
}

function clearAddScheduleErrors() {
  elements.addScheduleErrorSummary.classList.add("hidden");
  elements.addScheduleForm.querySelectorAll(".field-error").forEach((message) => {
    message.textContent = "";
  });
  elements.addScheduleForm.querySelectorAll(".invalid-field").forEach((field) => {
    field.classList.remove("invalid-field");
  });
  elements.addScheduleForm.querySelectorAll(".multi-select-button").forEach((button) => {
    button.classList.remove("invalid-field");
  });
}

function getRequiredScheduleFields() {
  return [
    { element: elements.newScheduleDate, name: "date", label: "Schedule Date" },
    { element: elements.newRequestedTime, name: "requestedTime", label: "Requested Time" },
    { element: elements.newScheduleType, name: "type", label: "Schedule Type" },
    { element: elements.newPsNo, name: "psNo", label: "Reference Number (PS/PR/PO)" },
    { element: elements.newCompanyName, name: "companyName", label: "Company Name" },
    { element: elements.newProducts, name: "products", label: "Products / Items" },
    { element: elements.newLocation, name: "location", label: "Location" },
    { element: elements.newPic, name: "pic", label: "PIC" },
    { element: elements.newContactNumber, name: "contactNumber", label: "Contact Number" },
    { element: elements.newPriority, name: "priority", label: "Priority" },
    { element: elements.newInputBy, name: "inputBy", label: "Input By" },
    { element: elements.newStatus, name: "status", label: "Status" }
  ].filter((field) => {
    if (field.name === "date") {
      return !elements.newScheduleDateTba.checked;
    }
    if (field.name === "contactNumber") {
      return !elements.newContactNumberNil.checked;
    }
    return true;
  });
}

function validateAddScheduleForm() {
  clearAddScheduleErrors();
  let firstInvalidField;
  getRequiredScheduleFields().forEach(({ element, name, label }) => {
    const value = element.multiple ? getSelectedMultiValues(element).join(",") : element.value.trim();
    if (!value) {
      const message = elements.addScheduleForm.querySelector(`[data-error-for="${name}"]`);
      message.textContent = `${label} is required.`;
      element.classList.add("invalid-field");
      if (element.multiple) {
        getMultiSelectParts(element).button?.classList.add("invalid-field");
      }
      firstInvalidField = firstInvalidField || element;
    }
  });
  const referenceNumber = elements.newPsNo.value.trim();
  if (referenceNumber && !referenceNumberPattern.test(referenceNumber)) {
    const message = elements.addScheduleForm.querySelector('[data-error-for="psNo"]');
    message.textContent = "Enter a valid PS, PR, or PO reference number, for example PS-12345.";
    elements.newPsNo.classList.add("invalid-field");
    firstInvalidField = firstInvalidField || elements.newPsNo;
  }
  const selectedPeople = getSelectedMultiValues(elements.newAssignedPerson);
  if (!elements.newAssignedRole.value && selectedPeople.length) {
    const message = elements.addScheduleForm.querySelector('[data-error-for="assignedPerson"]');
    message.textContent = "Select an assigned role before choosing an assigned person, or leave assigned person empty.";
    elements.newAssignedPerson.classList.add("invalid-field");
    elements.newAssignedPersonButton.classList.add("invalid-field");
    firstInvalidField = firstInvalidField || elements.newAssignedPerson;
  }
  if (firstInvalidField) {
    elements.addScheduleErrorSummary.classList.remove("hidden");
    if (firstInvalidField.multiple) {
      getMultiSelectParts(firstInvalidField).button?.focus();
    } else {
      firstInvalidField.focus();
    }
    return false;
  }
  return true;
}

function markAddScheduleFieldError(name, message) {
  const fieldMap = {
    date: elements.newScheduleDate,
    requestedTime: elements.newRequestedTime,
    type: elements.newScheduleType,
    psNo: elements.newPsNo,
    companyName: elements.newCompanyName,
    products: elements.newProducts,
    location: elements.newLocation,
    pic: elements.newPic,
    contactNumber: elements.newContactNumber,
    assignedRole: elements.newAssignedRole,
    assignedPerson: elements.newAssignedPerson,
    priority: elements.newPriority,
    inputBy: elements.newInputBy,
    status: elements.newStatus
  };
  const field = fieldMap[name];
  const messageElement = elements.addScheduleForm.querySelector(`[data-error-for="${name}"]`);
  if (messageElement) {
    messageElement.textContent = message;
  }
  field?.classList.add("invalid-field");
  if (field?.multiple) {
    getMultiSelectParts(field).button?.classList.add("invalid-field");
  }
  return field;
}

function validateAddSchedulePayload(record) {
  const errors = [];
  const addError = (name, message) => errors.push({ name, message });
  if (!record.date) {
    addError("date", "Schedule Date is required unless TBA is selected.");
  } else if (record.date !== tbaValue && !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    addError("date", "Enter a valid schedule date, or select TBA.");
  }
  if (!record.requestedTime || !requestedTimeOptions.includes(record.requestedTime)) {
    addError("requestedTime", "Select a valid requested time.");
  }
  if (!record.type || !scheduleTypes.includes(record.type)) {
    addError("type", "Select a valid schedule type.");
  }
  if (!record.psNo || !referenceNumberPattern.test(record.psNo)) {
    addError("psNo", "Enter a valid PS, PR, or PO reference number, for example PS-12345.");
  }
  [
    ["companyName", "Company Name"],
    ["products", "Products / Items"],
    ["location", "Location"],
    ["pic", "PIC"],
    ["contactNumber", "Contact Number"],
    ["inputBy", "Input By"]
  ].forEach(([name, label]) => {
    if (!String(record[name] || "").trim()) {
      addError(name, `${label} is required.`);
    }
  });
  if (record.assignedRole && !assignedRoleOptions.includes(record.assignedRole)) {
    addError("assignedRole", "Select a valid assigned role.");
  }
  if (!record.assignedRole && record.assignedPerson !== "Unassigned") {
    addError("assignedPerson", "Select an assigned role before choosing an assigned person, or leave assigned person empty.");
  }
  if (!priorityOptions.includes(record.priority)) {
    addError("priority", "Select a valid priority.");
  }
  if (!scheduleStatuses.includes(record.status)) {
    addError("status", "Select a valid status.");
  }
  if (!errors.length) {
    return true;
  }
  let firstInvalidField;
  errors.forEach(({ name, message }) => {
    firstInvalidField = firstInvalidField || markAddScheduleFieldError(name, message);
  });
  elements.addScheduleErrorSummary.classList.remove("hidden");
  if (firstInvalidField?.multiple) {
    getMultiSelectParts(firstInvalidField).button?.focus();
  } else {
    firstInvalidField?.focus();
  }
  return false;
}

function createScheduleId() {
  const highestId = scheduleRecords.reduce((highest, entry) => {
    const numericId = Number(entry.id.replace("SCH-", ""));
    return Number.isNaN(numericId) ? highest : Math.max(highest, numericId);
  }, 0);
  return `SCH-${String(highestId + 1).padStart(3, "0")}`;
}

async function saveNewSchedule(event) {
  event.preventDefault();
  if (!validateAddScheduleForm()) {
    return;
  }
  const assignment = getScheduleAssignmentPayload(elements.newAssignedRole, elements.newAssignedPerson);
  const record = {
    date: elements.newScheduleDateTba.checked ? tbaValue : elements.newScheduleDate.value,
    requestedTime: elements.newRequestedTime.value,
    type: elements.newScheduleType.value,
    psNo: elements.newPsNo.value.trim(),
    companyName: elements.newCompanyName.value.trim(),
    products: elements.newProducts.value.trim(),
    location: elements.newLocation.value.trim(),
    pic: elements.newPic.value.trim(),
    contactNumber: elements.newContactNumberNil.checked ? "Nil" : elements.newContactNumber.value.trim(),
    assignedRole: assignment.assignedRole,
    assignedPerson: assignment.assignedPerson,
    priority: elements.newPriority.value,
    inputBy: elements.newInputBy.value.trim(),
    remarks: elements.newRemarks.value.trim() || "-",
    status: session.role === "Sales" ? "Submitted" : elements.newStatus.value,
    fieldSyncStatus: "Not Sent",
  };
  if (!validateAddSchedulePayload(record)) {
    return;
  }
  try {
    const result = await apiRequest("/schedules", {
      method: "POST",
      body: JSON.stringify(record)
    });
    const savedSchedule = { ...record, ...result.schedule };
    replaceSchedule(savedSchedule);
    setDashboardDate(savedSchedule.date);
    renderScheduleFilterOptions();
    clearScheduleFilters();
    renderSelectedDate();
    showSection("dailySchedule", session.role === "Sales" ? "My Schedule" : "Daily Schedule");
    showToast(`${savedSchedule.psNo} schedule saved successfully.`);
    await refreshNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

function normalizeRequestedTime(value) {
  const text = String(value || "").trim();
  if (text === tbaValue) {
    return text;
  }
  if (text === anytimeRequestedTime) {
    return text;
  }
  return /^\d{2}:\d{2}/.test(text) ? text.slice(0, 5) : text;
}

function scheduleTimeSortValue(value) {
  const time = normalizeRequestedTime(value);
  if (time === tbaValue) {
    return "99:99";
  }
  return time === anytimeRequestedTime ? "10:00" : time;
}

function normalizeScheduleType(value) {
  const legacyTypeMap = {
    Technical: "Technician Onsite",
    Onsite: "Engineer Onsite",
    "Delivery + Onsite": "Delivery + Technician Onsite"
  };
  return legacyTypeMap[value] || value || "Delivery";
}

function normalizeAssignedRole(value) {
  return value === "Warehouse" ? "All Team" : value;
}

function getScheduleAssignmentPayload(roleElement, personElement) {
  const assignedRole = roleElement.value || "All Team";
  const assignedPerson = getSelectedMultiValues(personElement).join(", ") || "Unassigned";
  return { assignedRole, assignedPerson };
}

function normalizeScheduleRecord(record) {
  return {
    ...record,
    date: record.date || tbaValue,
    requestedTime: normalizeRequestedTime(record.requestedTime),
    type: normalizeScheduleType(record.type),
    assignedRole: normalizeAssignedRole(record.assignedRole) || "-",
    assignedPerson: record.assignedPerson || "-",
    pic: record.pic || "-",
    contactNumber: record.contactNumber || "-",
    priority: record.priority || "Normal",
    fieldSyncStatus: record.fieldSyncStatus || "Not Sent"
  };
}

function formatTime(value) {
  const normalized = normalizeRequestedTime(value);
  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    return normalized || "-";
  }
  const [hours, minutes] = normalized.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

function formatContactNumber(value) {
  return value && !["-", "Nil"].includes(value) ? value : "Nil";
}

function bindActions() {
  elements.notificationButton.addEventListener("click", toggleNotificationPanel);
  elements.notificationList.addEventListener("click", handleNotificationAction);
  elements.notificationList.addEventListener("keydown", handleNotificationKeydown);
  elements.clearNotifications.addEventListener("click", clearAllNotifications);
  elements.markAllNotificationsRead.addEventListener("click", markAllNotificationsRead);
  elements.recentUpdatesList.addEventListener("click", handleRecentUpdateOpen);
  elements.viewAllUpdates.addEventListener("click", (event) => {
    event.stopPropagation();
    elements.notificationPanel.classList.remove("hidden");
    elements.notificationButton.setAttribute("aria-expanded", "true");
  });
  elements.markAllUpdatesRead.addEventListener("click", markAllNotificationsRead);
  elements.accountMenuButton.addEventListener("click", toggleAccountDropdown);
  elements.myProfileAction.addEventListener("click", () => {
    closeAccountDropdown();
    showToast(`${session.username} - ${session.role}`);
  });
  elements.changePasswordAction.addEventListener("click", openChangePasswordModal);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".notification-center")) {
      closeNotificationPanel();
    }
    if (!event.target.closest(".account-menu")) {
      closeAccountDropdown();
    }
  });
  elements.scheduleDate.addEventListener("change", () => {
    if (!elements.scheduleDate.value) {
      setDashboardDate(localDateString(new Date()));
    } else {
      setDashboardDate(elements.scheduleDate.value);
    }
    scheduleQuickFilter = "";
    updateScheduleQuickButtons();
    renderSelectedDate();
    persistAppData();
  });
  elements.previousDay.addEventListener("click", () => changeSelectedDay(-1));
  elements.nextDay.addEventListener("click", () => changeSelectedDay(1));
  elements.selectTbaDate.addEventListener("click", () => {
    scheduleQuickFilter = tbaValue;
    setDashboardDate(tbaValue);
    updateScheduleQuickButtons();
    renderSelectedDate();
    persistAppData();
  });
  elements.menuToggle.addEventListener("click", toggleSidebar);
  elements.sidebarBackdrop.addEventListener("click", closeSidebar);
  elements.clearLaunchDataHeaderButton.addEventListener("click", clearLaunchData);
  elements.addScheduleButton.addEventListener("click", () => showSection("addSchedule", "Add Schedule"));
  elements.metricCards.addEventListener("click", (event) => {
    const card = event.target.closest("[data-filter]");
    if (card) {
      applyPreviewFilter(card.dataset.filter);
    }
  });
  elements.metricCards.addEventListener("keydown", (event) => {
    const card = event.target.closest("[data-filter]");
    if (card && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      applyPreviewFilter(card.dataset.filter);
    }
  });
  elements.clearPreviewFilter.addEventListener("click", () => applyPreviewFilter("all"));
  elements.scheduleSearch.addEventListener("input", () => {
    renderSchedule();
    persistAppData();
  });
  [elements.scheduleTypeFilter, elements.assignedRoleFilter, elements.inputByFilter, elements.scheduleSort]
    .forEach((control) => control.addEventListener("change", () => {
      renderSchedule();
      persistAppData();
    }));
  elements.scheduleStatusFilter.addEventListener("change", () => {
    scheduleQuickFilter = "";
    updateScheduleQuickButtons();
    renderSchedule();
    persistAppData();
  });
  elements.scheduleQuickFilters.forEach((button) => {
    button.addEventListener("click", () => applyScheduleQuickFilter(button.dataset.scheduleQuick));
  });
  elements.clearScheduleFilters.addEventListener("click", clearScheduleFilters);
  elements.scheduleViewButtons.forEach((button) => {
    button.addEventListener("click", () => setScheduleView(button.dataset.scheduleView));
  });
  elements.printDailySchedule.addEventListener("click", printSelectedDateSchedule);
  elements.exportScheduleCsv.addEventListener("click", exportFilteredScheduleCsv);
  elements.exportSchedulePdf.addEventListener("click", () => showToast("PDF export will be added later."));
  elements.addScheduleForm.addEventListener("submit", saveNewSchedule);
  elements.clearAddScheduleForm.addEventListener("click", prepareAddScheduleForm);
  elements.newAssignedRole.addEventListener("change", renderAssignedPersonOptions);
  elements.editAssignedRole.addEventListener("change", () => renderEditAssignedPersonOptions());
  elements.newAssignedPersonButton.addEventListener("click", () => toggleMultiSelectPanel(elements.newAssignedPerson));
  elements.editAssignedPersonButton.addEventListener("click", () => toggleMultiSelectPanel(elements.editAssignedPerson));
  document.addEventListener("click", (event) => {
    if (event.target.closest(".multi-select")) {
      return;
    }
    document.querySelectorAll(".multi-select-panel").forEach((panel) => panel.classList.add("hidden"));
    document.querySelectorAll(".multi-select-button").forEach((button) => button.setAttribute("aria-expanded", "false"));
  });
  elements.newScheduleDateTba.addEventListener("change", () => setTbaDateControl(elements.newScheduleDate, elements.newScheduleDateTba, elements.newScheduleDateTba.checked));
  elements.editScheduleDateTba.addEventListener("change", () => setTbaDateControl(elements.editScheduleDate, elements.editScheduleDateTba, elements.editScheduleDateTba.checked));
  elements.carryForwardDateTba.addEventListener("change", () => setTbaDateControl(elements.carryForwardDate, elements.carryForwardDateTba, elements.carryForwardDateTba.checked));
  elements.newContactNumberNil.addEventListener("change", () => {
    setNilContactControl(elements.newContactNumber, elements.newContactNumberNil, elements.newContactNumberNil.checked, true);
    if (elements.newContactNumberNil.checked) {
      elements.newContactNumber.classList.remove("invalid-field");
      elements.addScheduleForm.querySelector('[data-error-for="contactNumber"]').textContent = "";
      if (!elements.addScheduleForm.querySelector(".invalid-field")) {
        elements.addScheduleErrorSummary.classList.add("hidden");
      }
    }
  });
  elements.editContactNumberNil.addEventListener("change", () => {
    setNilContactControl(elements.editContactNumber, elements.editContactNumberNil, elements.editContactNumberNil.checked);
  });
  elements.newScheduleType.addEventListener("change", updateTypeShortcuts);
  elements.typeShortcuts.forEach((button) => {
    button.addEventListener("click", () => selectScheduleType(button.dataset.typeShortcut));
  });
  elements.addScheduleForm.addEventListener("input", (event) => {
    const field = event.target.closest("[name]");
    if (!field || !field.value.trim()) {
      return;
    }
    field.classList.remove("invalid-field");
    const message = elements.addScheduleForm.querySelector(`[data-error-for="${field.name}"]`);
    if (message) {
      message.textContent = "";
    }
    if (!elements.addScheduleForm.querySelector(".invalid-field")) {
      elements.addScheduleErrorSummary.classList.add("hidden");
    }
  });
  elements.scheduleRows.addEventListener("click", (event) => {
    const row = event.target.closest(".schedule-row");
    if (row) {
      openScheduleDetails(row.dataset.scheduleId);
    }
  });
  elements.scheduleRows.addEventListener("keydown", (event) => {
    const row = event.target.closest(".schedule-row");
    if (row && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      openScheduleDetails(row.dataset.scheduleId);
    }
  });
  elements.timelineRows.addEventListener("click", (event) => {
    const card = event.target.closest(".timeline-card");
    if (card) {
      openScheduleDetails(card.dataset.scheduleId);
    }
  });
  elements.previewRows.addEventListener("click", (event) => {
    const row = event.target.closest(".schedule-row");
    if (row) {
      openScheduleDetails(row.dataset.scheduleId);
    }
  });
  elements.previewRows.addEventListener("keydown", (event) => {
    const row = event.target.closest(".schedule-row");
    if (row && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      openScheduleDetails(row.dataset.scheduleId);
    }
  });
  elements.sidebarNav.addEventListener("click", (event) => {
    const link = event.target.closest("[data-section]");
    if (!link) {
      return;
    }
    event.preventDefault();
    closeSidebar();
    if (link.dataset.section === "dailySchedule") {
      showSection("dailySchedule", link.dataset.label);
      return;
    }
    showSection(link.dataset.section, link.dataset.label);
  });
  elements.userRows.addEventListener("click", handleUserAction);
  elements.editUserForm.addEventListener("submit", saveEditedUser);
  elements.cancelEditUser.addEventListener("click", closeUserEditor);
  elements.resetPasswordForm.addEventListener("submit", saveResetPassword);
  elements.cancelResetPassword.addEventListener("click", closeResetPasswordModal);
  elements.closeResetPasswordIcon.addEventListener("click", closeResetPasswordModal);
  [elements.newUserPassword, elements.confirmNewUserPassword].forEach((field) => {
    field.addEventListener("input", clearResetPasswordErrors);
  });
  elements.resetPasswordModal.addEventListener("click", (event) => {
    if (event.target === elements.resetPasswordModal) {
      closeResetPasswordModal();
    }
  });
  elements.changePasswordForm.addEventListener("submit", saveChangedPassword);
  elements.cancelChangePassword.addEventListener("click", closeChangePasswordModal);
  elements.closeChangePasswordIcon.addEventListener("click", closeChangePasswordModal);
  [elements.currentUserPassword, elements.changedUserPassword, elements.confirmChangedUserPassword]
    .forEach((field) => field.addEventListener("input", clearChangePasswordErrors));
  elements.changePasswordModal.addEventListener("click", (event) => {
    if (event.target === elements.changePasswordModal) {
      closeChangePasswordModal();
    }
  });
  elements.deleteUserForm.addEventListener("submit", confirmDeleteUser);
  elements.cancelDeleteUser.addEventListener("click", closeDeleteUserModal);
  elements.closeDeleteUserIcon.addEventListener("click", closeDeleteUserModal);
  elements.deleteUserModal.addEventListener("click", (event) => {
    if (event.target === elements.deleteUserModal) {
      closeDeleteUserModal();
    }
  });
  elements.permissionRows.addEventListener("click", handlePermissionAction);
  elements.rolePermissionForm.addEventListener("submit", saveRolePermissions);
  elements.cancelRoleEdit.addEventListener("click", closeRoleEditor);
  elements.overrideRows.addEventListener("click", handleOverrideAction);
  elements.overrideForm.addEventListener("submit", saveOverride);
  elements.cancelOverrideEdit.addEventListener("click", closeOverrideEditor);
  elements.testingChecklistRows.addEventListener("input", handleChecklistInput);
  elements.testingChecklistRows.addEventListener("change", handleChecklistStatusChange);
  elements.companyProfileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("Company profile storage requires a database settings table.");
  });
  elements.workingHoursForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("Working hours storage requires a database settings table.");
  });
  elements.autoMailForm.addEventListener("submit", saveAutoMailSettings);
  elements.testAutoMailButton.addEventListener("click", requestAutoMailTest);
  elements.addScheduleType.addEventListener("click", () => addSetting("type"));
  elements.addStatusSetting.addEventListener("click", () => addSetting("status"));
  elements.exportDataButton.addEventListener("click", () => {
    showToast("Data export will be enabled once backend storage is connected.");
  });
  elements.auditLogButton.addEventListener("click", () => {
    showToast("Audit log history will be available with backend tracking.");
  });
  elements.editScheduleDetail.addEventListener("click", openScheduleEditor);
  elements.scheduleEditForm.addEventListener("submit", saveScheduleChanges);
  elements.cancelScheduleEdit.addEventListener("click", closeDetailWorkflows);
  elements.sendToFieldPlatform.addEventListener("click", sendSelectedScheduleToFieldPlatform);
  elements.updateScheduleStatus.addEventListener("click", () => openStatusEditor());
  elements.carryForwardSchedule.addEventListener("click", openCarryForwardModal);
  elements.statusUpdateForm.addEventListener("submit", saveScheduleStatus);
  elements.cancelStatusUpdate.addEventListener("click", closeDetailWorkflows);
  elements.carryForwardForm.addEventListener("submit", saveCarryForwardSchedule);
  elements.cancelCarryForward.addEventListener("click", closeCarryForwardModal);
  elements.closeCarryForwardIcon.addEventListener("click", closeCarryForwardModal);
  elements.carryForwardModal.addEventListener("click", (event) => {
    if (event.target === elements.carryForwardModal) {
      closeCarryForwardModal();
    }
  });
  elements.printScheduleDetails.addEventListener("click", printSelectedScheduleDetails);
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("printing-schedule-details", "printing-daily-schedule");
  });
  elements.closeScheduleDetails.addEventListener("click", closeScheduleDetails);
  elements.closeDetailsIcon.addEventListener("click", closeScheduleDetails);
  elements.scheduleDetailsModal.addEventListener("click", (event) => {
    if (event.target === elements.scheduleDetailsModal) {
      closeScheduleDetails();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.deleteUserModal.classList.contains("hidden")) {
      closeDeleteUserModal();
      return;
    }
    if (event.key === "Escape" && !elements.changePasswordModal.classList.contains("hidden")) {
      closeChangePasswordModal();
      return;
    }
    if (event.key === "Escape" && !elements.resetPasswordModal.classList.contains("hidden")) {
      closeResetPasswordModal();
      return;
    }
    if (event.key === "Escape" && !elements.carryForwardModal.classList.contains("hidden")) {
      closeCarryForwardModal();
      return;
    }
    if (event.key === "Escape" && !elements.scheduleDetailsModal.classList.contains("hidden")) {
      closeScheduleDetails();
    }
    if (event.key === "Escape") {
      closeAccountDropdown();
    }
  });
  [elements.logoutLink, elements.accountLogoutLink]
    .forEach((link) => link.addEventListener("click", () => localStorage.removeItem(SESSION_KEY)));
}

function addSetting(category) {
  const label = category === "type" ? "Schedule type" : "Schedule status";
  showToast(`${label} configuration requires a database settings table.`);
}

function handlePermissionAction(event) {
  const button = event.target.closest("[data-access-action='edit-role']");
  if (!button || session.role !== "Admin") {
    return;
  }
  openRoleEditor(button.dataset.accessValue);
}

function handleOverrideAction(event) {
  const button = event.target.closest("[data-access-action]");
  if (!button || session.role !== "Admin") {
    return;
  }
  const override = userOverrides.find((entry) => entry.id === button.dataset.accessValue);
  if (!override) {
    return;
  }
  if (button.dataset.accessAction === "edit-override") {
    openOverrideEditor(override.id);
    return;
  }
  if (!window.confirm(`Remove permission override for "${override.username}"?`)) {
    return;
  }
  closeOverrideEditor();
  showToast("User permission overrides require a database table before they can be changed.");
}

async function handleUserAction(event) {
  const button = event.target.closest("[data-user-action]");
  if (!button || session.role !== "Admin") {
    return;
  }
  const user = dummyUsers.find((entry) => entry.id === button.dataset.userId);
  if (!user) {
    return;
  }

  switch (button.dataset.userAction) {
    case "edit-user":
      openUserEditor(user);
      break;
    case "reset-password":
      openResetPasswordModal(user);
      break;
    case "approve-user":
      try {
        const result = await apiRequest(`/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "Active" })
        });
        Object.assign(user, result.user);
        renderUsers();
        showToast(`${user.username} approved and can now log in.`);
      } catch (error) {
        showToast(error.message);
      }
      break;
    case "toggle-user-status":
      try {
        const status = user.status === "Active" ? "Inactive" : "Active";
        const result = await apiRequest(`/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status })
        });
        Object.assign(user, result.user);
        renderUsers();
        showToast(`${user.username} is now ${user.status}.`);
      } catch (error) {
        showToast(error.message);
      }
      break;
    case "delete-user":
      openDeleteUserModal(user);
      break;
    default:
      break;
  }
}

function openUserEditor(user) {
  elements.editUserId.value = user.id;
  elements.editUsername.value = user.username;
  elements.editRole.value = user.role;
  elements.editUserPanel.classList.remove("hidden");
  elements.editUsername.focus();
}

function closeUserEditor() {
  elements.editUserForm.reset();
  elements.editUserId.value = "";
  elements.editUserPanel.classList.add("hidden");
}

function openResetPasswordModal(user) {
  if (session.role !== "Admin") {
    return;
  }
  elements.resetPasswordForm.reset();
  clearResetPasswordErrors();
  elements.resetPasswordUserId.value = user.id;
  elements.resetPasswordUsername.textContent = user.username;
  elements.resetPasswordModal.classList.remove("hidden");
  elements.resetPasswordModal.setAttribute("aria-hidden", "false");
  elements.newUserPassword.focus();
}

function closeResetPasswordModal() {
  elements.resetPasswordForm.reset();
  elements.resetPasswordUserId.value = "";
  clearResetPasswordErrors();
  elements.resetPasswordModal.classList.add("hidden");
  elements.resetPasswordModal.setAttribute("aria-hidden", "true");
}

function openDeleteUserModal(user) {
  if (session.role !== "Admin") {
    return;
  }
  const isCurrentAdmin = user.role === "Admin"
    && user.username.toLowerCase() === session.username.toLowerCase();
  if (isCurrentAdmin) {
    showToast("You cannot delete the currently logged-in Admin account.");
    return;
  }
  elements.deleteUserId.value = user.id;
  elements.deleteUsername.textContent = user.username;
  elements.deleteUserModal.classList.remove("hidden");
  elements.deleteUserModal.setAttribute("aria-hidden", "false");
  elements.cancelDeleteUser.focus();
}

function closeDeleteUserModal() {
  elements.deleteUserForm.reset();
  elements.deleteUserId.value = "";
  elements.deleteUsername.textContent = "";
  elements.deleteUserModal.classList.add("hidden");
  elements.deleteUserModal.setAttribute("aria-hidden", "true");
}

function confirmDeleteUser(event) {
  event.preventDefault();
  if (session.role !== "Admin") {
    return;
  }
  const user = dummyUsers.find((entry) => entry.id === elements.deleteUserId.value);
  if (!user) {
    closeDeleteUserModal();
    showToast("Unable to find the selected user.");
    return;
  }
  const isCurrentAdmin = user.role === "Admin"
    && user.username.toLowerCase() === session.username.toLowerCase();
  if (isCurrentAdmin) {
    closeDeleteUserModal();
    showToast("You cannot delete the currently logged-in Admin account.");
    return;
  }

  // Deleted users are removed locally; inactive users remain and continue reserving their username.
  // Later database deletion should remove the row or use deleted_at with uniqueness excluding deleted users.
  dummyUsers = dummyUsers.filter((entry) => entry.id !== user.id);
  rememberDeletedUsername(user.username);
  persistUsers();
  closeUserEditor();
  closeResetPasswordModal();
  closeDeleteUserModal();
  renderUsers();
  showToast(`${user.username} has been deleted.`);
}

function rememberDeletedUsername(username) {
  let deletedUsernames = [];
  try {
    deletedUsernames = JSON.parse(localStorage.getItem(DELETED_USERNAMES_KEY) || "[]");
  } catch (error) {
    deletedUsernames = [];
  }
  const normalizedName = username.toLowerCase();
  if (!deletedUsernames.includes(normalizedName)) {
    deletedUsernames.push(normalizedName);
    localStorage.setItem(DELETED_USERNAMES_KEY, JSON.stringify(deletedUsernames));
  }
}

function clearResetPasswordErrors() {
  elements.newUserPassword.classList.remove("invalid-field");
  elements.confirmNewUserPassword.classList.remove("invalid-field");
  elements.newUserPasswordError.textContent = "";
  elements.confirmNewUserPasswordError.textContent = "";
}

function saveResetPassword(event) {
  event.preventDefault();
  if (session.role !== "Admin") {
    return;
  }
  clearResetPasswordErrors();
  const newPassword = elements.newUserPassword.value;
  const confirmedPassword = elements.confirmNewUserPassword.value;
  let valid = true;

  if (!newPassword.trim()) {
    elements.newUserPassword.classList.add("invalid-field");
    elements.newUserPasswordError.textContent = "New password is required.";
    valid = false;
  }
  if (!confirmedPassword.trim()) {
    elements.confirmNewUserPassword.classList.add("invalid-field");
    elements.confirmNewUserPasswordError.textContent = "Please confirm the new password.";
    valid = false;
  } else if (newPassword !== confirmedPassword) {
    elements.confirmNewUserPassword.classList.add("invalid-field");
    elements.confirmNewUserPasswordError.textContent = "Passwords do not match.";
    valid = false;
  }
  if (!valid) {
    return;
  }

  const user = dummyUsers.find((entry) => entry.id === elements.resetPasswordUserId.value);
  if (!user) {
    closeResetPasswordModal();
    showToast("Unable to find the selected user.");
    return;
  }

  // Backend later must hash password before saving to database.
  user.password = newPassword;
  persistUsers();
  closeResetPasswordModal();
  showToast(`Password reset successfully for ${user.username}.`);
}

function openChangePasswordModal() {
  closeAccountDropdown();
  elements.changePasswordForm.reset();
  clearChangePasswordErrors();
  elements.changePasswordModal.classList.remove("hidden");
  elements.changePasswordModal.setAttribute("aria-hidden", "false");
  elements.currentUserPassword.focus();
}

function closeChangePasswordModal() {
  elements.changePasswordForm.reset();
  clearChangePasswordErrors();
  elements.changePasswordModal.classList.add("hidden");
  elements.changePasswordModal.setAttribute("aria-hidden", "true");
}

function clearChangePasswordErrors() {
  [
    elements.currentUserPassword,
    elements.changedUserPassword,
    elements.confirmChangedUserPassword
  ].forEach((field) => field.classList.remove("invalid-field"));
  elements.currentUserPasswordError.textContent = "";
  elements.changedUserPasswordError.textContent = "";
  elements.confirmChangedUserPasswordError.textContent = "";
}

function saveChangedPassword(event) {
  event.preventDefault();
  clearChangePasswordErrors();
  const currentPassword = elements.currentUserPassword.value;
  const newPassword = elements.changedUserPassword.value;
  const confirmedPassword = elements.confirmChangedUserPassword.value;
  let valid = true;

  if (!currentPassword.trim()) {
    elements.currentUserPassword.classList.add("invalid-field");
    elements.currentUserPasswordError.textContent = "Current password is required.";
    valid = false;
  }
  if (!newPassword.trim()) {
    elements.changedUserPassword.classList.add("invalid-field");
    elements.changedUserPasswordError.textContent = "New password is required.";
    valid = false;
  }
  if (!confirmedPassword.trim()) {
    elements.confirmChangedUserPassword.classList.add("invalid-field");
    elements.confirmChangedUserPasswordError.textContent = "Please confirm the new password.";
    valid = false;
  } else if (newPassword !== confirmedPassword) {
    elements.confirmChangedUserPassword.classList.add("invalid-field");
    elements.confirmChangedUserPasswordError.textContent = "Passwords do not match.";
    valid = false;
  }
  if (!valid) {
    return;
  }

  let user = dummyUsers.find((entry) => entry.username.toLowerCase() === session.username.toLowerCase());
  if (!user) {
    user = {
      id: `USR-${Date.now()}`,
      username: session.username,
      role: session.role,
      status: "Active",
      createdDate: localDateString(new Date())
    };
    dummyUsers.push(user);
  }

  // Backend later must verify current password and hash new password before saving.
  user.password = newPassword;
  persistUsers();
  closeChangePasswordModal();
  showToast("Your password has been updated successfully.");
}

async function saveEditedUser(event) {
  event.preventDefault();
  const user = dummyUsers.find((entry) => entry.id === elements.editUserId.value);
  if (!user) {
    return;
  }
  try {
    const result = await apiRequest(`/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        username: elements.editUsername.value.trim(),
        role: elements.editRole.value
      })
    });
    Object.assign(user, result.user);
    renderUsers();
    closeUserEditor();
    showToast("User account details updated.");
  } catch (error) {
    showToast(error.message);
  }
}

function changeSelectedDay(offset) {
  const date = getSelectedDateValue() === tbaValue ? new Date() : parseDate(elements.scheduleDate.value);
  date.setDate(date.getDate() + offset);
  setDashboardDate(localDateString(date));
  scheduleQuickFilter = "";
  updateScheduleQuickButtons();
  renderSelectedDate();
  persistAppData();
}

function renderSelectedDate() {
  renderDateHeading();
  renderMetrics();
  renderDashboardPreview();
  renderSchedule();
  if (currentSection === "autoMail") {
    renderAutoMailPreview();
  }
}

function toggleSidebar() {
  const open = elements.sidebar.classList.toggle("open");
  elements.sidebarBackdrop.classList.toggle("open", open);
  elements.menuToggle.setAttribute("aria-expanded", String(open));
}

function closeSidebar() {
  elements.sidebar.classList.remove("open");
  elements.sidebarBackdrop.classList.remove("open");
  elements.menuToggle.setAttribute("aria-expanded", "false");
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.dashboardToast.textContent = message;
  elements.dashboardToast.classList.add("visible");
  toastTimer = setTimeout(() => elements.dashboardToast.classList.remove("visible"), 3000);
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultAppData(users = defaultAppData.users) {
  const database = cloneData(defaultAppData);
  database.users = cloneData(users);
  return database;
}

function loadAppData() {
  let storedDatabase;
  try {
    localStorage.removeItem(LEGACY_APP_DATA_KEY);
    storedDatabase = JSON.parse(localStorage.getItem(APP_DATA_KEY) || "null");
  } catch (error) {
    storedDatabase = null;
  }
  if (!storedDatabase || !Array.isArray(storedDatabase.schedules)) {
    storedDatabase = createDefaultAppData();
  }
  dummyUsers = cloneData(storedDatabase.users || defaultAppData.users);
  scheduleRecords.splice(
    0,
    scheduleRecords.length,
    ...cloneData(defaultAppData.schedules).map(normalizeScheduleRecord)
  );
  notifications = cloneData(defaultAppData.notifications);
  activityLogs = [];
  rolePermissions.splice(
    0,
    rolePermissions.length,
    ...cloneData(storedDatabase.rolePermissions || defaultAppData.rolePermissions)
  );
  userOverrides = cloneData(defaultAppData.userOverrides);
  testingChecklist = cloneData(defaultAppData.testingChecklist);
  scheduleTypes = [...new Set([...defaultScheduleTypes, ...(storedDatabase.settings?.scheduleTypes || [])])];
  scheduleStatuses = [...new Set([...defaultScheduleStatuses, ...(storedDatabase.settings?.scheduleStatuses || [])])];
  autoMailSettings = normalizeAutoMailSettings(storedDatabase.settings?.autoMail || {});
  uiState = cloneData(storedDatabase.uiState || defaultAppData.uiState);
  localStorage.setItem(APP_DATA_KEY, JSON.stringify({
    users: dummyUsers,
    schedules: scheduleRecords,
    notifications,
    activityLogs,
    rolePermissions,
    userOverrides,
    testingChecklist,
    settings: {
      scheduleTypes,
      scheduleStatuses,
      autoMail: autoMailSettings
    },
    uiState
  }));
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(dummyUsers));
}

function captureUiState() {
  if (!elements.scheduleDate) {
    return;
  }
  uiState = {
    selectedDate: getSelectedDateValue() || localDateString(new Date()),
    previewFilter,
    scheduleQuickFilter,
    scheduleView,
    filters: {
      search: elements.scheduleSearch.value,
      type: elements.scheduleTypeFilter.value,
      status: elements.scheduleStatusFilter.value,
      assignedRole: elements.assignedRoleFilter.value,
      inputBy: elements.inputByFilter.value,
      sort: elements.scheduleSort.value
    }
  };
}

function persistAppData() {
  captureUiState();
  const database = {
    users: dummyUsers,
    schedules: scheduleRecords,
    notifications,
    activityLogs,
    rolePermissions,
    userOverrides,
    testingChecklist,
    settings: {
      scheduleTypes,
      scheduleStatuses,
      autoMail: autoMailSettings
    },
    uiState
  };
  localStorage.setItem(APP_DATA_KEY, JSON.stringify(database));
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(dummyUsers));
}

function addActivityLog(action, message) {
  activityLogs.unshift({
    id: `LOG-${Date.now()}`,
    action,
    message,
    performedBy: session?.username || "System",
    performedAt: formatAuditTimestamp()
  });
}

function resetLocalData() {
  if (!window.confirm("Reset local records and saved filters to their default values?")) {
    return;
  }
  const database = createDefaultAppData();
  localStorage.setItem(APP_DATA_KEY, JSON.stringify(database));
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(database.users));
  loadAppData();
  closeScheduleDetails();
  closeCarryForwardModal();
  setDashboardDate(uiState.selectedDate);
  renderScheduleFilterOptions();
  restoreUiState();
  updateScheduleQuickButtons();
  renderMetrics();
  renderDashboardPreview();
  renderSchedule();
  renderUsers();
  renderPermissions();
  renderOverrides();
  renderSystemSettings();
  renderTestingChecklist();
  renderNotifications();
  showToast("Local data reset to default records.");
}

async function clearLaunchData() {
  if (!window.confirm("Clear all schedules, notifications, activity logs, and non-current users? This cannot be undone.")) {
    return;
  }
  try {
    await apiRequest("/admin/launch-data", { method: "DELETE" });
    scheduleRecords.splice(0, scheduleRecords.length);
    notifications = [];
    activityLogs = [];
    const currentAccountRemoved = session.role !== "Admin";
    dummyUsers = dummyUsers.filter((user) => user.role === "Admin");
    persistAppData();
    closeScheduleDetails();
    closeCarryForwardModal();
    renderScheduleFilterOptions();
    clearScheduleFilters();
    renderSelectedDate();
    renderUsers();
    renderNotifications();
    showToast("All records cleared. Only the current Admin account remains.");
    if (currentAccountRemoved) {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = "index.html";
    }
  } catch (error) {
    showToast(error.message);
  }
}

function loadSession() {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
    if (stored.token && stored.username && roleMenus[stored.role]) {
      return stored;
    }
  } catch (error) {
    return null;
  }
  return null;
}

function loadUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || "[]");
    if (Array.isArray(stored) && stored.length) {
      return stored;
    }
  } catch (error) {
    // Return the baseline account list when stored data is invalid.
  }
  return defaultUsers.map((user) => ({ ...user }));
}

function persistUsers() {
  persistAppData();
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

