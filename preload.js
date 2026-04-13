const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 회원 CRUD
  getMembers: () => ipcRenderer.invoke('get-members'),
  addMember: (memberData) => ipcRenderer.invoke('add-member', memberData),
  updateMember: (memberData) => ipcRenderer.invoke('update-member', memberData),
  deleteMember: (memberId) => ipcRenderer.invoke('delete-member', memberId),

  // 소개 관련
  markIntroduced: (memberId) => ipcRenderer.invoke('mark-introduced', memberId),

  // 유틸리티
  testNotification: () => ipcRenderer.invoke('test-notification'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

  // 알람 수신 (메인 → 렌더러)
  onHighlightMember: (callback) => {
    ipcRenderer.on('highlight-member', (event, memberId) => callback(memberId));
  }
});
