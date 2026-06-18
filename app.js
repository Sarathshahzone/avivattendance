// State Management
let students = [];
let attendanceRecords = {};

// Active markings state for the current attendance session
let currentMarkingSheet = {}; 

// Modal control state
let editingStudentId = null;

// Calendar Report state
let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();
let selectedCalendarDate = new Date();

// Google Sheets Integration Settings
let sheetUrl = localStorage.getItem('attendance_app_sheet_url') || '';

// DOM Elements
const views = {
  login: document.getElementById('view-login'),
  home: document.getElementById('view-home'),
  editStudentList: document.getElementById('view-edit-student-list'),
  markAttendance: document.getElementById('view-mark-attendance'),
  studentDetails: document.getElementById('view-student-details'),
  calendar: document.getElementById('view-calendar')
};

const studentListEl = document.getElementById('student-list');
const emptyStateEl = document.getElementById('empty-state');
const searchInputEl = document.getElementById('search-student');

const btnMenuToggle = document.getElementById('btn-menu-toggle');
const dropdownMenu = document.getElementById('dropdown-menu');
const menuOptAdd = document.getElementById('menu-opt-add');
const menuOptEditList = document.getElementById('menu-opt-edit-list');
const menuOptCalendar = document.getElementById('menu-opt-calendar');
const menuOptSync = document.getElementById('menu-opt-sync');
const btnBackFromEditList = document.getElementById('btn-back-from-edit-list');
const editStudentListEl = document.getElementById('edit-student-list');

const btnOpenMarkAttendance = document.getElementById('btn-open-mark-attendance');
const btnBackFromMark = document.getElementById('btn-back-from-mark');
const btnBackFromDetails = document.getElementById('btn-back-from-details');

const btnBackFromCalendar = document.getElementById('btn-back-from-calendar');
const calendarMonthYearEl = document.getElementById('calendar-month-year');
const calendarDaysGridEl = document.getElementById('calendar-days-grid');
const btnCalendarPrev = document.getElementById('btn-calendar-prev');
const btnCalendarNext = document.getElementById('btn-calendar-next');
const calendarSelectedDateText = document.getElementById('calendar-selected-date-text');
const calendarPresentCount = document.getElementById('calendar-present-count');
const calendarAbsentCount = document.getElementById('calendar-absent-count');
const calendarPresentListEl = document.getElementById('calendar-present-list');
const calendarAbsentListEl = document.getElementById('calendar-absent-list');

const studentModal = document.getElementById('student-modal');
const studentForm = document.getElementById('student-form');
const studentNameInput = document.getElementById('student-name-input');
const modalTitleEl = document.getElementById('modal-title');
const modalErrorMessage = document.getElementById('modal-error-message');
const btnModalCancel = document.getElementById('btn-modal-cancel');

const syncStatusBadge = document.getElementById('sync-status-badge');
const syncModal = document.getElementById('sync-modal');
const syncForm = document.getElementById('sync-form');
const sheetUrlInput = document.getElementById('sheet-url-input');
const btnSyncDisconnect = document.getElementById('btn-sync-disconnect');
const btnSyncCancel = document.getElementById('btn-sync-cancel');

const loadingOverlay = document.getElementById('loading-overlay');
const loadingMessage = document.getElementById('loading-message');

const attendanceDateInput = document.getElementById('attendance-date');
const attendanceSheetListEl = document.getElementById('attendance-sheet-list');
const btnShortcutPresent = document.getElementById('btn-shortcut-present');
const btnShortcutAbsent = document.getElementById('btn-shortcut-absent');
const btnSubmitAttendance = document.getElementById('btn-submit-attendance');

const detailsStudentNameEl = document.getElementById('details-student-name');
const statAttendanceRateEl = document.getElementById('stat-attendance-rate');
const statPresentCountEl = document.getElementById('stat-present-count');
const statAbsentCountEl = document.getElementById('stat-absent-count');
const detailsHistoryContainer = document.getElementById('details-history-container');

// Local Storage Keys
const LOCAL_STORAGE_STUDENTS_KEY = 'attendance_app_students';
const LOCAL_STORAGE_RECORDS_KEY = 'attendance_app_records';

// Initialize App
function init() {
  loadData();
  setupEventListeners();
  
  // Display today's date on the home screen
  const todayDate = new Date();
  const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
  const todayDateDisplayEl = document.getElementById('today-date-display');
  if (todayDateDisplayEl) {
    todayDateDisplayEl.textContent = todayDate.toLocaleDateString('en-US', options);
  }

  // Set date input default to today
  const today = getLocalDateString(todayDate);
  attendanceDateInput.value = today;
  attendanceDateInput.max = today; // Prevent marking attendance in future

  // Google Sheets integration setup
  updateSyncStatusBadge();
  
  // Auth Check
  const authenticated = localStorage.getItem('attendance_app_authenticated') === 'true';
  if (authenticated) {
    navigateTo('view-home');
    if (sheetUrl) {
      fetchDataFromSheets();
    } else {
      renderStudentList();
    }
  } else {
    navigateTo('view-login');
  }
}

// Format date helper: YYYY-MM-DD local time safe
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse string to date helper
function parseLocalDateString(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Check if a date string represents a Saturday
function isSaturday(dateStr) {
  if (!dateStr) return false;
  const dateObj = parseLocalDateString(dateStr);
  return dateObj.getDay() === 6; // 6 is Saturday
}

// Generate Name Initials
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Load data from LocalStorage or seed with mock data
function loadData() {
  const storedStudents = localStorage.getItem(LOCAL_STORAGE_STUDENTS_KEY);
  const storedRecords = localStorage.getItem(LOCAL_STORAGE_RECORDS_KEY);

  if (storedStudents) {
    students = JSON.parse(storedStudents);
    // Ensure all loaded students have a default course
    students.forEach(student => {
      if (!student.course) student.course = '6 Month';
    });
    students.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Seed default students
    students = [
      { id: 'st-1', name: 'Ethan Hunt', course: '6 Month' },
      { id: 'st-2', name: 'Jane Carter', course: '1 Year' },
      { id: 'st-3', name: 'Marcus Aurelius', course: '4 Month' },
      { id: 'st-4', name: 'Diana Prince', course: '1 Year' },
      { id: 'st-5', name: 'Bruce Wayne', course: '6 Month' },
      { id: 'st-6', name: 'Selina Kyle', course: '4 Month' }
    ];
    students.sort((a, b) => a.name.localeCompare(b.name));
    saveStudents();
  }

  if (storedRecords) {
    attendanceRecords = JSON.parse(storedRecords);
  } else {
    // Seed default historical records for the last 3 days
    attendanceRecords = {};
    const today = new Date();
    for (let i = 1; i <= 3; i++) {
      const historicalDate = new Date();
      historicalDate.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(historicalDate);
      
      attendanceRecords[dateStr] = {};
      students.forEach((student, index) => {
        // Skip 1 Year students on Saturdays in mock records
        if (isSaturday(dateStr) && student.course === '1 Year') {
          return;
        }
        // Randomize attendance: Bruce Wayne is absent sometimes, Marcus Aurelius is always present
        let status = 'present';
        if (student.id === 'st-5' && i === 1) status = 'absent'; // Bruce Wayne absent yesterday
        if (student.id === 'st-6' && i === 2) status = 'absent'; // Selina Kyle absent 2 days ago
        if (index % 4 === 0 && i === 3) status = 'absent'; // Student 0 and 4 absent 3 days ago
        
        attendanceRecords[dateStr][student.id] = status;
      });
    }
    saveRecords();
  }
}

function saveStudents() {
  localStorage.setItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(students));
}

function saveRecords() {
  localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(attendanceRecords));
}

// View Swapping
function navigateTo(viewId) {
  Object.keys(views).forEach(key => {
    if (views[key].id === viewId) {
      views[key].classList.add('active');
    } else {
      views[key].classList.remove('active');
    }
  });
}

// Event Listeners Setup
function setupEventListeners() {
  // Dropdown menu toggles
  btnMenuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dropdownMenu.classList.contains('hidden');
    if (isHidden) {
      dropdownMenu.classList.remove('hidden');
      btnMenuToggle.setAttribute('aria-expanded', 'true');
    } else {
      dropdownMenu.classList.add('hidden');
      btnMenuToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Hide dropdown menu when clicking outside
  document.addEventListener('click', () => {
    dropdownMenu.classList.add('hidden');
    btnMenuToggle.setAttribute('aria-expanded', 'false');
  });

  // Menu item add student click
  menuOptAdd.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.add('hidden');
    btnMenuToggle.setAttribute('aria-expanded', 'false');
    openStudentModal('add');
  });

  // Menu item edit list click
  menuOptEditList.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.add('hidden');
    btnMenuToggle.setAttribute('aria-expanded', 'false');
    renderEditStudentList();
    navigateTo('view-edit-student-list');
  });

  // Menu item calendar click
  menuOptCalendar.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.add('hidden');
    btnMenuToggle.setAttribute('aria-expanded', 'false');
    
    // Default calendar to today
    const today = new Date();
    currentCalendarYear = today.getFullYear();
    currentCalendarMonth = today.getMonth();
    selectedCalendarDate = today;
    
    drawCalendarGrid();
    renderCalendarDayStats();
    navigateTo('view-calendar');
  });

  // Menu item sync settings click
  menuOptSync.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.add('hidden');
    btnMenuToggle.setAttribute('aria-expanded', 'false');
    sheetUrlInput.value = sheetUrl;
    syncModal.classList.remove('hidden');
  });

  // Sync settings modal triggers
  btnSyncCancel.addEventListener('click', () => {
    syncModal.classList.add('hidden');
  });

  btnSyncDisconnect.addEventListener('click', () => {
    if (confirm("Are you sure you want to disconnect from Google Sheets? The app will revert back to offline Local Storage mode.")) {
      sheetUrl = '';
      localStorage.removeItem('attendance_app_sheet_url');
      syncModal.classList.add('hidden');
      updateSyncStatusBadge();
      loadData(); // Reload local mirror/mock cache
      renderStudentList();
    }
  });

  syncForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = sheetUrlInput.value.trim();
    if (!url) {
      alert("Please enter a valid Google Apps Script Web App URL.");
      return;
    }
    
    sheetUrl = url;
    localStorage.setItem('attendance_app_sheet_url', url);
    syncModal.classList.add('hidden');
    fetchDataFromSheets();
  });

  // Back button on Edit List View
  btnBackFromEditList.addEventListener('click', () => {
    renderStudentList();
    navigateTo('view-home');
  });

  // Back button on Calendar View
  btnBackFromCalendar.addEventListener('click', () => {
    renderStudentList();
    navigateTo('view-home');
  });

  // Calendar navigation buttons
  btnCalendarPrev.addEventListener('click', () => {
    currentCalendarMonth--;
    if (currentCalendarMonth < 0) {
      currentCalendarMonth = 11;
      currentCalendarYear--;
    }
    drawCalendarGrid();
  });

  btnCalendarNext.addEventListener('click', () => {
    currentCalendarMonth++;
    if (currentCalendarMonth > 11) {
      currentCalendarMonth = 0;
      currentCalendarYear++;
    }
    drawCalendarGrid();
  });

  // Modal forms
  btnModalCancel.addEventListener('click', closeStudentModal);
  studentForm.addEventListener('submit', handleStudentFormSubmit);

  // Search filter
  searchInputEl.addEventListener('input', renderStudentList);

  // Attendance switches
  btnOpenMarkAttendance.addEventListener('click', () => {
    prepareAttendanceSheet();
    navigateTo('view-mark-attendance');
  });

  btnBackFromMark.addEventListener('click', () => {
    renderStudentList();
    navigateTo('view-home');
  });

  attendanceDateInput.addEventListener('change', () => {
    prepareAttendanceSheet();
  });

  btnShortcutPresent.addEventListener('click', () => applyAllAttendance('present'));
  btnShortcutAbsent.addEventListener('click', () => applyAllAttendance('absent'));
  btnSubmitAttendance.addEventListener('click', saveAttendanceSheet);

  // Details screen back
  btnBackFromDetails.addEventListener('click', () => {
    navigateTo('view-home');
  });

  // Login form submission
  const loginForm = document.getElementById('login-form');
  const loginUsernameInput = document.getElementById('login-username');
  const loginPasswordInput = document.getElementById('login-password');
  const loginErrorMessage = document.getElementById('login-error-message');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = loginUsernameInput.value.trim();
      const password = loginPasswordInput.value;
      
      loginErrorMessage.classList.add('hidden');
      loginUsernameInput.classList.remove('error');
      loginPasswordInput.classList.remove('error');

      if (username === 'aviv123' && password === 'sarathanjo') {
        localStorage.setItem('attendance_app_authenticated', 'true');
        navigateTo('view-home');
        if (sheetUrl) {
          fetchDataFromSheets();
        } else {
          renderStudentList();
        }
      } else {
        loginErrorMessage.textContent = 'Invalid username or password.';
        loginErrorMessage.classList.remove('hidden');
        if (username !== 'aviv123') loginUsernameInput.classList.add('error');
        if (password !== 'sarathanjo') loginPasswordInput.classList.add('error');
      }
    });
  }

  // Logout menu item click
  const menuOptLogout = document.getElementById('menu-opt-logout');
  if (menuOptLogout) {
    menuOptLogout.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.add('hidden');
      btnMenuToggle.setAttribute('aria-expanded', 'false');
      
      if (confirm('Are you sure you want to log out?')) {
        localStorage.removeItem('attendance_app_authenticated');
        if (loginUsernameInput) loginUsernameInput.value = '';
        if (loginPasswordInput) loginPasswordInput.value = '';
        navigateTo('view-login');
      }
    });
  }
}

// Render the main Home list of students
function renderStudentList() {
  const query = searchInputEl.value.trim().toLowerCase();
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(query)
  );

  // Toggle empty states
  if (filteredStudents.length === 0) {
    studentListEl.innerHTML = '';
    emptyStateEl.classList.remove('hidden');
    return;
  }
  
  emptyStateEl.classList.add('hidden');

  // Read today's saved records to show on Home Screen
  const todayStr = getLocalDateString(new Date());
  const todayRecord = attendanceRecords[todayStr];
  const isTodaySaturday = isSaturday(todayStr);

  studentListEl.innerHTML = filteredStudents.map(student => {
    let statusText = '';
    let statusClass = '';

    // If it's Saturday and student is "1 Year", show as "Off Day"
    if (isTodaySaturday && student.course === '1 Year') {
      statusClass = 'off-day';
      statusText = 'Off Day';
    } else {
      const status = (todayRecord && todayRecord[student.id]) ? todayRecord[student.id] : 'absent';
      statusClass = status === 'present' ? 'present' : 'absent';
      statusText = status === 'present' ? 'Present' : 'Absent';
    }

    return `
      <li class="student-card" data-id="${student.id}">
        <div class="student-initials-badge">
          ${getInitials(student.name)}
        </div>
        <div class="student-info" onclick="viewStudentDetails('${student.id}')" style="flex-grow: 1; cursor: pointer; min-width: 0;">
          <div class="student-name">${escapeHTML(student.name)}</div>
        </div>
        <span class="home-status-badge ${statusClass}">
          ${statusText}
        </span>
      </li>
    `;
  }).join('');
}

// Render the management list of students with edit/delete buttons
function renderEditStudentList() {
  const editTitleEl = document.querySelector('#view-edit-student-list .app-title-small');
  if (editTitleEl) {
    editTitleEl.textContent = `Edit Student List (${students.length})`;
  }
  
  if (students.length === 0) {
    editStudentListEl.innerHTML = `
      <li class="empty-state">
        <h3>No students</h3>
        <p>Use the three-dot menu at the top of the home screen to add your first student.</p>
      </li>
    `;
    return;
  }

  editStudentListEl.innerHTML = students.map(student => `
    <li class="student-card" data-id="${student.id}">
      <div class="student-initials-badge">
        ${getInitials(student.name)}
      </div>
      <div class="student-info">
        <div class="student-name">${escapeHTML(student.name)}</div>
      </div>
      <div class="student-card-actions">
        <button class="btn-card-edit" onclick="openStudentModal('edit', '${student.id}')" aria-label="Edit student name">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-card-delete" onclick="deleteStudent('${student.id}')" aria-label="Delete student">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    </li>
  `).join('');
}

// Student Modal Controls
window.openStudentModal = function(action, id = null) {
  modalAction = action;
  editingStudentId = id;
  modalErrorMessage.classList.add('hidden');
  studentNameInput.classList.remove('error');

  if (action === 'add') {
    modalTitleEl.textContent = 'Add Student';
    studentNameInput.value = '';
    document.getElementById('student-course-select').value = '6 Month';
  } else {
    modalTitleEl.textContent = 'Rename/Edit Student';
    const student = students.find(s => s.id === id);
    studentNameInput.value = student ? student.name : '';
    document.getElementById('student-course-select').value = student && student.course ? student.course : '6 Month';
  }

  studentModal.classList.remove('hidden');
  studentNameInput.focus();
};

function closeStudentModal() {
  studentModal.classList.add('hidden');
  studentNameInput.blur();
}

function handleStudentFormSubmit(e) {
  e.preventDefault();
  const name = studentNameInput.value.trim();
  const course = document.getElementById('student-course-select').value;

  if (!name) {
    modalErrorMessage.textContent = 'Name cannot be empty.';
    modalErrorMessage.classList.remove('hidden');
    studentNameInput.classList.add('error');
    return;
  }

  if (modalAction === 'add') {
    const newId = 'st-' + Date.now();
    const dateCreatedStr = getLocalDateString(new Date()) + " " + new Date().toLocaleTimeString();
    
    if (sheetUrl) {
      showLoader("Adding student to Google Sheets...");
      syncActionToSheets("addStudent", { id: newId, name: name, dateCreated: dateCreatedStr, course: course })
        .then(() => {
          students.push({ id: newId, name: name, dateCreated: dateCreatedStr, course: course });
          students.sort((a, b) => a.name.localeCompare(b.name));
          saveStudents();
          closeStudentModal();
          renderStudentList();
          renderEditStudentList();
        })
        .catch(() => {})
        .finally(() => hideLoader());
    } else {
      students.push({ id: newId, name: name, dateCreated: dateCreatedStr, course: course });
      students.sort((a, b) => a.name.localeCompare(b.name));
      saveStudents();
      closeStudentModal();
      renderStudentList();
      renderEditStudentList();
    }
  } else {
    if (sheetUrl) {
      showLoader("Updating student on Google Sheets...");
      syncActionToSheets("editStudent", { id: editingStudentId, name: name, course: course })
        .then(() => {
          const student = students.find(s => s.id === editingStudentId);
          if (student) {
            student.name = name;
            student.course = course;
          }
          students.sort((a, b) => a.name.localeCompare(b.name));
          saveStudents();
          closeStudentModal();
          renderStudentList();
          renderEditStudentList();
        })
        .catch(() => {})
        .finally(() => hideLoader());
    } else {
      const student = students.find(s => s.id === editingStudentId);
      if (student) {
        student.name = name;
        student.course = course;
      }
      students.sort((a, b) => a.name.localeCompare(b.name));
      saveStudents();
      closeStudentModal();
      renderStudentList();
      renderEditStudentList();
    }
  }
}

// Delete Student Flow
window.deleteStudent = function(id) {
  const student = students.find(s => s.id === id);
  if (!student) return;

  if (confirm(`Are you sure you want to remove student "${student.name}"? This will not delete their historical attendance logs.`)) {
    if (sheetUrl) {
      showLoader("Removing student from Google Sheets...");
      syncActionToSheets("deleteStudent", { id: id })
        .then(() => {
          students = students.filter(s => s.id !== id);
          saveStudents();
          renderStudentList();
          renderEditStudentList();
        })
        .catch(() => {})
        .finally(() => hideLoader());
    } else {
      students = students.filter(s => s.id !== id);
      saveStudents();
      renderStudentList();
      renderEditStudentList();
    }
  }
};

// Prepare the attendance marking sheet
function prepareAttendanceSheet() {
  const selectedDate = attendanceDateInput.value;
  const isSelectedDateSaturday = isSaturday(selectedDate);
  currentMarkingSheet = {};

  // Check if historical record exists for date
  const dayRecord = attendanceRecords[selectedDate];

  students.forEach(student => {
    // Skip 1 Year students on Saturdays
    if (isSelectedDateSaturday && student.course === '1 Year') {
      return;
    }
    
    if (dayRecord && dayRecord[student.id]) {
      currentMarkingSheet[student.id] = dayRecord[student.id];
    } else {
      // Default to absent for new attendance checks to match home list default
      currentMarkingSheet[student.id] = 'absent';
    }
  });

  renderAttendanceSheet();
}

// Render student attendance selector checklist
function renderAttendanceSheet() {
  if (students.length === 0) {
    attendanceSheetListEl.innerHTML = `
      <li class="empty-state">
        <p>No students found. Add students first from the home screen.</p>
      </li>
    `;
    return;
  }

  const selectedDate = attendanceDateInput.value;
  const isSelectedDateSaturday = isSaturday(selectedDate);

  const absentList = [];
  const presentList = [];

  students.forEach(student => {
    // Skip 1 Year students on Saturdays
    if (isSelectedDateSaturday && student.course === '1 Year') {
      return;
    }

    const status = currentMarkingSheet[student.id] || 'absent';
    if (status === 'present') {
      presentList.push(student);
    } else {
      absentList.push(student);
    }
  });

  let html = '';

  if (absentList.length > 0) {
    html += `<li class="list-section-title text-danger" style="margin-top: 4px; margin-bottom: 8px; list-style: none;">Absent (${absentList.length})</li>`;
    html += absentList.map(student => renderMarkingCard(student, false)).join('');
  }

  if (presentList.length > 0) {
    html += `<li class="list-section-title text-success" style="margin-top: 16px; margin-bottom: 8px; list-style: none;">Present (${presentList.length})</li>`;
    html += presentList.map(student => renderMarkingCard(student, true)).join('');
  }

  attendanceSheetListEl.innerHTML = html;
}

function renderMarkingCard(student, isPresent) {
  const activeClass = isPresent ? 'present' : 'absent';
  const activeText = isPresent ? 'Present' : 'Absent';
  
  // Status specific checkmark/cross SVGs
  const iconSVG = isPresent 
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  return `
    <li class="attendance-mark-card">
      <div class="attendance-name-wrapper">
        <div class="student-initials-badge">
          ${getInitials(student.name)}
        </div>
        <span class="attendance-mark-name">${escapeHTML(student.name)}</span>
      </div>
      <button class="btn-status-toggle ${activeClass}" onclick="toggleAttendanceStatus('${student.id}')" aria-label="Toggle attendance status for ${escapeHTML(student.name)}">
        ${iconSVG}
        <span>${activeText}</span>
      </button>
    </li>
  `;
}

// Toggle attendance status (present <-> absent)
window.toggleAttendanceStatus = function(studentId) {
  const currentStatus = currentMarkingSheet[studentId];
  const newStatus = currentStatus === 'present' ? 'absent' : 'present';
  currentMarkingSheet[studentId] = newStatus;
  renderAttendanceSheet();
};

// Shortcut buttons
function applyAllAttendance(status) {
  const selectedDate = attendanceDateInput.value;
  const isSelectedDateSaturday = isSaturday(selectedDate);

  students.forEach(student => {
    if (isSelectedDateSaturday && student.course === '1 Year') {
      return;
    }
    currentMarkingSheet[student.id] = status;
  });
  renderAttendanceSheet();
}

// Save active marking sheet to database
function saveAttendanceSheet() {
  const selectedDate = attendanceDateInput.value;
  if (!selectedDate) {
    alert('Please select a valid date.');
    return;
  }

  const isSelectedDateSaturday = isSaturday(selectedDate);
  const dayRecords = {};
  
  students.forEach(student => {
    if (isSelectedDateSaturday && student.course === '1 Year') {
      return;
    }
    dayRecords[student.id] = currentMarkingSheet[student.id] || 'present';
  });

  if (sheetUrl) {
    showLoader("Uploading attendance sheets to Google Sheets...");
    syncActionToSheets("saveAttendance", { date: selectedDate, records: dayRecords })
      .then(() => {
        if (!attendanceRecords[selectedDate]) {
          attendanceRecords[selectedDate] = {};
        }
        students.forEach(student => {
          if (isSelectedDateSaturday && student.course === '1 Year') {
            return;
          }
          attendanceRecords[selectedDate][student.id] = dayRecords[student.id];
        });
        saveRecords();
        triggerSuccessFeedback();
      })
      .catch(() => {})
      .finally(() => hideLoader());
  } else {
    if (!attendanceRecords[selectedDate]) {
      attendanceRecords[selectedDate] = {};
    }
    students.forEach(student => {
      if (isSelectedDateSaturday && student.course === '1 Year') {
        return;
      }
      attendanceRecords[selectedDate][student.id] = dayRecords[student.id];
    });
    saveRecords();
    triggerSuccessFeedback();
  }
}

function triggerSuccessFeedback() {
  const submitBtn = document.getElementById('btn-submit-attendance');
  const originalHTML = submitBtn.innerHTML;
  
  submitBtn.disabled = true;
  submitBtn.style.backgroundColor = 'var(--color-success)';
  submitBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="btn-primary-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>
    Saved Successfully!
  `;

  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.style.backgroundColor = '';
    submitBtn.innerHTML = originalHTML;
    renderStudentList();
    navigateTo('view-home');
  }, 1000);
}

// View Month-wise Student Attendance Details
window.viewStudentDetails = function(studentId) {
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  detailsStudentNameEl.textContent = student.name;

  // Process history logs
  let presentCount = 0;
  let totalDays = 0;
  const historyByMonth = {};

  // Read all dates and gather statuses
  const sortedDates = Object.keys(attendanceRecords).sort((a, b) => b.localeCompare(a)); // Newest first

  sortedDates.forEach(dateStr => {
    // Skip Saturdays for 1 Year students
    if (student.course === '1 Year' && isSaturday(dateStr)) {
      return;
    }

    const records = attendanceRecords[dateStr];
    if (records && records[studentId]) {
      const status = records[studentId];
      totalDays++;
      if (status === 'present') presentCount++;

      // Extract month name and year (local safe naming)
      const dateObj = parseLocalDateString(dateStr);
      const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const dayFormatted = dateObj.toLocaleDateString('en-US', { day: 'numeric' });
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      if (!historyByMonth[monthYear]) {
        historyByMonth[monthYear] = [];
      }

      historyByMonth[monthYear].push({
        date: dateStr,
        dayString: `${weekday}, ${dayFormatted}`,
        status: status
      });
    }
  });

  // Calculate statistics
  const absentCount = totalDays - presentCount;
  const rate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

  statAttendanceRateEl.textContent = `${rate}%`;
  statPresentCountEl.textContent = presentCount;
  statAbsentCountEl.textContent = absentCount;

  // Render list grouped by month
  const months = Object.keys(historyByMonth);
  if (months.length === 0) {
    detailsHistoryContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <h3>No history found</h3>
        <p>This student hasn't been marked on any attendance sheets yet.</p>
      </div>
    `;
  } else {
    detailsHistoryContainer.innerHTML = months.map(monthName => {
      const dayCards = historyByMonth[monthName].map(item => {
        const isPresent = item.status === 'present';
        const badgeClass = isPresent ? 'present' : 'absent';
        const badgeText = isPresent ? 'Present' : 'Absent';
        
        const badgeIcon = isPresent
          ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

        return `
          <li class="history-card">
            <span class="history-date">
              ${item.dayString}
            </span>
            <span class="history-badge ${badgeClass}">
              ${badgeIcon}
              ${badgeText}
            </span>
          </li>
        `;
      }).join('');

      return `
        <div class="month-section">
          <h3 class="month-title">${monthName}</h3>
          <ul class="history-list">
            ${dayCards}
          </ul>
        </div>
      `;
    }).join('');
  }

  navigateTo('view-student-details');
};

// Calendar Drawing & Reporting logic
function drawCalendarGrid() {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  calendarMonthYearEl.textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;

  const firstDayIndex = new Date(currentCalendarYear, currentCalendarMonth, 1).getDay();
  const totalDays = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
  const prevTotalDays = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();

  let dayCellsHTML = '';

  // Leading days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevTotalDays - i;
    const prevMonth = currentCalendarMonth === 0 ? 11 : currentCalendarMonth - 1;
    const prevYear = currentCalendarMonth === 0 ? currentCalendarYear - 1 : currentCalendarYear;
    dayCellsHTML += renderCalendarCell(prevYear, prevMonth, dayNum, true);
  }

  // Active month days
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    dayCellsHTML += renderCalendarCell(currentCalendarYear, currentCalendarMonth, dayNum, false);
  }

  // Trailing days from next month to fill grid (assuming 6 rows * 7 days = 42 cells)
  const totalCellsSoFar = firstDayIndex + totalDays;
  const remainingCells = 42 - totalCellsSoFar;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const nextMonth = currentCalendarMonth === 11 ? 0 : currentCalendarMonth + 1;
    const nextYear = currentCalendarMonth === 11 ? currentCalendarYear + 1 : currentCalendarYear;
    dayCellsHTML += renderCalendarCell(nextYear, nextMonth, dayNum, true);
  }

  calendarDaysGridEl.innerHTML = dayCellsHTML;
}

function renderCalendarCell(year, month, day, isInactive) {
  const cellDate = new Date(year, month, day);
  const cellDateStr = getLocalDateString(cellDate);
  const selectedDateStr = getLocalDateString(selectedCalendarDate);
  const todayDateStr = getLocalDateString(new Date());

  let classes = 'calendar-day-cell';
  if (isInactive) classes += ' inactive';
  if (cellDateStr === selectedDateStr) classes += ' selected';
  if (cellDateStr === todayDateStr) classes += ' today';

  return `<button class="${classes}" onclick="selectCalendarDate(${year}, ${month}, ${day})">${day}</button>`;
}

window.selectCalendarDate = function(year, month, day) {
  selectedCalendarDate = new Date(year, month, day);
  drawCalendarGrid();
  renderCalendarDayStats();
};

function renderCalendarDayStats() {
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  calendarSelectedDateText.textContent = `Attendance: ${selectedCalendarDate.toLocaleDateString('en-US', options)}`;

  const dateStr = getLocalDateString(selectedCalendarDate);
  const dayRecord = attendanceRecords[dateStr];
  const isSelectedDateSaturday = isSaturday(dateStr);

  const presentStudents = [];
  const absentStudents = [];

  students.forEach(student => {
    // Skip 1 Year students on Saturdays
    if (isSelectedDateSaturday && student.course === '1 Year') {
      return;
    }
    
    // Default to absent if today's date or selected date record is missing
    const status = (dayRecord && dayRecord[student.id]) ? dayRecord[student.id] : 'absent';
    if (status === 'present') {
      presentStudents.push(student);
    } else {
      absentStudents.push(student);
    }
  });

  calendarPresentCount.textContent = presentStudents.length;
  calendarAbsentCount.textContent = absentStudents.length;

  // Render present list
  if (presentStudents.length === 0) {
    calendarPresentListEl.innerHTML = `
      <li class="empty-state" style="padding: 16px;">
        <p>No students marked present.</p>
      </li>
    `;
  } else {
    calendarPresentListEl.innerHTML = presentStudents.map(student => `
      <li class="student-card">
        <div class="student-initials-badge">
          ${getInitials(student.name)}
        </div>
        <div class="student-info">
          <div class="student-name">${escapeHTML(student.name)}</div>
        </div>
      </li>
    `).join('');
  }

  // Render absent list
  if (absentStudents.length === 0) {
    calendarAbsentListEl.innerHTML = `
      <li class="empty-state" style="padding: 16px;">
        <p>No students marked absent.</p>
      </li>
    `;
  } else {
    calendarAbsentListEl.innerHTML = absentStudents.map(student => `
      <li class="student-card">
        <div class="student-initials-badge" style="background-color: var(--color-danger-light); color: var(--color-danger); border-color: rgba(239, 68, 68, 0.1);">
          ${getInitials(student.name)}
        </div>
        <div class="student-info">
          <div class="student-name">${escapeHTML(student.name)}</div>
        </div>
      </li>
    `).join('');
  }
}

// Google Sheets API Sync Logic
function showLoader(message = "Loading...") {
  loadingMessage.textContent = message;
  loadingOverlay.classList.remove('hidden');
}

function hideLoader() {
  loadingOverlay.classList.add('hidden');
}

function updateSyncStatusBadge() {
  if (sheetUrl) {
    syncStatusBadge.textContent = "Sheets Synced";
    syncStatusBadge.className = "sync-badge synced";
  } else {
    syncStatusBadge.textContent = "Offline Mode";
    syncStatusBadge.className = "sync-badge local";
  }
}

function fetchDataFromSheets() {
  if (!sheetUrl) return;

  showLoader("Syncing from Google Sheets...");
  fetch(sheetUrl)
    .then(res => {
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    })
    .then(data => {
      students = data.students || [];
      students.sort((a, b) => a.name.localeCompare(b.name));
      attendanceRecords = data.attendance || {};
      
      // Save local mirror cache
      saveStudents();
      saveRecords();

      renderStudentList();
      renderEditStudentList();
      updateSyncStatusBadge();
    })
    .catch(err => {
      alert("Failed to sync from Google Sheets: " + err.message + "\n\nThe app will run in offline Local Storage mode instead.");
      sheetUrl = '';
      localStorage.removeItem('attendance_app_sheet_url');
      updateSyncStatusBadge();
      loadData(); // Reload local cache
      renderStudentList();
    })
    .finally(() => {
      hideLoader();
    });
}

function syncActionToSheets(action, payload) {
  if (!sheetUrl) return Promise.resolve(true);

  return fetch(sheetUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: JSON.stringify(Object.assign({ action: action }, payload))
  })
  .then(res => {
    if (!res.ok) throw new Error("API Connection Error");
    return res.json();
  })
  .then(resData => {
    if (!resData || !resData.success) {
      throw new Error(resData ? resData.error : "Unknown sync error");
    }
    return true;
  })
  .catch(err => {
    alert("Google Sheets Sync Error: " + err.message);
    throw err;
  });
}

// HTML Escaping Helper to protect against XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Start core execution
document.addEventListener('DOMContentLoaded', init);
