// Mock for electron module in tests
module.exports = {
  app: {
    getPath: jest.fn(() => '/tmp/test-app'),
    isPackaged: false,
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  BrowserWindow: jest.fn(),
  dialog: {
    showMessageBox: jest.fn(),
  },
  shell: {},
}
