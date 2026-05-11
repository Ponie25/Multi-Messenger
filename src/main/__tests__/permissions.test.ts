import { setNotificationPermission } from '../permissions'

// Mock electron session
const mockSetPermissionRequestHandler = jest.fn()
jest.mock('electron', () => ({
  session: {
    fromPartition: jest.fn(() => ({
      setPermissionRequestHandler: mockSetPermissionRequestHandler,
    })),
  },
}))

describe('setNotificationPermission', () => {
  beforeEach(() => {
    mockSetPermissionRequestHandler.mockClear()
  })

  it('grants notification permission when enabled is true', () => {
    setNotificationPermission('persist:account-test', true)
    expect(mockSetPermissionRequestHandler).toHaveBeenCalledTimes(1)

    const handler = mockSetPermissionRequestHandler.mock.calls[0][0]
    const callback = jest.fn()
    handler(null, 'notifications', callback)
    expect(callback).toHaveBeenCalledWith(true)
  })

  it('denies notification permission when enabled is false', () => {
    setNotificationPermission('persist:account-test', false)
    const handler = mockSetPermissionRequestHandler.mock.calls[0][0]
    const callback = jest.fn()
    handler(null, 'notifications', callback)
    expect(callback).toHaveBeenCalledWith(false)
  })

  it('denies non-notification permissions regardless of enabled flag', () => {
    setNotificationPermission('persist:account-test', true)
    const handler = mockSetPermissionRequestHandler.mock.calls[0][0]

    const geoCallback = jest.fn()
    handler(null, 'geolocation', geoCallback)
    expect(geoCallback).toHaveBeenCalledWith(false)

    const micCallback = jest.fn()
    handler(null, 'microphone', micCallback)
    expect(micCallback).toHaveBeenCalledWith(false)
  })

  it('calls setPermissionRequestHandler on the correct partition', () => {
    const { session } = require('electron')
    setNotificationPermission('persist:account-abc123', true)
    expect(session.fromPartition).toHaveBeenCalledWith('persist:account-abc123')
  })
})
