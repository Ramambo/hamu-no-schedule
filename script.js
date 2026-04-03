/* ── 파스텔 색상 팔레트 ── */
const PASTEL_COLORS = [
  { bg: '#EEEDFE', text: '#3C3489', dot: '#7F77DD', border: '#AFA9EC' }, // 라벤더
  { bg: '#E1F5EE', text: '#085041', dot: '#1D9E75', border: '#5DCAA5' }, // 민트
  { bg: '#FAECE7', text: '#712B13', dot: '#D85A30', border: '#F0997B' }, // 피치
  { bg: '#FBEAF0', text: '#72243E', dot: '#D4537E', border: '#ED93B1' }, // 핑크
  { bg: '#E6F1FB', text: '#0C447C', dot: '#378ADD', border: '#85B7EB' }, // 스카이
  { bg: '#EAF3DE', text: '#27500A', dot: '#639922', border: '#97C459' }, // 그린
  { bg: '#FAEEDA', text: '#633806', dot: '#BA7517', border: '#EF9F27' }, // 옐로우
  { bg: '#FCF0F8', text: '#6B1F5A', dot: '#C45BA8', border: '#E09DD0' }, // 라일락
  { bg: '#E8F4F8', text: '#0D4B5E', dot: '#2A8CAE', border: '#7DC4DC' }, // 아쿠아
  { bg: '#F5EEE6', text: '#5C3A1E', dot: '#A0622F', border: '#D4956A' }, // 베이지
];

const STORAGE_KEY = 'work_schedule_v3';
const STAFF_KEY   = 'work_schedule_staff_v3';
const HOURS = Array.from({ length: 10 }, (_, i) => i + 10);
const DAYS  = ['일', '월', '화', '수', '목', '금', '토'];

/* ── 기본 직원 ── */
const DEFAULT_STAFF = [
  { name: 'CHRIS',   colorIdx: 0 },
  { name: '직원 A',   colorIdx: 1 },
  { name: '직원 B',   colorIdx: 2 },
  { name: '직원 C',   colorIdx: 3 },
];

let staff        = [];   // [{ name, colorIdx }]
let scheduleData = {};   // { 'YYYY-MM-DD_HH': [staffIndex, ...] }
let activeStaff  = [];   // 필터에서 활성화된 인덱스
let weekOffset   = 0;

let modalCell    = null;
let modalSelected = [];
let editStaffIdx = null;
let editColorIdx = null;

/* ── 로드 / 저장 ── */

function load() {
  try {
    const s = localStorage.getItem(STAFF_KEY);
    staff = s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEFAULT_STAFF));

    const d = localStorage.getItem(STORAGE_KEY);
    scheduleData = d ? JSON.parse(d) : {};
  } catch (e) {
    staff = JSON.parse(JSON.stringify(DEFAULT_STAFF));
    scheduleData = {};
  }
  activeStaff = staff.map((_, i) => i);
}

function saveSchedule() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scheduleData));
  const el = document.getElementById('saveIndicator');
  el.textContent = '저장됨 ✓';
  setTimeout(() => (el.textContent = ''), 1500);
}

function saveStaff() {
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
}

/* ── 날짜 유틸 ── */

function dateKey(dt) { return dt.toISOString().split('T')[0]; }

function getWeekStart(offset) {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

/* ── 색상 헬퍼 ── */

function color(idx) {
  const s = staff[idx];
  if (!s) return PASTEL_COLORS[0];
  return PASTEL_COLORS[s.colorIdx % PASTEL_COLORS.length];
}

/* ── 렌더 ── */

function renderHeader() {
  const ws = getWeekStart(weekOffset);
  const we = new Date(ws); we.setDate(ws.getDate() + 6);
  const today = dateKey(new Date());

  document.getElementById('weekLabel').textContent =
    `${ws.getMonth()+1}/${ws.getDate()} ~ ${we.getMonth()+1}/${we.getDate()}`;

  let html = '<div class="gh-cell"></div>';
  for (let d = 0; d < 7; d++) {
    const dt = new Date(ws); dt.setDate(ws.getDate() + d);
    const isToday = dateKey(dt) === today;
    html += `<div class="gh-cell${isToday ? ' today' : ''}">
      ${DAYS[dt.getDay()]}<span class="date-num">${dt.getDate()}</span></div>`;
  }
  document.getElementById('gridHeader').innerHTML = html;
}

function renderBody() {
  const ws = getWeekStart(weekOffset);
  let html = '';

  HOURS.forEach(hour => {
    html += `<div class="hour-row"><div class="time-col">${hour}시</div>`;
    for (let d = 0; d < 7; d++) {
      const dt = new Date(ws); dt.setDate(ws.getDate() + d);
      const key = `${dateKey(dt)}_${hour}`;
      const shifts  = (scheduleData[key] || []).filter(i => i < staff.length);
      const visible = shifts.filter(i => activeStaff.includes(i));
      const overlap = visible.length >= 3;

      let inner = visible.map(i => {
        const c = color(i);
        return `<span class="shift-block"
          style="background:${c.bg};color:${c.text};">${staff[i].name}</span>`;
      }).join('');
      if (overlap) inner += `<span class="overlap-warn"></span>`;

      html += `<div class="cell" onclick="openModal('${dateKey(dt)}',${hour})">${inner}</div>`;
    }
    html += `</div>`;
  });

  document.getElementById('gridBody').innerHTML = html;
}

function renderStaffRow() {
  document.getElementById('staffRow').innerHTML = staff.map((s, i) => {
    const c = color(i);
    const active = activeStaff.includes(i);
    return `<div class="staff-tag${active ? '' : ' inactive'}"
      style="background:${c.bg};color:${c.text};border-color:${c.border};"
      onclick="toggleStaff(${i})">
      <span class="dot" style="background:${c.dot};"></span>${s.name}
    </div>`;
  }).join('');
}

function renderStaffManage() {
  document.getElementById('staffManageList').innerHTML = staff.map((s, i) => {
    const c = color(i);
    return `<div class="staff-manage-item">
      <span class="staff-color-dot" style="background:${c.dot};"></span>
      <span class="staff-name">${s.name}</span>
      <button class="btn-edit" onclick="openEditStaff(${i})">편집</button>
    </div>`;
  }).join('');
}

function render() {
  renderHeader();
  renderBody();
  renderStaffRow();
  renderStaffManage();
}

/* ── 직원 필터 ── */

function toggleStaff(i) {
  if (activeStaff.includes(i)) {
    if (activeStaff.length > 1) activeStaff = activeStaff.filter(x => x !== i);
  } else {
    activeStaff.push(i);
  }
  renderStaffRow();
  renderBody();
}

/* ── 주간 이동 ── */

function changeWeek(d) { weekOffset += d; render(); }
function goToday()      { weekOffset = 0;  render(); }

/* ── 근무 편집 모달 ── */

function openModal(dk, hour) {
  modalCell = { dk, hour };
  const key = `${dk}_${hour}`;
  modalSelected = [...(scheduleData[key] || [])].filter(i => i < staff.length);

  const [, m, d] = dk.split('-');
  document.getElementById('modalTitle').textContent = `${m}월 ${d}일 ${hour}:00 근무`;

  document.getElementById('modalStaffGrid').innerHTML = staff.map((s, i) => {
    const c = color(i);
    const sel = modalSelected.includes(i);
    return `<button class="msb${sel ? ' selected' : ''}"
      style="background:${c.bg};color:${c.text};${sel ? `border-color:${c.text};` : ''}"
      onclick="toggleModalStaff(${i})">${s.name}</button>`;
  }).join('');

  document.getElementById('modal').style.display = 'flex';
}

function toggleModalStaff(i) {
  if (modalSelected.includes(i)) {
    modalSelected = modalSelected.filter(x => x !== i);
  } else {
    modalSelected.push(i);
  }
  const btns = document.querySelectorAll('#modalStaffGrid .msb');
  btns.forEach((btn, idx) => {
    const c = color(idx);
    const sel = modalSelected.includes(idx);
    btn.className = `msb${sel ? ' selected' : ''}`;
    btn.style.background = c.bg;
    btn.style.color = c.text;
    btn.style.borderColor = sel ? c.text : 'transparent';
  });
}

function saveModal() {
  const key = `${modalCell.dk}_${modalCell.hour}`;
  if (modalSelected.length === 0) delete scheduleData[key];
  else scheduleData[key] = [...modalSelected];
  saveSchedule();
  closeModal();
  renderBody();
}

function closeModal()    { document.getElementById('modal').style.display = 'none'; }
function closeModalBg(e) { if (e.target.id === 'modal') closeModal(); }

/* ── 직원 추가 ── */

function addStaff() {
  const input = document.getElementById('newStaffName');
  const name  = input.value.trim();
  if (!name) return;

  const usedColors = staff.map(s => s.colorIdx);
  let colorIdx = 0;
  for (let i = 0; i < PASTEL_COLORS.length; i++) {
    if (!usedColors.includes(i)) { colorIdx = i; break; }
  }

  staff.push({ name, colorIdx });
  activeStaff.push(staff.length - 1);
  saveStaff();
  input.value = '';
  render();
}

/* ── 직원 편집 모달 ── */

function openEditStaff(i) {
  editStaffIdx = i;
  editColorIdx = staff[i].colorIdx;

  document.getElementById('editStaffName').value = staff[i].name;

  document.getElementById('colorPalette').innerHTML = PASTEL_COLORS.map((c, ci) => {
    const sel = ci === editColorIdx;
    return `<div class="color-swatch${sel ? ' selected' : ''}"
      style="background:${c.dot};"
      onclick="selectColor(${ci})"></div>`;
  }).join('');

  document.getElementById('editStaffModal').style.display = 'flex';
}

function selectColor(ci) {
  editColorIdx = ci;
  document.querySelectorAll('.color-swatch').forEach((el, i) => {
    el.classList.toggle('selected', i === ci);
  });
}

function saveEditStaff() {
  const name = document.getElementById('editStaffName').value.trim();
  if (!name) return;
  staff[editStaffIdx].name     = name;
  staff[editStaffIdx].colorIdx = editColorIdx;
  saveStaff();
  closeEditModal();
  render();
}

function deleteStaff() {
  if (staff.length <= 1) { alert('최소 1명은 있어야 해요!'); return; }
  if (!confirm(`'${staff[editStaffIdx].name}'을(를) 삭제할까요?\n해당 직원의 스케줄도 모두 지워져요.`)) return;

  const delIdx = editStaffIdx;

  // 스케줄에서 해당 직원 제거 + 인덱스 재정렬
  Object.keys(scheduleData).forEach(key => {
    scheduleData[key] = scheduleData[key]
      .filter(i => i !== delIdx)
      .map(i => (i > delIdx ? i - 1 : i));
    if (scheduleData[key].length === 0) delete scheduleData[key];
  });

  staff.splice(delIdx, 1);
  activeStaff = staff.map((_, i) => i);

  saveStaff();
  saveSchedule();
  closeEditModal();
  render();
}

function closeEditModal()    { document.getElementById('editStaffModal').style.display = 'none'; }
function closeEditModalBg(e) { if (e.target.id === 'editStaffModal') closeEditModal(); }

/* ── CSV 내보내기 ── */

function exportCSV() {
  const ws = getWeekStart(weekOffset);
  const header = [
    '시간',
    ...Array.from({ length: 7 }, (_, d) => {
      const dt = new Date(ws); dt.setDate(ws.getDate() + d);
      return `${DAYS[dt.getDay()]}(${dt.getDate()}일)`;
    }),
  ].join(',');

  const rows = HOURS.map(hour => {
    const cols = [`${hour}:00`];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(ws); dt.setDate(ws.getDate() + d);
      const key = `${dateKey(dt)}_${hour}`;
      cols.push(
        (scheduleData[key] || [])
          .filter(i => i < staff.length)
          .map(i => staff[i].name)
          .join('/')
      );
    }
    return cols.join(',');
  });

  const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `schedule_${dateKey(getWeekStart(weekOffset))}.csv`;
  a.click();
}

/* ── 초기 실행 ── */
load();
render();
