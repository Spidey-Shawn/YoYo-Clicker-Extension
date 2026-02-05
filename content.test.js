/**
 * Tests for YoYo Clicker Extension
 * Tests core functionality of VideoPointsTracker class
 */

// Mock chrome.storage API
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        callback({});
      }),
      set: jest.fn((data, callback) => {
        if (callback) callback();
      })
    }
  }
};

// Load the content script and get VideoPointsTracker
const { VideoPointsTracker } = require('./content.js');

describe('VideoPointsTracker', () => {
  let tracker;
  let mockVideo;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock window.visualViewport with addEventListener
    window.visualViewport = {
      scale: 1.0,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    // Create mock video element
    mockVideo = document.createElement('video');
    mockVideo.src = 'test.mp4';
    document.body.appendChild(mockVideo);
    
    // Create new tracker instance
    tracker = new VideoPointsTracker();
    
    // Mock methods that interact with DOM/timers
    jest.spyOn(tracker, 'createPointsDisplay').mockImplementation(() => {});
    jest.spyOn(tracker, 'updatePointsDisplay').mockImplementation(() => {});
    jest.spyOn(tracker, 'showFeedback').mockImplementation(() => {});
    jest.spyOn(tracker, 'savePoints').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Point Tracking', () => {
    test('should initialize with zero points', () => {
      expect(tracker.points).toBe(0);
      expect(tracker.plusPoints).toBe(0);
      expect(tracker.minusPoints).toBe(0);
    });

    test('should add points correctly', () => {
      tracker.addPoint();
      expect(tracker.points).toBe(1);
      expect(tracker.plusPoints).toBe(1);
      expect(tracker.minusPoints).toBe(0);
    });

    test('should subtract points correctly', () => {
      tracker.subtractPoint();
      expect(tracker.points).toBe(-1);
      expect(tracker.plusPoints).toBe(0);
      expect(tracker.minusPoints).toBe(1);
    });

    test('should handle multiple additions', () => {
      tracker.addPoint();
      tracker.addPoint();
      tracker.addPoint();
      expect(tracker.points).toBe(3);
      expect(tracker.plusPoints).toBe(3);
    });

    test('should handle mixed operations', () => {
      tracker.addPoint();
      tracker.addPoint();
      tracker.subtractPoint();
      expect(tracker.points).toBe(1);
      expect(tracker.plusPoints).toBe(2);
      expect(tracker.minusPoints).toBe(1);
    });

    test('should reset all counts', () => {
      tracker.addPoint();
      tracker.addPoint();
      tracker.subtractPoint();
      tracker.resetAllCounts();
      expect(tracker.points).toBe(0);
      expect(tracker.plusPoints).toBe(0);
      expect(tracker.minusPoints).toBe(0);
    });
  });

  describe('Zoom Level Detection', () => {
    test('should detect zoom level from visual viewport', () => {
      // Mock visual viewport
      window.visualViewport = { scale: 1.5 };
      const zoom = tracker.detectZoomLevel();
      expect(zoom).toBe(1.5);
    });

    test('should fallback to window ratio when visual viewport unavailable', () => {
      window.visualViewport = null;
      window.outerWidth = 1920;
      window.innerWidth = 1280;
      const zoom = tracker.detectZoomLevel();
      expect(zoom).toBe(1.5);
    });

    test('should return 1.0 for invalid zoom values', () => {
      window.visualViewport = null;
      window.outerWidth = 100;
      window.innerWidth = 2000; // Invalid ratio < 0.3
      const zoom = tracker.detectZoomLevel();
      expect(zoom).toBe(1.0);
    });
  });

  describe('Background Mode', () => {
    test('should set dark mode during daytime hours (6AM-6PM)', () => {
      // Mock time to 12:00 PM
      const mockDate = new Date('2024-01-01T12:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      tracker.setAutoBackgroundMode();
      expect(tracker.backgroundMode).toBe('dark');
      
      jest.restoreAllMocks();
    });

    test('should set light mode during nighttime hours (6PM-6AM)', () => {
      // Mock time to 10:00 PM
      const mockDate = new Date('2024-01-01T22:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      tracker.setAutoBackgroundMode();
      expect(tracker.backgroundMode).toBe('light');
      
      jest.restoreAllMocks();
    });
  });

  describe('Scale Management', () => {
    test('should initialize with default scale', () => {
      expect(tracker.scale).toBe(1.0);
      expect(tracker.baseScale).toBe(1.0);
    });

    test('should update scale correctly', () => {
      // Create a mock display element
      const mockDisplay = document.createElement('div');
      const scaleText = document.createElement('span');
      scaleText.className = 'scale-text';
      mockDisplay.appendChild(scaleText);
      tracker.pointsDisplay = mockDisplay;
      
      tracker.baseScale = 1.5;
      tracker.scale = 1.5;
      tracker.updateScale();
      
      expect(mockDisplay.style.transform).toBe('scale(1.5)');
      expect(scaleText.textContent).toBe('150%');
    });
  });

  describe('Video Detection', () => {
    test('should detect video element', () => {
      tracker.detectVideo();
      expect(tracker.currentVideo).toBeTruthy();
    });

    test('should handle no video element', () => {
      // Remove video before detecting
      document.body.innerHTML = '';
      // Create a new tracker after video is removed
      const trackerNoVideo = new VideoPointsTracker();
      expect(trackerNoVideo.currentVideo).toBeNull();
    });
  });
});
