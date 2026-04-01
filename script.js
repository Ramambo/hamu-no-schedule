const STORAGE_KEY = 'work_schedule_v2';
const NAME_KEY = 'work_schedule_names_v2';
const HOURS = Array.from({ length: 10 }, (_, i) => i + 10); // 10시 ~ 19시
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DEFAULT_NAMES = ['남자친구', '직원 A', '직원 B', '직원 C'];

let staffNames = [...DEFAULT_NAMES];
let weekOffset = 0;
let scheduleData = {};
let activeStaff = [0, 1, 2, 3];
let modalCell = null;
let modalSelected = [];

/* ── 데이터 로드 / 저장 ── */

function load() {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    if (d) scheduleData = JSON.parse(d);

    const n = localStorage.getItem(NAME_KEY);
    if (n) staffNames = JSON.parse(n);
  } catch (e) {
    scheduleData = {};
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scheduleData));
  const el = document.getElementById('saveIndicator');
  el.textContent = '저장됨 ✓';
  setTimeout(() => (el.textContent = ''), 1500);
}

function saveNames() {
  const inputs = document.querySelectorAll('#nameEditGrid input');
  inputs.forEach((inp, i) => {
    if (inp.value.trim()) staffNames[i] = inp.value.trim();
  });
  localStorage.setItem(NAME_KEY, JSON.stringify(staffNames));
  render();
  alert('이름이 저장되었습니다!');
}

/* ── 날짜 유틸 ── */

function dateKey(dt) {
  return dt.toISOString().split('T')[0];
}

function getWeekStart(offset) {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - day + 1 + offset * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

/* ── 렌더 ── */

function renderHeader() {
  const ws = getWeekStart(weekOffset);
  const today = dateKey(new Date());
  const we = new Date(ws);
  we.setDate(ws.getDate() + 6);

  document.getElementById('weekLabel').textContent =
    `${ws.getMonth() + 1}/${ws.getDate()} ~ ${we.getMonth() + 1}/${we.getDate()}`;

  let html = '<div class="gh-cell"></div>';
  for (let d = 0; d < 7; d++) {
    const dt = new Date(ws);
    dt.setDate(ws.getDate() + d);
    const isToday = dateKey(dt) === today;
    html += `
      <div class="gh-cell${isToday ? ' today' : ''}">
        ${DAYS[dt.getDay()]}
        <span class="date-num">${dt.getDate()}</span>
      </div>`;
  }
  document.getElementById('gridHeader').innerHTML = html;
}

function renderBody() {
  const ws = getWeekStart(weekOffset);
  let html = '';

  HOURS.forEach(hour => {
    html += `<div class="hour-row"><div class="time-col">${hour}시</div>`;

    for (let d = 0; d < 7; d++) {
      const dt = new Date(ws);
      dt.setDate(ws.getDate() + d);
      const key = `${dateKey(dt)}_${hour}`;
      const shifts = scheduleData[key] || [];
      const visible = shifts.filter(s => activeStaff.includes(s));
      const overlap = visible.length >= 3;

      let inner = visible
        .map(si => `<span class="shift-block sb${si}">${staffNames[si]}</span>`)
        .join('');
      if (overlap) inner += `<span class="overlap-warn"></span>`;

      html += `<div class="cell" onclick="openModal('${dateKey(dt)}', ${hour})">${inner}</div>`;
    }

    html += `</div>`;
  });

  document.getElementById('gridBody').innerHTML = html;
}

function renderStaffRow() {
  document.getElementById('staffRow').innerHTML = staffNames
    .map((name, i) => {
      const active = activeStaff.includes(i);
      return `
        <div class="staff-tag s${i}${active ? '' : ' inactive'}" onclick="toggleStaff(${i})">
          <span class="dot d${i}"></span>${name}
        </div>`;
    })
    .join('');
}

function renderNameEdit() {
  document.getElementById('nameEditGrid').innerHTML = staffNames
    .map((name, i) => `
      <div class="name-edit-item">
        <span class="dot d${i}" style="width:10px;height:10px;"></span>
        <input type="text" value="${name}" placeholder="이름 입력" />
      </div>`)
    .join('');
}

function render() {
  renderHeader();
  renderBody();
  renderStaffRow();
  renderNameEdit();
}

/* ── 직원 필터 토글 ── */

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

function changeWeek(d) {
  weekOffset += d;
  render();
}

function goToday() {
  weekOffset = 0;
  render();
}

/* ── 모달 ── */

function openModal(dk, hour) {
  modalCell = { dk, hour };
  const key = `${dk}_${hour}`;
  modalSelected = [...(scheduleData[key] || [])];

  const [, m, d] = dk.split('-');
  document.getElementById('modalTitle').textContent = `${m}월 ${d}일 ${hour}:00 근무`;

  document.getElementById('modalStaffGrid').innerHTML = staffNames
    .map((name, i) => `
      <button class="msb msb${i}${modalSelected.includes(i) ? ' selected' : ''}"
        onclick="toggleModalStaff(${i})">${name}</button>`)
    .join('');

  document.getElementById('modal').style.display = 'flex';
}

function toggleModalStaff(i) {
  if (modalSelected.includes(i)) {
    modalSelected = modalSelected.filter(x => x !== i);
  } else {
    modalSelected.push(i);
  }
  document.querySelectorAll('#modalStaffGrid .msb').forEach((el, idx) => {
    el.classList.toggle('selected', modalSelected.includes(idx));
  });
}

function saveModal() {
  const key = `${modalCell.dk}_${modalCell.hour}`;
  if (modalSelected.length === 0) {
    delete scheduleData[key];
  } else {
    scheduleData[key] = [...modalSelected];
  }
  save();
  closeModal();
  renderBody();
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

function closeModalBg(e) {
  if (e.target.id === 'modal') closeModal();
}

/* ── CSV 내보내기 ── */

function exportCSV() {
  const ws = getWeekStart(weekOffset);
  const header = [
    '시간',
    ...Array.from({ length: 7 }, (_, d) => {
      const dt = new Date(ws);
      dt.setDate(ws.getDate() + d);
      return `${DAYS[dt.getDay()]}(${dt.getDate()}일)`;
    }),
  ].join(',');

  const rows = HOURS.map(hour => {
    const cols = [`${hour}:00`];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(ws);
      dt.setDate(ws.getDate() + d);
      const key = `${dateKey(dt)}_${hour}`;
      cols.push((scheduleData[key] || []).map(i => staffNames[i]).join('/'));
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
