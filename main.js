const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 데이터 파일 경로
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'members.json');

let mainWindow;
let notificationTimer;

// 데이터 파일 초기화
function initDataFile() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({ members: [] }, null, 2), 'utf8');
  }
}

// 회원 데이터 읽기
function readMembers() {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { members: [] };
  }
}

// 회원 데이터 쓰기
function writeMembers(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

// 월간 알람 체크 (앱 시작 시 + 12시간마다 체크)
function checkMonthlyNotifications() {
  const data = readMembers();
  const now = new Date();

  data.members.forEach(member => {
    const lastIntroduced = member.lastIntroducedAt ? new Date(member.lastIntroducedAt) : null;
    const addedAt = member.addedAt ? new Date(member.addedAt) : null;

    // 마지막 소개일 기준으로 30일 경과 여부 확인
    const referenceDate = lastIntroduced || addedAt;
    if (!referenceDate) return;

    const daysDiff = Math.floor((now - referenceDate) / (1000 * 60 * 60 * 24));

    if (daysDiff >= 30) {
      showMemberNotification(member, daysDiff);
    }
  });
}

function showMemberNotification(member, daysDiff) {
  if (!Notification.isSupported()) return;

  const maskedName = member.maskedName || generateMaskedName(member.name);
  const notification = new Notification({
    title: '회원 소개 알람',
    body: `${member.name} 님 (${maskedName})을 소개할 시간입니다!\n마지막 소개 후 ${daysDiff}일이 지났습니다.`,
    urgency: 'normal'
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('highlight-member', member.id);
    }
  });

  notification.show();
}

function generateMaskedName(name) {
  if (!name || name.length === 0) return '';
  const firstChar = name[0];
  return firstChar + '**';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'default',
    title: '회원 관리 시스템'
  });

  mainWindow.loadFile('src/index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initDataFile();
  createWindow();

  // 앱 시작 시 알람 체크
  setTimeout(checkMonthlyNotifications, 3000);

  // 12시간마다 알람 체크
  notificationTimer = setInterval(checkMonthlyNotifications, 12 * 60 * 60 * 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (notificationTimer) clearInterval(notificationTimer);
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 핸들러: 회원 목록 조회
ipcMain.handle('get-members', () => {
  return readMembers();
});

// IPC 핸들러: 회원 추가
ipcMain.handle('add-member', (event, memberData) => {
  const data = readMembers();
  const newMember = {
    ...memberData,
    id: Date.now().toString(),
    maskedName: generateMaskedName(memberData.name),
    addedAt: new Date().toISOString(),
    lastIntroducedAt: null
  };
  data.members.push(newMember);
  writeMembers(data);
  return { success: true, member: newMember };
});

// IPC 핸들러: 회원 수정
ipcMain.handle('update-member', (event, memberData) => {
  const data = readMembers();
  const index = data.members.findIndex(m => m.id === memberData.id);
  if (index === -1) return { success: false, error: '회원을 찾을 수 없습니다.' };

  data.members[index] = {
    ...data.members[index],
    ...memberData,
    maskedName: generateMaskedName(memberData.name)
  };
  writeMembers(data);
  return { success: true, member: data.members[index] };
});

// IPC 핸들러: 회원 삭제
ipcMain.handle('delete-member', (event, memberId) => {
  const data = readMembers();
  const index = data.members.findIndex(m => m.id === memberId);
  if (index === -1) return { success: false, error: '회원을 찾을 수 없습니다.' };

  data.members.splice(index, 1);
  writeMembers(data);
  return { success: true };
});

// IPC 핸들러: 소개 완료 처리 (마지막 소개일 업데이트)
ipcMain.handle('mark-introduced', (event, memberId) => {
  const data = readMembers();
  const member = data.members.find(m => m.id === memberId);
  if (!member) return { success: false };

  member.lastIntroducedAt = new Date().toISOString();
  writeMembers(data);
  return { success: true };
});

// IPC 핸들러: 수동 알람 테스트
ipcMain.handle('test-notification', () => {
  checkMonthlyNotifications();
  return { success: true };
});

// IPC 핸들러: 데이터 파일 경로 열기
ipcMain.handle('open-data-folder', () => {
  shell.showItemInFolder(dataFilePath);
  return { success: true };
});
