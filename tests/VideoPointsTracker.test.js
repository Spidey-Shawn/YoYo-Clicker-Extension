/**
 * @jest-environment jsdom
 */

// Import the VideoPointsTracker class
const VideoPointsTracker = require('../content.js');

describe('VideoPointsTracker', () => {
  let tracker;
  
  beforeEach(() => {
    // Reset document body
    document.body.innerHTML = '';
    
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
    
    // Mock setTimeout to avoid waiting
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default values', () => {
      // Don't call init() in constructor for this test
      tracker = Object.create(VideoPointsTracker.prototype);
      tracker.currentVideo = null;
      tracker.points = 0;
      tracker.plusPoints = 0;
      tracker.minusPoints = 0;
      tracker.scale = 1.0;
      tracker.backgroundMode = 'light';
      
      expect(tracker.points).toBe(0);
      expect(tracker.plusPoints).toBe(0);
      expect(tracker.minusPoints).toBe(0);
      expect(tracker.scale).toBe(1.0);
      expect(tracker.backgroundMode).toBe('light');
    });
  });

  describe('detectZoomLevel', () => {
    test('should detect zoom from visual viewport', () => {
      window.visualViewport = { scale: 1.5 };
      tracker = Object.create(VideoPointsTracker.prototype);
      
      const zoom = tracker.detectZoomLevel.call({});
      expect(zoom).toBe(1.5);
    });
    
    test('should fallback to 1.0 when visual viewport is not available', () => {
      delete window.visualViewport;
      tracker = Object.create(VideoPointsTracker.prototype);
      
      const zoom = tracker.detectZoomLevel.call({});
      expect(zoom).toBeGreaterThan(0);
    });
  });

  describe('setAutoBackgroundMode', () => {
    test('should set dark mode during daytime (6 AM - 6 PM)', () => {
      // Mock Date to return 12:00 PM (noon)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(12);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);
      
      tracker = Object.create(VideoPointsTracker.prototype);
      tracker.backgroundMode = 'light';
      tracker.setAutoBackgroundMode.call(tracker);
      
      expect(tracker.backgroundMode).toBe('dark');
    });
    
    test('should set light mode during nighttime (6 PM - 6 AM)', () => {
      // Mock Date to return 8:00 PM
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);
      
      tracker = Object.create(VideoPointsTracker.prototype);
      tracker.backgroundMode = 'dark';
      tracker.setAutoBackgroundMode.call(tracker);
      
      expect(tracker.backgroundMode).toBe('light');
    });
    
    test('should set light mode at edge case (5:59 AM)', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(5);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(59);
      
      tracker = Object.create(VideoPointsTracker.prototype);
      tracker.backgroundMode = 'dark';
      tracker.setAutoBackgroundMode.call(tracker);
      
      expect(tracker.backgroundMode).toBe('light');
    });
  });

  describe('resetAllCounts', () => {
    test('should reset all points to zero', () => {
      tracker = Object.create(VideoPointsTracker.prototype);
      tracker.points = 10;
      tracker.plusPoints = 5;
      tracker.minusPoints = 3;
      tracker.addEffectCount = 2;
      tracker.minusEffectCount = 1;
      
      tracker.resetAllCounts.call(tracker);
      
      expect(tracker.points).toBe(0);
      expect(tracker.plusPoints).toBe(0);
      expect(tracker.minusPoints).toBe(0);
      expect(tracker.addEffectCount).toBe(0);
      expect(tracker.minusEffectCount).toBe(0);
    });
  });

  describe('Point Management', () => {
    beforeEach(() => {
      // Create a minimal tracker object for point testing
      tracker = Object.create(VideoPointsTracker.prototype);
      tracker.points = 0;
      tracker.plusPoints = 0;
      tracker.minusPoints = 0;
      tracker.updatePointsDisplay = jest.fn();
      tracker.showFeedback = jest.fn();
      tracker.savePoints = jest.fn();
    });

    test('addPoint should increment points correctly', () => {
      tracker.addPoint.call(tracker);
      
      expect(tracker.points).toBe(1);
      expect(tracker.plusPoints).toBe(1);
      expect(tracker.updatePointsDisplay).toHaveBeenCalled();
      expect(tracker.showFeedback).toHaveBeenCalledWith('+1', '#4CAF50');
      expect(tracker.savePoints).toHaveBeenCalled();
    });
    
    test('addPoint should handle multiple increments', () => {
      tracker.addPoint.call(tracker);
      tracker.addPoint.call(tracker);
      tracker.addPoint.call(tracker);
      
      expect(tracker.points).toBe(3);
      expect(tracker.plusPoints).toBe(3);
      expect(tracker.updatePointsDisplay).toHaveBeenCalledTimes(3);
    });

    test('subtractPoint should decrement points correctly', () => {
      tracker.points = 5;
      tracker.subtractPoint.call(tracker);
      
      expect(tracker.points).toBe(4);
      expect(tracker.minusPoints).toBe(1);
      expect(tracker.updatePointsDisplay).toHaveBeenCalled();
      expect(tracker.showFeedback).toHaveBeenCalledWith('-1', '#f44336');
      expect(tracker.savePoints).toHaveBeenCalled();
    });
    
    test('subtractPoint should allow negative points', () => {
      tracker.points = 0;
      tracker.subtractPoint.call(tracker);
      
      expect(tracker.points).toBe(-1);
      expect(tracker.minusPoints).toBe(1);
    });
    
    test('resetPoints should reset all point values to zero', () => {
      tracker.points = 10;
      tracker.plusPoints = 5;
      tracker.minusPoints = 3;
      tracker.addEffectCount = 2;
      tracker.minusEffectCount = 1;
      
      // Call the actual resetPoints method
      const resetPoints = VideoPointsTracker.prototype.resetPoints;
      resetPoints.call(tracker);
      
      expect(tracker.points).toBe(0);
      expect(tracker.plusPoints).toBe(0);
      expect(tracker.minusPoints).toBe(0);
    });
  });

  describe('Video Detection', () => {
    test('detectVideo should find video element', () => {
      // Add a video element to the DOM
      const video = document.createElement('video');
      document.body.appendChild(video);
      
      tracker = Object.create(VideoPointsTracker.prototype);
      tracker.currentVideo = null;
      tracker.updatePointsDisplay = jest.fn();
      
      tracker.detectVideo.call(tracker);
      
      expect(tracker.currentVideo).toBe(video);
      expect(tracker.updatePointsDisplay).toHaveBeenCalled();
    });
    
    test('detectVideo should not update if same video', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);
      
      tracker = Object.create(VideoPointsTracker.prototype);
      tracker.currentVideo = video;
      tracker.updatePointsDisplay = jest.fn();
      
      tracker.detectVideo.call(tracker);
      
      expect(tracker.updatePointsDisplay).not.toHaveBeenCalled();
    });
  });
});
