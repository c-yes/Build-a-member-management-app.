'use strict';

// ============================================
// 앱 상태
// ============================================
const state = {
  members: [],
  selectedMemberId: null,
  editingMemberId: null,
  searchQuery: '',
  educationCount: 0
};

// ============================================
// DOM 참조
// ============================================
const $ = id => document.getElementById(id);

const els = {
  memberList: $('memberList'),
  memberCount: $('memberCount'),
  searchInput: $('searchInput'),
  emptyState: $('emptyState'),
  memberDetail: $('memberDetail'),
  modalOverlay: $('modalOverlay'),
  modalTitle: $('modalTitle'),
  memberForm: $('memberForm'),
  educationList: $('educationList'),
  toastContainer: $('toastContainer'),
  // 상세 뷰
  detailName: $('detailName'),
  detailMaskedName: $('detailMaskedName'),
  detailAddedDate: $('detailAddedDate'),
  detailIntroStatus: $('detailIntroStatus'),
  profilePreview: $('profilePreview'),
  idealTypeSection: $('idealTypeSection'),
  idealTypeContent: $('idealTypeContent'),
};

// ============================================
// 유틸리티 함수
// ============================================

function generateMaskedName(name) {
  if (!name || name.trim().length === 0) return '';
  const trimmed = name.trim();
  return trimmed[0] + '**';
}

function formatBirthYear(val) {
  if (!val) return '';
  const cleaned = val.trim();
  // 이미 "xx년생" 형태면 그대로
  if (cleaned.includes('년생')) return cleaned;
  // 4자리 연도면 뒤 2자리 + 년생
  if (/^\d{4}$/.test(cleaned)) return cleaned.slice(2) + '년생';
  // 2자리 숫자면 년생 추가
  if (/^\d{2}$/.test(cleaned)) return cleaned + '년생';
  return cleaned;
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function daysSince(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = `toast${type ? ' toast-' + type : ''}`;
  el.textContent = message;
  els.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = 'opacity 0.2s, transform 0.2s';
    setTimeout(() => el.remove(), 200);
  }, 2800);
}

// ============================================
// 프로필 텍스트 생성 (정형화된 폼)
// ============================================
function buildProfileText(member) {
  const lines = [];

  // 이름 (풀네임)
  if (member.name) lines.push(`${member.name} 님`);

  // 마스킹 이름
  const masked = member.maskedName || generateMaskedName(member.name);
  if (masked) lines.push(`\n${masked} 님`);

  // 기본 정보 블록
  const basicBlock = [];
  if (member.birthYear) basicBlock.push(formatBirthYear(member.birthYear));
  if (member.residence) basicBlock.push(`거주지: ${member.residence}`);
  if (member.hometown) basicBlock.push(`본가: ${member.hometown}`);
  if (member.height) basicBlock.push(`신장: ${member.height}`);
  if (member.religion) basicBlock.push(`종교: ${member.religion}`);
  if (member.hobbies) basicBlock.push(`취미: ${member.hobbies}`);

  if (basicBlock.length > 0) {
    lines.push('');
    lines.push(...basicBlock);
  }

  // 학력 블록
  if (member.educations && member.educations.length > 0) {
    const eduLines = member.educations
      .filter(e => e.school || e.major)
      .map((e, i) => {
        const parts = [e.school, e.major, e.status].filter(Boolean);
        const line = parts.join(' ');
        return i === 0 ? `학력: ${line}` : line;
      });

    if (eduLines.length > 0) {
      lines.push('');
      lines.push(...eduLines);
    }
  }

  // 가족 관계 블록
  const familyBlock = [];
  if (member.siblings) familyBlock.push(`형제관계: ${member.siblings}`);
  if (member.father) familyBlock.push(`부: ${member.father}`);
  if (member.mother) familyBlock.push(`모: ${member.mother}`);
  if (member.otherFamily) {
    member.otherFamily.split('\n').filter(l => l.trim()).forEach(l => familyBlock.push(l.trim()));
  }

  if (familyBlock.length > 0) {
    lines.push('');
    lines.push(...familyBlock);
  }

  // 경제력 블록
  const wealthBlock = [];
  if (member.personalWealth) wealthBlock.push(`본인경제력: ${member.personalWealth}`);
  if (member.familyWealth) wealthBlock.push(`가족 경제력: ${member.familyWealth}`);

  if (wealthBlock.length > 0) {
    lines.push('');
    lines.push(...wealthBlock);
  }

  // 성격
  if (member.personality) {
    lines.push('');
    lines.push(member.personality.trim());
  }

  return lines.join('\n');
}

// 이성상 HTML 생성
function buildIdealTypeHTML(member) {
  const items = [
    { label: '나이', value: member.idealAge },
    { label: '키', value: member.idealHeight },
    { label: '직업', value: member.idealJob },
    { label: '종교', value: member.idealReligion },
    { label: '거주지', value: member.idealResidence },
    { label: '학력', value: member.idealEducation },
  ].filter(i => i.value);

  const etcValue = member.idealEtc;
  const hasAny = items.length > 0 || etcValue;
  if (!hasAny) return null;

  let html = '<div class="ideal-type-grid">';
  items.forEach(item => {
    html += `<div class="ideal-type-item"><span class="ideal-type-label">${item.label}</span><span class="ideal-type-value">${escapeHtml(item.value)}</span></div>`;
  });
  if (etcValue) {
    html += `<div class="ideal-type-item ideal-type-full"><span class="ideal-type-label">기타</span><span class="ideal-type-value" style="white-space:pre-wrap;">${escapeHtml(etcValue)}</span></div>`;
  }
  html += '</div>';
  return html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================
// 회원 목록 렌더링
// ============================================
function renderMemberList() {
  const query = state.searchQuery.toLowerCase();
  const filtered = state.members.filter(m => {
    if (!query) return true;
    return (
      (m.name || '').toLowerCase().includes(query) ||
      (m.residence || '').toLowerCase().includes(query) ||
      (m.idealJob || '').toLowerCase().includes(query) ||
      (m.birthYear || '').includes(query)
    );
  });

  els.memberCount.textContent = `${filtered.length}명`;
  els.memberList.innerHTML = '';

  if (filtered.length === 0) {
    els.memberList.innerHTML = '<li style="padding:20px;text-align:center;color:#9ca3af;font-size:13px;">검색 결과가 없습니다</li>';
    return;
  }

  filtered.forEach(member => {
    const li = document.createElement('li');
    li.className = 'member-item' + (member.id === state.selectedMemberId ? ' active' : '');
    li.dataset.id = member.id;

    const introInterval = member.introInterval || 30;
    const refDate = member.lastIntroducedAt || member.addedAt;
    const days = daysSince(refDate);
    const needsIntro = days !== null && days >= introInterval;

    const firstChar = member.name ? member.name[0] : '?';
    const subText = [
      member.birthYear ? formatBirthYear(member.birthYear) : '',
      member.residence || ''
    ].filter(Boolean).join(' · ');

    li.innerHTML = `
      <div class="member-avatar">${escapeHtml(firstChar)}</div>
      <div class="member-item-info">
        <div class="member-item-name">${escapeHtml(member.name || '이름 없음')}</div>
        <div class="member-item-sub">${escapeHtml(subText || '정보 없음')}</div>
      </div>
      ${needsIntro ? '<div class="member-item-alarm" title="소개 알람"></div>' : ''}
    `;

    li.addEventListener('click', () => selectMember(member.id));
    els.memberList.appendChild(li);
  });
}

// ============================================
// 회원 상세 뷰
// ============================================
function selectMember(id) {
  state.selectedMemberId = id;
  const member = state.members.find(m => m.id === id);
  if (!member) return;

  // 사이드바 활성화
  document.querySelectorAll('.member-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  // 뷰 전환
  els.emptyState.style.display = 'none';
  els.memberDetail.style.display = 'block';

  // 헤더 정보
  els.detailName.textContent = member.name + ' 님';
  els.detailMaskedName.textContent = member.maskedName || generateMaskedName(member.name);
  els.detailAddedDate.textContent = '등록: ' + formatDate(member.addedAt);

  // 소개 상태 배지
  const introInterval = member.introInterval || 30;
  const refDate = member.lastIntroducedAt || member.addedAt;
  const days = daysSince(refDate);
  const needsIntro = days !== null && days >= introInterval;

  if (needsIntro) {
    els.detailIntroStatus.className = 'badge badge-alarm';
    els.detailIntroStatus.textContent = `소개 필요 (${days}일 경과)`;
  } else if (days !== null) {
    els.detailIntroStatus.className = 'badge badge-ok';
    const lastLabel = member.lastIntroducedAt ? '마지막 소개' : '등록';
    els.detailIntroStatus.textContent = `${lastLabel} 후 ${days}일`;
  } else {
    els.detailIntroStatus.className = 'badge';
    els.detailIntroStatus.textContent = '';
  }

  // 프로필 텍스트
  els.profilePreview.textContent = buildProfileText(member);

  // 이성상
  const idealHtml = buildIdealTypeHTML(member);
  if (idealHtml) {
    els.idealTypeSection.style.display = 'block';
    els.idealTypeContent.innerHTML = idealHtml;
  } else {
    els.idealTypeSection.style.display = 'none';
  }
}

// ============================================
// 폼 초기화 / 채우기
// ============================================
function resetForm() {
  $('inputName').value = '';
  $('inputBirthYear').value = '';
  $('inputResidence').value = '';
  $('inputHometown').value = '';
  $('inputHeight').value = '';
  $('inputReligion').value = '';
  $('inputHobbies').value = '';
  $('inputSiblings').value = '';
  $('inputFather').value = '';
  $('inputMother').value = '';
  $('inputOtherFamily').value = '';
  $('inputPersonalWealth').value = '';
  $('inputFamilyWealth').value = '';
  $('inputPersonality').value = '';
  $('inputIdealAge').value = '';
  $('inputIdealHeight').value = '';
  $('inputIdealJob').value = '';
  $('inputIdealReligion').value = '';
  $('inputIdealResidence').value = '';
  $('inputIdealEducation').value = '';
  $('inputIdealEtc').value = '';
  $('inputIntroInterval').value = '30';
  els.educationList.innerHTML = '';
  state.educationCount = 0;
  addEducationRow(); // 기본 1개
}

function fillForm(member) {
  $('inputName').value = member.name || '';
  $('inputBirthYear').value = member.birthYear || '';
  $('inputResidence').value = member.residence || '';
  $('inputHometown').value = member.hometown || '';
  $('inputHeight').value = member.height || '';
  $('inputReligion').value = member.religion || '';
  $('inputHobbies').value = member.hobbies || '';
  $('inputSiblings').value = member.siblings || '';
  $('inputFather').value = member.father || '';
  $('inputMother').value = member.mother || '';
  $('inputOtherFamily').value = member.otherFamily || '';
  $('inputPersonalWealth').value = member.personalWealth || '';
  $('inputFamilyWealth').value = member.familyWealth || '';
  $('inputPersonality').value = member.personality || '';
  $('inputIdealAge').value = member.idealAge || '';
  $('inputIdealHeight').value = member.idealHeight || '';
  $('inputIdealJob').value = member.idealJob || '';
  $('inputIdealReligion').value = member.idealReligion || '';
  $('inputIdealResidence').value = member.idealResidence || '';
  $('inputIdealEducation').value = member.idealEducation || '';
  $('inputIdealEtc').value = member.idealEtc || '';
  $('inputIntroInterval').value = member.introInterval || '30';

  // 학력
  els.educationList.innerHTML = '';
  state.educationCount = 0;
  if (member.educations && member.educations.length > 0) {
    member.educations.forEach(edu => addEducationRow(edu));
  } else {
    addEducationRow();
  }
}

function addEducationRow(data = {}) {
  state.educationCount++;
  const idx = state.educationCount;
  const div = document.createElement('div');
  div.className = 'education-item';
  div.dataset.eduIdx = idx;

  const statusOptions = ['졸', '재학 중', '졸업예정', '수료', '중퇴', '기타'];
  const statusHtml = statusOptions.map(s =>
    `<option value="${s}" ${data.status === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  div.innerHTML = `
    <input type="text" placeholder="학교명 (예: Yale)" value="${escapeHtml(data.school || '')}" data-field="school" />
    <input type="text" placeholder="전공/학과 (예: 생물학과)" value="${escapeHtml(data.major || '')}" data-field="major" />
    <select data-field="status">${statusHtml}</select>
    <button type="button" class="btn-remove-edu" title="삭제">✕</button>
  `;

  div.querySelector('.btn-remove-edu').addEventListener('click', () => {
    if (els.educationList.children.length > 1) {
      div.remove();
    } else {
      toast('최소 1개의 학력 항목이 필요합니다.', 'error');
    }
  });

  els.educationList.appendChild(div);
}

function collectEducations() {
  const rows = els.educationList.querySelectorAll('.education-item');
  const result = [];
  rows.forEach(row => {
    const school = row.querySelector('[data-field="school"]').value.trim();
    const major = row.querySelector('[data-field="major"]').value.trim();
    const status = row.querySelector('[data-field="status"]').value;
    if (school || major) {
      result.push({ school, major, status });
    }
  });
  return result;
}

function collectFormData() {
  return {
    name: $('inputName').value.trim(),
    birthYear: $('inputBirthYear').value.trim(),
    residence: $('inputResidence').value.trim(),
    hometown: $('inputHometown').value.trim(),
    height: $('inputHeight').value.trim(),
    religion: $('inputReligion').value.trim(),
    hobbies: $('inputHobbies').value.trim(),
    educations: collectEducations(),
    siblings: $('inputSiblings').value.trim(),
    father: $('inputFather').value.trim(),
    mother: $('inputMother').value.trim(),
    otherFamily: $('inputOtherFamily').value.trim(),
    personalWealth: $('inputPersonalWealth').value.trim(),
    familyWealth: $('inputFamilyWealth').value.trim(),
    personality: $('inputPersonality').value.trim(),
    idealAge: $('inputIdealAge').value.trim(),
    idealHeight: $('inputIdealHeight').value.trim(),
    idealJob: $('inputIdealJob').value.trim(),
    idealReligion: $('inputIdealReligion').value.trim(),
    idealResidence: $('inputIdealResidence').value.trim(),
    idealEducation: $('inputIdealEducation').value.trim(),
    idealEtc: $('inputIdealEtc').value.trim(),
    introInterval: parseInt($('inputIntroInterval').value) || 30,
  };
}

// ============================================
// 모달 열기/닫기
// ============================================
function openModal(mode, member = null) {
  state.editingMemberId = mode === 'edit' ? member.id : null;
  els.modalTitle.textContent = mode === 'edit' ? '회원 정보 수정' : '회원 등록';
  els.modalOverlay.style.display = 'flex';

  if (mode === 'edit' && member) {
    fillForm(member);
  } else {
    resetForm();
  }
}

function closeModal() {
  els.modalOverlay.style.display = 'none';
  state.editingMemberId = null;
}

// ============================================
// 데이터 로드
// ============================================
async function loadMembers() {
  const data = await window.electronAPI.getMembers();
  state.members = data.members || [];
  renderMemberList();
}

// ============================================
// 저장 (추가 / 수정)
// ============================================
async function saveMember() {
  const formData = collectFormData();
  if (!formData.name) {
    toast('이름을 입력해주세요.', 'error');
    $('inputName').focus();
    return;
  }

  try {
    if (state.editingMemberId) {
      // 수정
      const result = await window.electronAPI.updateMember({
        ...formData,
        id: state.editingMemberId
      });
      if (result.success) {
        const idx = state.members.findIndex(m => m.id === state.editingMemberId);
        if (idx !== -1) state.members[idx] = result.member;
        toast('회원 정보가 수정되었습니다.', 'success');
        closeModal();
        renderMemberList();
        selectMember(state.editingMemberId);
      } else {
        toast(result.error || '수정에 실패했습니다.', 'error');
      }
    } else {
      // 추가
      const result = await window.electronAPI.addMember(formData);
      if (result.success) {
        state.members.push(result.member);
        toast('회원이 등록되었습니다.', 'success');
        closeModal();
        renderMemberList();
        selectMember(result.member.id);
      } else {
        toast(result.error || '등록에 실패했습니다.', 'error');
      }
    }
  } catch (err) {
    toast('오류가 발생했습니다: ' + err.message, 'error');
  }
}

// ============================================
// 삭제
// ============================================
async function deleteMember(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  if (!confirm(`"${member.name}" 회원을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

  const result = await window.electronAPI.deleteMember(id);
  if (result.success) {
    state.members = state.members.filter(m => m.id !== id);
    state.selectedMemberId = null;
    els.memberDetail.style.display = 'none';
    els.emptyState.style.display = 'flex';
    toast('회원이 삭제되었습니다.', 'success');
    renderMemberList();
  } else {
    toast(result.error || '삭제에 실패했습니다.', 'error');
  }
}

// ============================================
// 소개 완료 처리
// ============================================
async function markIntroduced(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  if (!confirm(`"${member.name}" 님의 소개를 완료 처리하시겠습니까?\n오늘 날짜로 마지막 소개일이 업데이트됩니다.`)) return;

  const result = await window.electronAPI.markIntroduced(id);
  if (result.success) {
    member.lastIntroducedAt = new Date().toISOString();
    toast('소개 완료로 처리되었습니다.', 'success');
    renderMemberList();
    selectMember(id);
  } else {
    toast('처리에 실패했습니다.', 'error');
  }
}

// ============================================
// 프로필 복사
// ============================================
async function copyProfile(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  const text = buildProfileText(member);
  try {
    await navigator.clipboard.writeText(text);
    toast('프로필이 클립보드에 복사되었습니다.', 'success');
  } catch (err) {
    toast('복사에 실패했습니다: ' + err.message, 'error');
  }
}

// ============================================
// 이벤트 리스너 연결
// ============================================
function bindEvents() {
  // + 회원 등록 버튼
  $('btnAddMember').addEventListener('click', () => openModal('add'));
  $('btnAddMemberEmpty').addEventListener('click', () => openModal('add'));

  // 모달 닫기
  $('modalClose').addEventListener('click', closeModal);
  $('btnCancelForm').addEventListener('click', closeModal);
  els.modalOverlay.addEventListener('click', e => {
    if (e.target === els.modalOverlay) closeModal();
  });

  // 저장
  $('btnSaveMember').addEventListener('click', saveMember);

  // 학력 추가
  $('btnAddEducation').addEventListener('click', () => addEducationRow());

  // 검색
  els.searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderMemberList();
  });

  // 수정 버튼
  $('btnEditMember').addEventListener('click', () => {
    if (!state.selectedMemberId) return;
    const member = state.members.find(m => m.id === state.selectedMemberId);
    openModal('edit', member);
  });

  // 삭제 버튼
  $('btnDeleteMember').addEventListener('click', () => {
    if (state.selectedMemberId) deleteMember(state.selectedMemberId);
  });

  // 소개 완료
  $('btnMarkIntroduced').addEventListener('click', () => {
    if (state.selectedMemberId) markIntroduced(state.selectedMemberId);
  });

  // 프로필 복사
  $('btnCopyProfile').addEventListener('click', () => {
    if (state.selectedMemberId) copyProfile(state.selectedMemberId);
  });

  // 알람 테스트
  $('btnAlarmTest').addEventListener('click', async () => {
    await window.electronAPI.testNotification();
    toast('알람 체크를 실행했습니다.', 'success');
  });

  // 데이터 폴더 열기
  $('btnOpenFolder').addEventListener('click', () => {
    window.electronAPI.openDataFolder();
  });

  // 텍스트 자동입력 토글
  $('btnTogglePaste').addEventListener('click', () => {
    const section = $('pasteSection');
    const isHidden = section.style.display === 'none';
    section.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      $('pasteInput').focus();
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // 자동입력 적용
  $('btnApplyPaste').addEventListener('click', () => {
    const text = $('pasteInput').value.trim();
    if (!text) {
      toast('텍스트를 붙여넣어 주세요.', 'error');
      return;
    }
    const parsed = parseProfileText(text);
    if (!parsed.name && Object.keys(parsed).length === 0) {
      toast('인식된 정보가 없습니다. 형식을 확인해주세요.', 'error');
      return;
    }
    const count = applyParsedToForm(parsed);
    $('pasteSection').style.display = 'none';
    toast(`${count}개 항목이 자동으로 입력되었습니다. 확인 후 저장해주세요.`, 'success');
  });

  // 텍스트 지우기
  $('btnClearPaste').addEventListener('click', () => {
    $('pasteInput').value = '';
    $('pasteInput').focus();
  });

  // 키보드 단축키
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      openModal('add');
    }
  });

  // 메인 프로세스에서 오는 회원 강조 알림
  window.electronAPI.onHighlightMember(memberId => {
    selectMember(memberId);
    const member = state.members.find(m => m.id === memberId);
    if (member) toast(`${member.name} 님 소개 알람`, 'success');
  });
}

// ============================================
// 텍스트 자동 파싱
// ============================================

const STATUS_WORDS = ['재학 중', '졸업예정', '수료', '중퇴', '졸'];
const KNOWN_KEYS = new Set([
  '거주지', '본가', '신장', '종교', '취미', '학력',
  '형제관계', '부', '모', '본인경제력', '가족 경제력', '가족경제력'
]);
const FAMILY_WORDS = ['오빠', '언니', '형', '동생', '남동생', '여동생', '누나', '남매'];

function parseEduLine(line) {
  let status = '졸';
  let rest = line.trim();

  for (const s of STATUS_WORDS) {
    if (rest.endsWith(s)) {
      status = s;
      rest = rest.slice(0, -s.length).trim();
      break;
    }
  }

  const tokens = rest.split(/\s+/);
  let school = rest;
  let major = '';

  if (tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    // 전공처럼 보이는 단어: 학과/대학/대학원/부/과 로 끝나는 경우
    if (/[과부]$/.test(last) || last.endsWith('학과') || last.endsWith('대학') ||
        last.endsWith('대학원') || last.endsWith('의과대학') || last.endsWith('학부')) {
      major = last;
      school = tokens.slice(0, -1).join(' ');
    }
  }

  return { school, major, status };
}

function parseProfileText(rawText) {
  const result = {};
  const lines = rawText.split('\n').map(l => l.trim());
  const educations = [];
  const otherFamilyLines = [];
  const personalityLines = [];
  let inEducation = false;

  for (const line of lines) {
    if (!line) continue;

    // 이름 (X 님 형태이고 ** 없는 것)
    if ((line.endsWith(' 님') || line.endsWith('님')) && !line.includes('*')) {
      const name = line.replace(/\s*님\s*$/, '').trim();
      if (name && !result.name) result.name = name;
      continue;
    }

    // 마스킹 이름 건너뜀
    if (line.includes('**')) continue;

    // 출생연도 (96년생, 1996년생, 1996 등)
    if (/^\d{2,4}년생$/.test(line) || /^(19|20)\d{2}$/.test(line)) {
      result.birthYear = line;
      inEducation = false;
      continue;
    }

    // 콜론이 있는 줄
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();

      if (KNOWN_KEYS.has(key)) {
        if (key !== '학력') inEducation = false;

        switch (key) {
          case '거주지':       result.residence = value; break;
          case '본가':         result.hometown = value; break;
          case '신장':         result.height = value; break;
          case '종교':         result.religion = value; break;
          case '취미':         result.hobbies = value; break;
          case '형제관계':     result.siblings = value; break;
          case '부':           result.father = value; break;
          case '모':           result.mother = value; break;
          case '본인경제력':   result.personalWealth = value; break;
          case '가족 경제력':
          case '가족경제력':   result.familyWealth = value; break;
          case '학력':
            inEducation = true;
            if (value) {
              const edu = parseEduLine(value);
              if (edu.school) educations.push(edu);
            }
            break;
        }
        continue;
      }

      // 가족 관계 키워드 (오빠, 언니 등)
      if (FAMILY_WORDS.some(w => key === w || key.startsWith(w))) {
        inEducation = false;
        otherFamilyLines.push(line);
        continue;
      }

      // 학력 섹션 중 콜론이 포함된 줄 (예: 학교명에 콜론 포함)
      if (inEducation) {
        const edu = parseEduLine(line);
        if (edu.school) educations.push(edu);
        continue;
      }
    }

    // 콜론 없는 줄
    if (inEducation) {
      const edu = parseEduLine(line);
      if (edu.school) educations.push(edu);
      continue;
    }

    // 이름이 이미 파싱됐고 다른 패턴에 안 걸린 줄 → 성격/특이사항
    if (result.name) {
      personalityLines.push(line);
    }
  }

  if (educations.length > 0) result.educations = educations;
  if (otherFamilyLines.length > 0) result.otherFamily = otherFamilyLines.join('\n');
  if (personalityLines.length > 0) result.personality = personalityLines.join('\n');

  return result;
}

function applyParsedToForm(parsed) {
  if (parsed.name)           $('inputName').value = parsed.name;
  if (parsed.birthYear)      $('inputBirthYear').value = parsed.birthYear;
  if (parsed.residence)      $('inputResidence').value = parsed.residence;
  if (parsed.hometown)       $('inputHometown').value = parsed.hometown;
  if (parsed.height)         $('inputHeight').value = parsed.height;
  if (parsed.religion)       $('inputReligion').value = parsed.religion;
  if (parsed.hobbies)        $('inputHobbies').value = parsed.hobbies;
  if (parsed.siblings)       $('inputSiblings').value = parsed.siblings;
  if (parsed.father)         $('inputFather').value = parsed.father;
  if (parsed.mother)         $('inputMother').value = parsed.mother;
  if (parsed.otherFamily)    $('inputOtherFamily').value = parsed.otherFamily;
  if (parsed.personalWealth) $('inputPersonalWealth').value = parsed.personalWealth;
  if (parsed.familyWealth)   $('inputFamilyWealth').value = parsed.familyWealth;
  if (parsed.personality)    $('inputPersonality').value = parsed.personality;

  // 학력 채우기
  if (parsed.educations && parsed.educations.length > 0) {
    els.educationList.innerHTML = '';
    state.educationCount = 0;
    parsed.educations.forEach(edu => addEducationRow(edu));
  }

  // 파싱된 필드 수 계산
  const filled = Object.keys(parsed).filter(k =>
    k !== 'educations' && k !== 'otherFamily' && k !== 'personality' && parsed[k]
  ).length +
  (parsed.educations ? parsed.educations.length : 0);

  return filled;
}

// ============================================
// 앱 초기화
// ============================================
async function init() {
  bindEvents();
  await loadMembers();
}

init();
