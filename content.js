class VideoPointsTracker {
  constructor() {
    this.currentVideo = null;
    this.points = 0;
    this.plusPoints = 0;
    this.minusPoints = 0;
    this.pointsDisplay = null;
    this.feedbackDisplay = null;
    this.menuDropdown = null;
    this.menuVisible = false;
    this.scale = 1.0;
    this.backgroundMode = 'light'; // 'light' or 'dark'
    this.isFullscreen = false; // Track fullscreen state
    this.gestureStarted = false;
    this.gestureFingers = 0;
    this.lastEventId = null; // Track last event to prevent duplicates
    this.addEffectCount = 0; // Track add effect position in sequence
    this.minusEffectCount = 0; // Track minus effect position in sequence
    this.lastGestureTime = 0; // Track last gesture to prevent conflicts
    this.lastGestureType = null; // Track last gesture type (add/subtract)
    this.pendingGestures = []; // Track all gestures within conflict window
    this.gestureProcessingTimeout = null; // Timeout for gesture processing
    this.baseScale = 1.0; // User's manually set scale
    this.currentZoomLevel = this.detectZoomLevel(); // Current page zoom
    
    this.init();
  }

  init() {
    this.detectVideo();
    this.setupEventListeners();
    this.setupFullscreenListeners();
    this.setupZoomListeners();
    this.checkExtensionState();
  }

  checkExtensionState() {
    // Reset all counts to zero on every boot
    this.resetAllCounts();
    // Clean up any lingering feedback elements
    this.cleanupFeedbackElements();
    // Set automatic background mode based on time
    this.setAutoBackgroundMode();
    // Extension never auto-starts - only shows when Ctrl+Y is pressed
    console.log('YoYo Clicker: Extension loaded but hidden. Press Ctrl+Y to show.');
  }

  detectZoomLevel() {
    // Use visual viewport for more accurate zoom detection
    if (window.visualViewport) {
      const zoom = window.visualViewport.scale || 1;
      console.log(`YoYo Clicker: Detected zoom level (visual viewport): ${zoom}`);
      return zoom;
    }
    
    // Fallback: Use window dimensions ratio
    const zoom = window.outerWidth / window.innerWidth;
    if (zoom > 0.3 && zoom < 5) { // Reasonable zoom range
      console.log(`YoYo Clicker: Detected zoom level (window ratio): ${zoom}`);
      return zoom;
    }
    
    // Additional fallback: Try device pixel ratio method
    if (window.devicePixelRatio) {
      const zoom = 1 / window.devicePixelRatio;
      if (zoom > 0.3 && zoom < 5) {
        console.log(`YoYo Clicker: Detected zoom level (device pixel ratio): ${zoom}`);
        return zoom;
      }
    }
    
    // Final fallback
    console.log(`YoYo Clicker: Using default zoom level: 1.0`);
    return 1.0;
  }
  
  setAutoBackgroundMode() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    console.log(`YoYo Clicker: Current time is ${hour}:${minute.toString().padStart(2, '0')}`);
    
    // Dark mode: 6:00 AM (6) to 6:00 PM (18)
    // Light mode: 6:00 PM (18) to 6:00 AM (6)
    if (hour >= 6 && hour < 18) {
      this.backgroundMode = 'dark';
      console.log('YoYo Clicker: Auto-set to dark mode (daytime)');
    } else {
      this.backgroundMode = 'light';
      console.log('YoYo Clicker: Auto-set to light mode (nighttime)');
    }
  }

  cleanupFeedbackElements() {
    // Remove any existing feedback elements that might be lingering
    const existingFeedback = document.querySelectorAll('.points-feedback');
    existingFeedback.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    console.log('YoYo Clicker: Cleaned up lingering feedback elements');
  }

  resetAllCounts() {
    this.points = 0;
    this.plusPoints = 0;
    this.minusPoints = 0;
    this.addEffectCount = 0;
    this.minusEffectCount = 0;
    
    
    console.log('YoYo Clicker: All counts reset to zero on boot');
  }

  detectVideo() {
    const video = document.querySelector('video');
    if (video && video !== this.currentVideo) {
      this.currentVideo = video;
      console.log('YoYo Clicker: Video detected', video);
      this.updatePointsDisplay();
    }
    
    setTimeout(() => this.detectVideo(), 1000);
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    document.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    
    // More responsive event handlers - use both pointer and mouse events for better sensitivity
    document.addEventListener('pointerdown', (e) => this.handleAllMouseEvents(e, 'pointerdown'));
    document.addEventListener('mousedown', (e) => this.handleAllMouseEvents(e, 'mousedown'));
    document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    document.addEventListener('auxclick', (e) => this.handleAllMouseEvents(e, 'auxclick'));
    
    // Disable touch handlers to prevent duplicates
    // document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    // document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  setupFullscreenListeners() {
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('msfullscreenchange', () => this.handleFullscreenChange());
    
    // YouTube specific listeners
    document.addEventListener('yt-navigate-finish', () => {
      setTimeout(() => this.handleFullscreenChange(), 500);
    });
    
    // Listen for window resize (catches some fullscreen changes)
    window.addEventListener('resize', () => {
      setTimeout(() => this.handleFullscreenChange(), 100);
    });
    
    // Listen for key events (F11, Escape)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F11' || e.key === 'Escape') {
        setTimeout(() => this.handleFullscreenChange(), 100);
      }
    });
    
    // Backup polling method in case events don't work
    this.startFullscreenPolling();
  }

  startFullscreenPolling() {
    setInterval(() => {
      const currentFullscreenState = this.detectFullscreenState();
      
      if (currentFullscreenState !== this.isFullscreen) {
        console.log('YoYo Clicker: Fullscreen state change detected via polling');
        this.handleFullscreenChange();
      }
    }, 1000); // Check every second
  }

  setupZoomListeners() {
    // Listen for resize events which can indicate zoom changes
    window.addEventListener('resize', () => this.handleZoomChange());
    
    // Listen for visual viewport changes (better zoom detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this.handleZoomChange());
    }
    
    // Polling method as backup for zoom detection
    this.startZoomPolling();
  }

  startZoomPolling() {
    setInterval(() => {
      const newZoomLevel = this.detectZoomLevel();
      
      if (Math.abs(newZoomLevel - this.currentZoomLevel) > 0.02) { // 2% tolerance for more sensitive detection
        console.log(`YoYo Clicker: Zoom change detected: ${this.currentZoomLevel} → ${newZoomLevel}`);
        this.handleZoomLevelChange(newZoomLevel);
      }
    }, 250); // Check more frequently (every 250ms)
  }

  handleZoomChange() {
    // Debounce zoom change detection
    clearTimeout(this.zoomChangeTimeout);
    this.zoomChangeTimeout = setTimeout(() => {
      const newZoomLevel = this.detectZoomLevel();
      
      if (Math.abs(newZoomLevel - this.currentZoomLevel) > 0.02) {
        console.log(`YoYo Clicker: Zoom change detected via event: ${this.currentZoomLevel} → ${newZoomLevel}`);
        this.handleZoomLevelChange(newZoomLevel);
      }
    }, 50); // Faster response time
  }

  handleZoomLevelChange(newZoomLevel) {
    // Store the current position and old zoom before changing
    const currentPosition = this.getCurrentPosition();
    const oldZoom = this.currentZoomLevel;
    
    // Update the zoom level
    this.currentZoomLevel = newZoomLevel;
    
    // Update scale and position
    this.updateScaleAndPosition(currentPosition, oldZoom, newZoomLevel);
    
    // Always ensure the element is visible after zoom changes
    setTimeout(() => {
      this.ensureElementIsVisible();
    }, 100);
  }

  detectFullscreenState() {
    // Standard fullscreen API detection
    const standardFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    // YouTube specific detection
    const youtubeFullscreen = !!(
      document.querySelector('.html5-video-player.ytp-fullscreen') ||
      document.querySelector('.html5-video-container.ytp-fullscreen') ||
      document.querySelector('#movie_player.ytp-fullscreen')
    );

    // Bilibili specific detection
    const bilibiliFullscreen = !!(
      document.querySelector('.bpx-player-container[data-screen="full"]') ||
      document.querySelector('.bilibili-player-video-wrap[data-screen="full"]') ||
      document.querySelector('.squirtle-video-fullscreen') ||
      document.body.classList.contains('player-full-win')
    );

    // Window size detection (fallback)
    const windowFullscreen = (
      window.innerHeight === screen.height &&
      window.innerWidth === screen.width
    );

    const isFullscreen = standardFullscreen || youtubeFullscreen || bilibiliFullscreen || windowFullscreen;
    
    console.log('YoYo Clicker: Fullscreen detection -', {
      standard: standardFullscreen,
      youtube: youtubeFullscreen, 
      bilibili: bilibiliFullscreen,
      window: windowFullscreen,
      final: isFullscreen
    });

    return isFullscreen;
  }

  handleFullscreenChange() {
    const isFullscreen = this.detectFullscreenState();
    
    console.log('YoYo Clicker: Fullscreen detection triggered');
    console.log('YoYo Clicker: document.fullscreenElement:', document.fullscreenElement);
    console.log('YoYo Clicker: document.webkitFullscreenElement:', document.webkitFullscreenElement);
    console.log('YoYo Clicker: Final isFullscreen state:', isFullscreen);
    
    if (this.pointsDisplay) {
      if (isFullscreen) {
        // Increase z-index to appear above fullscreen content
        this.pointsDisplay.style.zIndex = '2147483647'; // Maximum z-index
        this.pointsDisplay.style.position = 'fixed';
        this.pointsDisplay.style.pointerEvents = 'auto';
        
        // Also update menu dropdown z-index if it exists
        if (this.menuDropdown) {
          this.menuDropdown.style.zIndex = '2147483647';
        }
        
        // Try appending to fullscreen element if it exists
        const fullscreenEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (fullscreenEl && fullscreenEl !== document.body) {
          console.log('YoYo Clicker: Moving display to fullscreen element');
          fullscreenEl.appendChild(this.pointsDisplay);
        }
        
        console.log('YoYo Clicker: Elevated display for fullscreen mode');
      } else {
        // Restore normal z-index and move back to body
        this.pointsDisplay.style.zIndex = '10000';
        
        // Move back to document body
        if (this.pointsDisplay.parentNode !== document.body) {
          document.body.appendChild(this.pointsDisplay);
        }
        
        // Restore menu dropdown z-index
        if (this.menuDropdown) {
          this.menuDropdown.style.zIndex = '10002';
        }
        
        console.log('YoYo Clicker: Restored normal display z-index');
      }
    }
    
    // Update fullscreen state and handle existing feedback elements
    this.isFullscreen = isFullscreen;
    this.moveFeedbackElementsToCorrectContainer();
  }

  moveFeedbackElementsToCorrectContainer() {
    // Move any existing feedback elements to the correct container
    const feedbackElements = document.querySelectorAll('.points-feedback');
    let targetContainer = document.body;
    
    if (this.isFullscreen) {
      const fullscreenEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fullscreenEl && fullscreenEl !== document.body) {
        targetContainer = fullscreenEl;
      }
    }
    
    feedbackElements.forEach(element => {
      if (element.parentNode !== targetContainer) {
        console.log('YoYo Clicker: Moving existing feedback element to correct container');
        targetContainer.appendChild(element);
        
        // Update z-index for the moved element
        if (this.isFullscreen) {
          element.style.zIndex = '2147483647';
          element.style.position = 'fixed';
        } else {
          element.style.zIndex = '10001';
        }
      }
    });
  }

  touchStartTime = 0;
  touchCount = 0;

  handleTouchStart(e) {
    if (!this.currentVideo) return;
    
    if (this.isPointsArea(e.target)) {
      this.touchStartTime = Date.now();
      this.touchCount = e.touches.length;
      console.log('Touch started with fingers:', this.touchCount);
    }
  }

  handleTouchEnd(e) {
    if (!this.currentVideo) return;
    
    const touchDuration = Date.now() - this.touchStartTime;
    
    if (touchDuration < 300 && touchDuration > 50) {
      if (this.isPlusArea(e.target)) {
        e.preventDefault();
        console.log('Plus area touched - adding point');
        this.addPoint();
      } else if (this.isMinusArea(e.target)) {
        e.preventDefault();
        console.log('Minus area touched - subtracting point');
        this.subtractPoint();
      } else if (this.isPointsArea(e.target)) {
        e.preventDefault();
        console.log('Points area touched with fingers:', this.touchCount);
        
        if (this.touchCount >= 2) {
          console.log('Multi-finger touch - subtracting point');
          this.subtractPoint();
        } else {
          console.log('Single finger touch - adding point');
          this.addPoint();
        }
      }
    }
  }

  handleWheel(e) {
    // Disabled scroll functionality to prevent accidental point changes
    // Users can still use left/right click for point tracking
    return;
  }

  handleContextMenu(e) {
    // Check if the right-click is on any YoYo Clicker element (but not drag handle)
    if (this.isYoYoClickerElement(e.target) && !this.isDragHandle(e.target)) {
      // Prevent the browser context menu from appearing
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('Context menu prevented on YoYo Clicker extension');
      
      // Only handle as subtract gesture if it's in the points area (not menu/buttons)
      if (this.isPointsArea(e.target)) {
        this.handleAllMouseEvents(e, 'contextmenu');
      }
      return false;
    }
    
    // Allow normal context menu for other elements (including drag handle)
    return true;
  }

  handleKeydown(e) {
    // Show extension with Ctrl+Y (works even without video)
    if (e.key === 'y' && e.ctrlKey) {
      e.preventDefault();
      console.log('Ctrl+Y pressed - showing extension');
      if (!this.pointsDisplay || this.pointsDisplay.style.display === 'none') {
        if (!this.pointsDisplay) {
          this.createPointsDisplay();
          this.loadPoints();
        } else {
          this.showExtension();
        }
      }
      return;
    }
    
    // Reset works with or without video when extension is visible
    if (e.key === 'r' && e.ctrlKey && this.pointsDisplay && this.pointsDisplay.style.display !== 'none') {
      e.preventDefault();
      this.resetPoints();
    }
  }


  handleAllMouseEvents(e, eventType) {
    console.log(`EVENT: ${eventType}, button: ${e.button}, buttons: ${e.buttons}, detail: ${e.detail}, target:`, e.target.className);
    
    // CRITICAL: Prevent event bubbling for YoYo Clicker, but allow drag handle to work
    // Exception: Don't prevent events on drag handle to allow dragging functionality
    if ((this.isPointsArea(e.target) || this.isYoYoClickerElement(e.target)) && !this.isDragHandle(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('YoYo Clicker: Event bubbling prevented to protect fullscreen mode');
    }
    
    // Handle scale controls (works with or without video)
    if (e.target.classList.contains('scale-decrease') && (eventType === 'mousedown' || eventType === 'pointerdown')) {
      this.decreaseScale();
      return;
    } else if (e.target.classList.contains('scale-increase') && (eventType === 'mousedown' || eventType === 'pointerdown')) {
      this.increaseScale();
      return;
    }
    
    // Handle reset button (works with or without video)
    if (e.target.classList.contains('reset-button') && (eventType === 'mousedown' || eventType === 'pointerdown')) {
      console.log('Reset button clicked');
      this.resetPoints();
      return;
    }
    
    // Handle close button (ALWAYS works, even without video)
    if (e.target.classList.contains('close-button') && (eventType === 'mousedown' || eventType === 'pointerdown')) {
      console.log('Close button clicked');
      this.closeExtension();
      return;
    }
    
    // Handle menu button (works with or without video)
    if (e.target.classList.contains('menu-button') && (eventType === 'mousedown' || eventType === 'pointerdown')) {
      console.log('Menu button clicked');
      this.toggleMenu();
      return;
    }
    
    // Point tracking only works when video is detected
    if (!this.currentVideo) {
      console.log('No video detected - point tracking disabled');
      return;
    }
    
    // Handle points area (but not drag handle) - unified for mouse and trackpad
    if (this.isPointsArea(e.target) && !this.isDragHandle(e.target)) {
      // Create unique gesture ID based on time and action type, not event details
      const now = Date.now();
      const isRightClick = (eventType === 'contextmenu' || 
                           (eventType === 'auxclick' && e.button === 1) ||
                           ((eventType === 'mousedown' || eventType === 'pointerdown') && e.button === 2));
      
      const gestureType = isRightClick ? 'subtract' : 'add';
      const gestureId = `${gestureType}-${now}`;
      
      // Windows-specific deduplication: longer timeout for right-click events
      const dedupeTimeout = isRightClick ? 100 : 30;
      
      // Check if we've already processed this gesture type recently
      const lastGestureKey = `last${gestureType.charAt(0).toUpperCase() + gestureType.slice(1)}Time`;
      if (this[lastGestureKey] && (now - this[lastGestureKey]) < dedupeTimeout) {
        console.log(`Duplicate ${gestureType} gesture detected within ${dedupeTimeout}ms, ignoring`);
        return;
      }
      
      // RIGHT CLICK / TWO-FINGER TAP = MINUS POINT
      if (isRightClick) {
        console.log(`Right-click/Two-finger tap detected via ${eventType} (button: ${e.button})`);
        this.queueGesture('subtract', gestureId);
        return;
      }
      
      // LEFT CLICK / SINGLE-FINGER TAP = PLUS POINT
      if ((eventType === 'mousedown' || eventType === 'pointerdown') && e.button === 0) {
        console.log(`Left-click/Single-finger tap detected via ${eventType}`);
        this.queueGesture('add', gestureId);
        return;
      }
    }
  }

  isDragHandle(element) {
    return element.classList.contains('draggable-header') || 
           element.closest('.draggable-header');
  }

  queueGesture(gestureType, gestureId) {
    const now = Date.now();
    
    // Update the timing property for this gesture type
    const lastGestureKey = `last${gestureType.charAt(0).toUpperCase() + gestureType.slice(1)}Time`;
    this[lastGestureKey] = now;
    
    // Add gesture to pending queue
    this.pendingGestures.push({
      type: gestureType,
      time: now,
      gestureId: gestureId
    });
    
    console.log(`Gesture queued: ${gestureType} (queue length: ${this.pendingGestures.length})`);
    
    // Clear any existing timeout
    if (this.gestureProcessingTimeout) {
      clearTimeout(this.gestureProcessingTimeout);
    }
    
    // Process immediately for single gestures, with delay for conflicts
    const processingDelay = this.pendingGestures.length === 1 ? 20 : 80;
    this.gestureProcessingTimeout = setTimeout(() => {
      this.processGestureQueue();
    }, processingDelay);
  }
  
  processGestureQueue() {
    if (this.pendingGestures.length === 0) return;
    
    console.log(`Processing gesture queue with ${this.pendingGestures.length} gestures`);
    
    // Group gestures by type
    const addGestures = this.pendingGestures.filter(g => g.type === 'add');
    const subtractGestures = this.pendingGestures.filter(g => g.type === 'subtract');
    
    // If we have both types, it's a conflict - prioritize subtract (two-finger tap)
    if (addGestures.length > 0 && subtractGestures.length > 0) {
      console.log('Gesture conflict detected - executing only subtract');
      this.subtractPoint(subtractGestures[0].gestureId);
    }
    // If only subtract gestures, execute one
    else if (subtractGestures.length > 0) {
      console.log(`Processing subtract gesture`);
      this.subtractPoint(subtractGestures[0].gestureId);
    }
    // If only add gestures, execute one
    else if (addGestures.length > 0) {
      console.log(`Processing add gesture`);
      this.addPoint(addGestures[0].gestureId);
    }
    
    // Clear the queue
    this.pendingGestures = [];
    this.gestureProcessingTimeout = null;
  }

  handleGestureStart(e) {
    if (!this.currentVideo) return;
    
    if (this.isPointsArea(e.target)) {
      e.preventDefault();
      this.gestureStarted = true;
      this.gestureFingers = e.targetTouches ? e.targetTouches.length : 1;
      console.log('Gesture started with fingers:', this.gestureFingers);
    }
  }

  handleGestureEnd(e) {
    if (!this.currentVideo || !this.gestureStarted) return;
    
    if (this.isPointsArea(e.target)) {
      e.preventDefault();
      console.log('Gesture ended with fingers:', this.gestureFingers);
      
      if (this.gestureFingers >= 2) {
        console.log('Multi-finger gesture - subtracting point');
        this.subtractPoint();
      } else {
        console.log('Single finger gesture - adding point');
        this.addPoint();
      }
      
      this.gestureStarted = false;
      this.gestureFingers = 0;
    }
  }


  decreaseScale() {
    this.baseScale = Math.max(0.2, this.baseScale - 0.1);
    this.updateScaleForZoom();
    console.log('Base scale decreased to:', this.baseScale);
    // No saveScale() - scale is not persisted
  }

  increaseScale() {
    this.baseScale = Math.min(2.0, this.baseScale + 0.1);
    this.updateScaleForZoom();
    console.log('Base scale increased to:', this.baseScale);
    // No saveScale() - scale is not persisted
  }

  updateScaleForZoom() {
    // Simple scale update without position adjustment (used for manual scale changes)
    this.scale = this.baseScale * this.currentZoomLevel;
    this.scale = Math.max(0.1, Math.min(this.scale, 4.0)); // Allow even smaller scales when combined with zoom
    console.log(`YoYo Clicker: Scale updated - Base: ${this.baseScale}, Zoom: ${this.currentZoomLevel}, Final: ${this.scale}`);
    this.updateScale();
  }

  updateScaleAndPosition(oldPosition, oldZoom, newZoom) {
    // Update scale first
    this.scale = this.baseScale * newZoom;
    this.scale = Math.max(0.1, Math.min(this.scale, 4.0)); // Allow even smaller scales when combined with zoom
    this.updateScale();
    
    // Adjust position proportionally to zoom change if element exists
    if (this.pointsDisplay && oldZoom > 0 && Math.abs(oldZoom - newZoom) > 0.01) {
      this.adjustPositionForZoom(oldPosition, oldZoom, newZoom);
    }
    
    console.log(`YoYo Clicker: Scale and position updated - Base: ${this.baseScale}, Zoom: ${newZoom}, Final: ${this.scale}`);
  }

  getCurrentPosition() {
    if (!this.pointsDisplay) return { x: 30, y: 30 };
    
    let left, top;
    
    // Handle both left and right positioning
    if (this.pointsDisplay.style.left && this.pointsDisplay.style.left !== 'auto') {
      left = parseInt(this.pointsDisplay.style.left) || 0;
    } else if (this.pointsDisplay.style.right && this.pointsDisplay.style.right !== 'auto') {
      const right = parseInt(this.pointsDisplay.style.right) || 30;
      const elementWidth = this.pointsDisplay.offsetWidth;
      left = window.innerWidth - right - elementWidth;
    } else {
      left = 30; // Default fallback
    }
    
    top = parseInt(this.pointsDisplay.style.top) || 30;
    
    return { x: left, y: top };
  }

  ensureVisiblePosition(targetPosition) {
    if (!this.pointsDisplay || !targetPosition) return;
    
    // Force a layout recalculation to get accurate dimensions
    this.pointsDisplay.offsetHeight;
    
    // Get current bounds considering zoom and scale
    const bounds = this.calculateBounds();
    
    // Ensure the target position is within visible bounds
    const clampedX = Math.max(bounds.minX, Math.min(targetPosition.x, bounds.maxX));
    const clampedY = Math.max(bounds.minY, Math.min(targetPosition.y, bounds.maxY));
    
    // Apply the corrected position using left positioning for consistency
    this.pointsDisplay.style.left = clampedX + 'px';
    this.pointsDisplay.style.top = clampedY + 'px';
    this.pointsDisplay.style.right = 'auto'; // Clear right positioning
    
    console.log(`YoYo Clicker: Position ensured - Target: (${targetPosition.x}, ${targetPosition.y}), Final: (${clampedX}, ${clampedY}), Zoom: ${this.currentZoomLevel}, Scale: ${this.scale}`);
  }


  ensureElementIsVisible() {
    if (!this.pointsDisplay) return;
    
    // Force layout recalculation
    this.pointsDisplay.offsetHeight;
    
    // Check if element is actually visible in viewport
    const rect = this.pointsDisplay.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const safetyMargin = 20;
    
    const isVisible = (
      rect.top >= -safetyMargin && 
      rect.left >= -safetyMargin && 
      rect.bottom <= viewportHeight + safetyMargin && 
      rect.right <= viewportWidth + safetyMargin &&
      rect.width > 0 && 
      rect.height > 0
    );
    
    // Also check if element is mostly outside viewport (e.g., only small portion visible)
    const visibleArea = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)) *
                       Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
    const totalArea = rect.width * rect.height;
    const visibilityRatio = totalArea > 0 ? visibleArea / totalArea : 0;
    
    if (!isVisible || visibilityRatio < 0.5) { // If less than 50% visible, reposition
      console.log('YoYo Clicker: Element not sufficiently visible, repositioning...');
      console.log('YoYo Clicker: Element rect:', rect);
      console.log('YoYo Clicker: Viewport:', { width: viewportWidth, height: viewportHeight });
      console.log('YoYo Clicker: Current zoom level:', this.currentZoomLevel, 'Scale:', this.scale);
      console.log('YoYo Clicker: Visibility ratio:', visibilityRatio.toFixed(2));
      
      // Calculate element size considering current scale
      const elementWidth = this.pointsDisplay.offsetWidth * this.scale;
      const elementHeight = this.pointsDisplay.offsetHeight * this.scale;
      
      // Smart repositioning based on available space
      let bestX, bestY;
      
      // Try top-right position first (preferred)
      const topRightX = viewportWidth - elementWidth - 30;
      const topRightY = 30;
      
      if (topRightX >= safetyMargin && topRightY >= safetyMargin) {
        bestX = topRightX;
        bestY = topRightY;
        console.log('YoYo Clicker: Using top-right position');
      } else {
        // Fallback to top-left if top-right doesn't fit
        bestX = safetyMargin;
        bestY = safetyMargin;
        console.log('YoYo Clicker: Using top-left fallback position');
      }
      
      // Final bounds check
      bestX = Math.max(safetyMargin, Math.min(bestX, viewportWidth - elementWidth - safetyMargin));
      bestY = Math.max(safetyMargin, Math.min(bestY, viewportHeight - elementHeight - safetyMargin));
      
      // Apply the position
      this.pointsDisplay.style.left = bestX + 'px';
      this.pointsDisplay.style.top = bestY + 'px';
      this.pointsDisplay.style.right = 'auto';
      
      console.log(`YoYo Clicker: Applied safe position: Left: ${bestX.toFixed(1)}px, Top: ${bestY.toFixed(1)}px`);
      
      // Verify the repositioning worked
      setTimeout(() => {
        const newRect = this.pointsDisplay.getBoundingClientRect();
        const newVisibleArea = Math.max(0, Math.min(newRect.right, viewportWidth) - Math.max(newRect.left, 0)) *
                              Math.max(0, Math.min(newRect.bottom, viewportHeight) - Math.max(newRect.top, 0));
        const newTotalArea = newRect.width * newRect.height;
        const newVisibilityRatio = newTotalArea > 0 ? newVisibleArea / newTotalArea : 0;
        
        console.log('YoYo Clicker: Post-reposition rect:', newRect, 'visibility ratio:', newVisibilityRatio.toFixed(2));
      }, 100);
    } else {
      console.log('YoYo Clicker: Element is sufficiently visible');
    }
  }

  adjustPositionForZoom(oldPosition, oldZoom, newZoom) {
    if (!this.pointsDisplay || oldZoom === newZoom) return;
    
    // Calculate the zoom ratio
    const zoomRatio = newZoom / oldZoom;
    
    // Adjust position proportionally to maintain relative screen position
    let newX = oldPosition.x * zoomRatio;
    let newY = oldPosition.y * zoomRatio;
    
    // Apply enhanced bounds checking with safety margins
    const bounds = this.calculateBounds();
    const safetyMargin = 20; // Minimum distance from viewport edges
    
    // Ensure we stay within viewport with safety margins
    const clampedX = Math.max(safetyMargin, Math.min(newX, Math.max(safetyMargin, bounds.maxX)));
    const clampedY = Math.max(safetyMargin, Math.min(newY, Math.max(safetyMargin, bounds.maxY)));
    
    // If the position would be too close to edges or outside viewport, use safe fallback position
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const elementWidth = this.pointsDisplay.offsetWidth * this.scale;
    const elementHeight = this.pointsDisplay.offsetHeight * this.scale;
    
    if (clampedX + elementWidth > viewportWidth - safetyMargin || 
        clampedY + elementHeight > viewportHeight - safetyMargin ||
        clampedX < safetyMargin || clampedY < safetyMargin) {
      
      // Use safe fallback position - top-right with margins
      const fallbackX = Math.max(safetyMargin, viewportWidth - elementWidth - 30);
      const fallbackY = 30;
      
      this.pointsDisplay.style.left = fallbackX + 'px';
      this.pointsDisplay.style.top = fallbackY + 'px';
      
      console.log(`YoYo Clicker: Using fallback position due to zoom - Fallback: (${fallbackX.toFixed(1)}, ${fallbackY.toFixed(1)}), Zoom ratio: ${zoomRatio.toFixed(2)}`);
    } else {
      // Apply the calculated position
      this.pointsDisplay.style.left = clampedX + 'px';
      this.pointsDisplay.style.top = clampedY + 'px';
      
      console.log(`YoYo Clicker: Position adjusted for zoom - Old: (${oldPosition.x}, ${oldPosition.y}), New: (${clampedX.toFixed(1)}, ${clampedY.toFixed(1)}), Zoom ratio: ${zoomRatio.toFixed(2)}`);
    }
    
    // Always clear right positioning for consistency
    this.pointsDisplay.style.right = 'auto';
  }

  calculateBounds() {
    if (!this.pointsDisplay) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    
    const unscaledWidth = this.pointsDisplay.offsetWidth;
    const unscaledHeight = this.pointsDisplay.offsetHeight;
    const effectiveWidth = unscaledWidth * this.scale;
    const effectiveHeight = unscaledHeight * this.scale;
    
    return {
      minX: 0,
      maxX: window.innerWidth - effectiveWidth,
      minY: 0,
      maxY: window.innerHeight - effectiveHeight
    };
  }

  updateScale() {
    if (this.pointsDisplay) {
      this.pointsDisplay.style.transform = `scale(${this.scale})`;
      const scaleText = this.pointsDisplay.querySelector('.scale-text');
      if (scaleText) {
        // Show base scale in the UI, not the zoom-adjusted scale
        scaleText.textContent = `${Math.round(this.baseScale * 100)}%`;
      }
    }
  }

  isYoYoClickerElement(element) {
    // Check if element is part of YoYo Clicker (including menu dropdown)
    return element.id === 'video-points-display' || 
           element.closest('#video-points-display') ||
           element.classList.contains('points-display') ||
           element.closest('.points-display') ||
           element.classList.contains('menu-dropdown') || 
           element.closest('.menu-dropdown') ||
           element.classList.contains('points-feedback') ||
           element.closest('.points-feedback');
  }

  isPointsArea(element) {
    // Exclude menu dropdown and its children from point tracking
    if (element.classList.contains('menu-dropdown') || 
        element.closest('.menu-dropdown') ||
        element.classList.contains('menu-item') ||
        element.classList.contains('menu-header') ||
        element.classList.contains('menu-separator')) {
      return false;
    }
    
    return element.id === 'video-points-display' || 
           element.closest('#video-points-display') ||
           element.classList.contains('points-display') ||
           element.closest('.points-display');
  }

  isPlusArea(element) {
    return element.id === 'plus-section' ||
           element.closest('#plus-section') ||
           element.classList.contains('plus-section') ||
           element.closest('.plus-section');
  }

  isMinusArea(element) {
    return element.id === 'minus-section' ||
           element.closest('#minus-section') ||
           element.classList.contains('minus-section') ||
           element.closest('.minus-section');
  }

  addPoint(gestureId = null) {
    this.points++;
    this.plusPoints++;
    this.updatePointsDisplay();
    this.showFeedback('+1', '#4CAF50');
    this.savePoints();
    console.log('Point added - Total:', this.points, gestureId ? `(Gesture: ${gestureId})` : '');
  }

  subtractPoint(gestureId = null) {
    this.points--;
    this.minusPoints++;
    this.updatePointsDisplay();
    this.showFeedback('-1', '#f44336');
    this.savePoints();
    console.log('Point subtracted - Total:', this.points, gestureId ? `(Gesture: ${gestureId})` : '');
  }

  resetPoints() {
    this.points = 0;
    this.plusPoints = 0;
    this.minusPoints = 0;
    
    
    this.cleanupFeedbackElements();
    this.updatePointsDisplay();
    this.showFeedback('Reset', '#FF9800');
    this.savePoints();
  }

  closeExtension() {
    // Reset all counts when closing
    this.resetAllCounts();
    
    // Hide the extension
    if (this.pointsDisplay) {
      this.pointsDisplay.style.display = 'none';
    }
    if (this.feedbackDisplay) {
      this.feedbackDisplay.style.display = 'none';
    }
    
    // Save state that extension was closed for this page
    const url = window.location.hostname;
    chrome.storage.local.set({ [`extension_closed_${url}`]: true });
    
    console.log('YoYo Clicker extension closed and reset');
  }

  showExtension() {
    // Reset all counts when showing after being closed
    this.resetAllCounts();
    
    // Reset to default scale
    this.baseScale = 1.0;
    this.updateScaleForZoom();
    
    if (this.pointsDisplay) {
      this.pointsDisplay.style.display = 'block';
      
      // Use smart positioning that considers current zoom and scale
      const elementWidth = this.pointsDisplay.offsetWidth * this.scale;
      const elementHeight = this.pointsDisplay.offsetHeight * this.scale;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const safetyMargin = 30;
      
      // Calculate best default position
      const topRightX = Math.max(safetyMargin, viewportWidth - elementWidth - safetyMargin);
      const topRightY = safetyMargin;
      
      // Apply safe position
      this.pointsDisplay.style.left = topRightX + 'px';
      this.pointsDisplay.style.top = topRightY + 'px';
      this.pointsDisplay.style.right = 'auto';
      
      // Update display to show reset values
      this.updatePointsDisplay();
      
      // Double-check visibility after a short delay
      setTimeout(() => {
        this.ensureElementIsVisible();
      }, 100);
    }
    if (this.feedbackDisplay) {
      this.feedbackDisplay.style.display = 'block';
    }
    
    // Remove closed state
    const url = window.location.hostname;
    chrome.storage.local.remove([`extension_closed_${url}`]);
    
    console.log(`YoYo Clicker extension shown with smart positioning - Left: ${this.pointsDisplay ? this.pointsDisplay.style.left : 'N/A'}, Top: ${this.pointsDisplay ? this.pointsDisplay.style.top : 'N/A'}, Zoom: ${this.currentZoomLevel}, Scale: ${this.scale}`);
  }

  toggleMenu() {
    if (this.menuVisible) {
      this.hideMenu();
    } else {
      this.showMenu();
    }
  }

  showMenu() {
    if (!this.menuDropdown) {
      this.createMenu();
    }
    
    this.menuDropdown.style.display = 'block';
    this.menuVisible = true;
    console.log('Menu shown');
  }

  hideMenu() {
    if (this.menuDropdown) {
      this.menuDropdown.style.display = 'none';
    }
    this.menuVisible = false;
    console.log('Menu hidden');
  }

  createMenu() {
    this.menuDropdown = document.createElement('div');
    this.menuDropdown.className = 'menu-dropdown';
    this.menuDropdown.innerHTML = `
      <div class="menu-header">设置</div>
      <div class="menu-item" data-action="background-light" style="font-size: 14px;">☀️   白昼模式</div>
      <div class="menu-item" data-action="background-dark" style="font-size: 14px;">🌑  暗夜模式</div>
      <div class="menu-item" data-action="background-gradient" style="font-size: 14px;">🔮  渐变模式</div>
      <div class="menu-item" data-action="background-transparent" style="font-size: 14px;">⚪️  通透模式</div>
      <div class="menu-separator"></div>
      <div class="menu-item" data-action="about" style="font-size: 15px;">🪀  关于</div>
    `;
    
    // Apply current background mode to menu
    if (this.backgroundMode === 'dark') {
      this.menuDropdown.classList.add('dark-mode');
    } else if (this.backgroundMode === 'gradient') {
      this.menuDropdown.classList.add('gradient-mode');
    } else if (this.backgroundMode === 'transparent') {
      this.menuDropdown.classList.add('transparent-mode');
    }
    
    // Position menu relative to the main display
    this.pointsDisplay.appendChild(this.menuDropdown);
    
    // Add click handler for menu items
    this.menuDropdown.addEventListener('click', (e) => this.handleMenuClick(e));
  }

  handleMenuClick(e) {
    const action = e.target.getAttribute('data-action');
    if (!action) return;

    this.hideMenu();
    
    switch (action) {
      case 'background-light':
        this.setBackgroundMode('light');
        break;
      case 'background-dark':
        this.setBackgroundMode('dark');
        break;
      case 'background-gradient':
        this.setBackgroundMode('gradient');
        break;
      case 'background-transparent':
        this.setBackgroundMode('transparent');
        break;
      case 'about':
        this.showAbout();
        break;
    }
  }


  showAbout() {
    const about = 'YoYo Clicker v1.3\nDesigned by Shawn Ren';
    this.showFeedback(about, '#607D8B', 5000); // Stay for 5 seconds
  }

  setBackgroundMode(mode) {
    const oldMode = this.backgroundMode;
    
    this.backgroundMode = mode;
    this.updateBackgroundMode();
    this.saveBackgroundMode();
    
    let modeName = 'Light';
    let feedbackColor = '#9C27B0';
    
    if (mode === 'dark') {
      modeName = 'Dark';
      feedbackColor = '#64B5F6';
    } else if (mode === 'gradient') {
      modeName = 'Gradient';
      feedbackColor = '#FF3B94';
    } else if (mode === 'transparent') {
      modeName = 'Transparent';
      feedbackColor = '#ffffff';
    }
    
    this.showFeedback(`${modeName} Mode`, feedbackColor);
    console.log(`YoYo Clicker: Background mode changed from ${oldMode} to ${mode}`);
  }

  updateBackgroundMode() {
    if (this.pointsDisplay) {
      // Remove all background mode classes first
      this.pointsDisplay.classList.remove('dark-mode', 'gradient-mode', 'transparent-mode');
      
      // Add the current background mode class
      if (this.backgroundMode === 'dark') {
        this.pointsDisplay.classList.add('dark-mode');
      } else if (this.backgroundMode === 'gradient') {
        this.pointsDisplay.classList.add('gradient-mode');
      } else if (this.backgroundMode === 'transparent') {
        this.pointsDisplay.classList.add('transparent-mode');
      }
      // Light mode has no additional class (default styling)
    }
    
    // Update menu dropdown if it exists
    if (this.menuDropdown) {
      // Remove all background mode classes first
      this.menuDropdown.classList.remove('dark-mode', 'gradient-mode', 'transparent-mode');
      
      // Add the current background mode class
      if (this.backgroundMode === 'dark') {
        this.menuDropdown.classList.add('dark-mode');
      } else if (this.backgroundMode === 'gradient') {
        this.menuDropdown.classList.add('gradient-mode');
      } else if (this.backgroundMode === 'transparent') {
        this.menuDropdown.classList.add('transparent-mode');
      }
    }
  }

  createPointsDisplay() {
    if (this.pointsDisplay) return;
    
    this.pointsDisplay = document.createElement('div');
    this.pointsDisplay.id = 'video-points-display';
    this.pointsDisplay.className = 'points-display';
    
    // Calculate zoom-aware initial position
    const zoomAdjustedTop = Math.max(10, 30 / this.currentZoomLevel);
    const zoomAdjustedRight = Math.max(10, 30 / this.currentZoomLevel);
    
    // Start at zoom-adjusted position
    this.pointsDisplay.style.top = zoomAdjustedTop + 'px';
    this.pointsDisplay.style.right = zoomAdjustedRight + 'px';
    this.pointsDisplay.style.left = 'auto';
    console.log(`YoYo Clicker: Extension positioned at zoom-adjusted location - Top: ${zoomAdjustedTop}px, Right: ${zoomAdjustedRight}px, Zoom: ${this.currentZoomLevel}`);
    this.pointsDisplay.innerHTML = `
      <div class="points-header draggable-header" id="draggable-header">
        <button class="menu-button" id="menu-button">☰</button>
        YoYo Clicker
        <button class="close-button" id="close-button">×</button>
      </div>
      <div class="points-controls">
        <div class="plus-section" id="plus-section">
          <div class="section-label">加分</div>
          <div class="section-button">+</div>
          <div class="section-count plus-count">0</div>
        </div>
        <div class="points-total">
          <div class="total-label">总分</div>
          <div class="points-value">0</div>
        </div>
        <div class="minus-section" id="minus-section">
          <div class="section-label">扣分</div>
          <div class="section-button">-</div>
          <div class="section-count minus-count">0</div>
        </div>
      </div>
      <div class="scale-section">
        <div class="scale-button scale-decrease">−</div>
        <div class="scale-text">100%</div>
        <div class="scale-button scale-increase">+</div>
      </div>
      <div class="reset-section">
        <button class="reset-button" id="reset-button">重置</button>
      </div>
    `;
    document.body.appendChild(this.pointsDisplay);

    // Add comprehensive event prevention directly to the element
    this.pointsDisplay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('Context menu blocked on points display');
      return false;
    });

    // Prevent double-click events from bubbling to video player (except on drag handle)
    this.pointsDisplay.addEventListener('dblclick', (e) => {
      if (!this.isDragHandle(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('Double-click blocked on points display to protect fullscreen');
        return false;
      }
    });

    // Prevent click events from bubbling (additional safety, except on drag handle)
    this.pointsDisplay.addEventListener('click', (e) => {
      if (!this.isDragHandle(e.target)) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('Click event stopped from bubbling');
      }
    });

    this.feedbackDisplay = document.createElement('div');
    this.feedbackDisplay.id = 'video-points-feedback';
    this.feedbackDisplay.className = 'points-feedback hidden';
    document.body.appendChild(this.feedbackDisplay);
    
    // Apply current background mode
    this.updateBackgroundMode();
    
    this.setupDragFunctionality();
    
    // Ensure element is visible after creation
    setTimeout(() => {
      this.ensureElementIsVisible();
    }, 100);
    
    console.log('YoYo Clicker: Display created');
  }

  updatePointsDisplay() {
    if (this.pointsDisplay) {
      const valueElement = this.pointsDisplay.querySelector('.points-value');
      const plusCountElement = this.pointsDisplay.querySelector('.plus-count');
      const minusCountElement = this.pointsDisplay.querySelector('.minus-count');
      
      if (valueElement) {
        valueElement.textContent = this.points;
        valueElement.style.color = this.points >= 0 ? '#4CAF50' : '#f44336';
      }
      
      if (plusCountElement) {
        plusCountElement.textContent = this.plusPoints;
      }
      
      if (minusCountElement) {
        minusCountElement.textContent = this.minusPoints;
      }
    }
  }

  getCascadingPosition(isAddEffect) {
    // Get the current position in the 5-point cycle
    const position = isAddEffect ? 
      (this.addEffectCount % 5) : 
      (this.minusEffectCount % 5);
    
    // Define cascade pattern positions (relative offsets)
    const cascadePattern = [
      { x: 0, y: 0 },      // Position 1: Start (top-left)
      { x: 80, y: 40 },    // Position 2: Right-down from 1
      { x: 80, y: 80 },    // Position 3: Down from 2  
      { x: 0, y: 120 },    // Position 4: Left-down from 3
      { x: 40, y: 160 }    // Position 5: Center-down from 4
    ];
    
    return cascadePattern[position];
  }

  showFeedback(text, color, duration = 800) {
    // Create a new feedback element for each action
    const feedbackElement = document.createElement('div');
    let modeClass = '';
    if (this.backgroundMode === 'dark') {
      modeClass = ' dark-mode';
    } else if (this.backgroundMode === 'gradient') {
      modeClass = ' gradient-mode';
    } else if (this.backgroundMode === 'transparent') {
      modeClass = ' transparent-mode';
    }
    feedbackElement.className = `points-feedback visible${modeClass}`;
    
    // Debug logging
    console.log(`YoYo Clicker: Creating feedback "${text}" with background mode: ${this.backgroundMode}, class: ${feedbackElement.className}`);
    
    // Handle multi-line text for about section
    if (text.includes('\n')) {
      const lines = text.split('\n');
      feedbackElement.innerHTML = `
        <div style="font-size: 32px; font-weight: bold;">${lines[0]}</div>
        <div style="font-size: 18px; font-weight: normal; margin-top: 8px; opacity: 0.8;">${lines[1]}</div>
      `;
    } else {
      feedbackElement.textContent = text;
    }
    
    feedbackElement.style.color = color;
    
    // Default positions (fallback if no video)
    let feedbackX = 50;
    let feedbackY = 50;
    
    if (this.currentVideo) {
      const videoRect = this.currentVideo.getBoundingClientRect();
      const videoWidth = videoRect.width;
      const videoHeight = videoRect.height;
      
      // Position based on feedback type
      if (text === '+1') {
        // Add points: Cascading pattern from top-left
        const cascade = this.getCascadingPosition(true);
        feedbackX = videoRect.left + 20 + cascade.x;
        feedbackY = videoRect.top + 20 + cascade.y;
        this.addEffectCount++;
      } else if (text === '-1') {
        // Minus points: Cascading pattern from top-right
        const cascade = this.getCascadingPosition(false);
        feedbackX = videoRect.left + videoWidth - 180 - cascade.x; // Mirror X for right side
        feedbackY = videoRect.top + 20 + cascade.y;
        this.minusEffectCount++;
      } else if (text === 'Reset') {
        // Reset: Center of video + reset counters
        feedbackX = videoRect.left + (videoWidth / 2) - 60;
        feedbackY = videoRect.top + (videoHeight / 2) - 30;
        this.addEffectCount = 0;
        this.minusEffectCount = 0;
      }
      
      // Ensure feedback stays within viewport
      feedbackX = Math.max(20, Math.min(feedbackX, window.innerWidth - 120));
      feedbackY = Math.max(20, Math.min(feedbackY, window.innerHeight - 80));
    } else {
      // No video fallback - use screen positions with cascade
      if (text === '+1') {
        const cascade = this.getCascadingPosition(true);
        feedbackX = 50 + cascade.x;
        feedbackY = 50 + cascade.y;
        this.addEffectCount++;
      } else if (text === '-1') {
        const cascade = this.getCascadingPosition(false);
        feedbackX = window.innerWidth - 150 - cascade.x;
        feedbackY = 50 + cascade.y;
        this.minusEffectCount++;
      } else if (text === 'Reset') {
        feedbackX = (window.innerWidth / 2) - 60;
        feedbackY = (window.innerHeight / 2) - 30;
        this.addEffectCount = 0;
        this.minusEffectCount = 0;
      }
    }
    
    // Set calculated position
    feedbackElement.style.left = feedbackX + 'px';
    feedbackElement.style.top = feedbackY + 'px';
    
    // Set higher z-index in fullscreen mode and ensure visibility
    if (this.isFullscreen) {
      feedbackElement.style.zIndex = '2147483647'; // Maximum z-index for fullscreen
      feedbackElement.style.position = 'fixed'; // Ensure fixed positioning in fullscreen
      feedbackElement.style.pointerEvents = 'none'; // Prevent interference with video controls
    } else {
      feedbackElement.style.zIndex = '10001'; // Normal z-index for non-fullscreen
    }
    
    // Apply zoom-based scaling to feedback effects
    const feedbackScale = this.currentZoomLevel;
    feedbackElement.style.transform = `scale(${feedbackScale})`;
    feedbackElement.style.transformOrigin = 'center center';
    
    // Add to the appropriate container (fullscreen element or body)
    let targetContainer = document.body;
    if (this.isFullscreen) {
      const fullscreenEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fullscreenEl && fullscreenEl !== document.body) {
        targetContainer = fullscreenEl;
        console.log('YoYo Clicker: Appending feedback to fullscreen element');
      }
    }
    targetContainer.appendChild(feedbackElement);
    
    console.log(`Feedback "${text}" shown at position: ${Math.round(feedbackX)}, ${Math.round(feedbackY)}`);
    
    // Start fade out after most of the duration (90% of total time)
    const fadeStartTime = duration * 0.9;
    setTimeout(() => {
      feedbackElement.style.opacity = '0';
      feedbackElement.style.transform = `translateY(-20px) scale(${feedbackScale * 0.8})`;
    }, fadeStartTime);
    
    // Remove after the full duration
    setTimeout(() => {
      if (feedbackElement.parentNode) {
        feedbackElement.parentNode.removeChild(feedbackElement);
      }
    }, duration);
  }

  savePoints() {
    const url = window.location.hostname;
    const data = {
      points: this.points,
      plusPoints: this.plusPoints,
      minusPoints: this.minusPoints,
      lastUpdated: Date.now()
      // Removed scale persistence - extension will always start at default scale
    };
    chrome.storage.local.set({ [`points_${url}`]: data });
  }

  // saveScale() removed - extension will always start at default scale

  saveBackgroundMode() {
    const url = window.location.hostname;
    chrome.storage.local.get([`points_${url}`], (result) => {
      const data = result[`points_${url}`] || {};
      data.backgroundMode = this.backgroundMode;
      data.manualModeTime = Date.now(); // Save timestamp of manual change
      chrome.storage.local.set({ [`points_${url}`]: data });
    });
  }

  loadPoints() {
    const url = window.location.hostname;
    chrome.storage.local.get([`points_${url}`], (result) => {
      const data = result[`points_${url}`];
      
      // Always start with zero counts, but load saved preferences
      this.points = 0;
      this.plusPoints = 0;
      this.minusPoints = 0;
      
      // Always start with default scale (1.0) - no persistence
      this.baseScale = 1.0;
      
      // Check if user has manually set a background mode recently (within last hour)
      if (data && typeof data === 'object') {
        const manualModeTime = data.manualModeTime || 0;
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        if (manualModeTime > oneHourAgo && data.backgroundMode) {
          // Use manual setting if set within last hour
          this.backgroundMode = data.backgroundMode;
          console.log('YoYo Clicker: Using recent manual background mode:', this.backgroundMode);
        } else {
          // Use automatic time-based mode
          this.setAutoBackgroundMode();
        }
      } else {
        this.setAutoBackgroundMode();
      }
      
      // Update the final scale based on current zoom
      this.updateScaleForZoom();
      
      this.updatePointsDisplay();
      this.updateBackgroundMode();
      console.log('YoYo Clicker: Fresh startup - Points: 0, Base scale: 100%, Zoom level:', this.currentZoomLevel, 'Final scale:', this.scale, 'Background mode:', this.backgroundMode);
    });
  }

  setupDragFunctionality() {
    let isDragging = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let startElementX = 0;
    let startElementY = 0;
    
    const dragHandle = this.pointsDisplay.querySelector('#draggable-header');
    
    dragHandle.addEventListener('mousedown', (e) => {
      isDragging = true;
      
      // Only prevent default to avoid text selection, but allow event to flow for drag
      e.preventDefault();
      
      // Record starting positions
      startMouseX = e.clientX;
      startMouseY = e.clientY;
      
      // Get current element position - handle right-positioned elements
      const rect = this.pointsDisplay.getBoundingClientRect();
      let currentLeft, currentTop;
      
      if (this.pointsDisplay.style.left && this.pointsDisplay.style.left !== 'auto') {
        currentLeft = parseInt(this.pointsDisplay.style.left);
      } else {
        // Element is positioned with 'right', convert to left position
        currentLeft = rect.left;
        this.pointsDisplay.style.left = currentLeft + 'px';
        this.pointsDisplay.style.right = 'auto';
      }
      
      currentTop = parseInt(this.pointsDisplay.style.top) || rect.top;
      this.pointsDisplay.style.top = currentTop + 'px';
      
      startElementX = currentLeft;
      startElementY = currentTop;
      
      dragHandle.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      // Prevent default during drag to avoid text selection
      e.preventDefault();
      
      // Calculate mouse movement
      const deltaX = e.clientX - startMouseX;
      const deltaY = e.clientY - startMouseY;
      
      // Apply movement to element position
      const newX = startElementX + deltaX;
      const newY = startElementY + deltaY;
      
      // Get the unscaled dimensions for boundary checking
      const unscaledWidth = this.pointsDisplay.offsetWidth;
      const unscaledHeight = this.pointsDisplay.offsetHeight;
      
      // Calculate the effective size based on scale and transform origin
      const effectiveWidth = unscaledWidth * this.scale;
      const effectiveHeight = unscaledHeight * this.scale;
      
      // With transform-origin: top left, scaling is much more predictable
      // The visual size equals the effective size, and position matches DOM position
      
      const minX = 0; // Can always go to left edge
      const maxX = window.innerWidth - effectiveWidth; // Visual right edge constraint
      const maxY = window.innerHeight - effectiveHeight; // Visual bottom edge constraint
      
      const clampedX = Math.max(minX, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));
      
      // Debug logging (simplified for transform-origin: top left)
      console.log(`DRAG: Scale=${this.scale.toFixed(2)}, Boundaries=[${minX}, ${maxX.toFixed(0)}], NewX=${newX.toFixed(0)}, ClampedX=${clampedX.toFixed(0)}`);
      
      // Apply position
      this.pointsDisplay.style.left = clampedX + 'px';
      this.pointsDisplay.style.top = clampedY + 'px';
      this.pointsDisplay.style.right = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        dragHandle.style.cursor = 'grab';
      }
    });
  }
}

console.log('YoYo Clicker: Script loaded');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('YoYo Clicker: DOM loaded, initializing');
    new VideoPointsTracker();
  });
} else {
  console.log('YoYo Clicker: DOM ready, initializing');
  new VideoPointsTracker();
}
