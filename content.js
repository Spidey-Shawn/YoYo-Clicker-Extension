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
    this.lastAddTime = 0;
    this.lastSubtractTime = 0;
    this.lastEventId = null; // Track last event to prevent duplicates
    this.addEffectCount = 0; // Track add effect position in sequence
    this.minusEffectCount = 0; // Track minus effect position in sequence
    this.init();
  }

  init() {
    this.detectVideo();
    this.setupEventListeners();
    this.setupFullscreenListeners();
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
    
    // Single comprehensive event handler to avoid duplicates
    document.addEventListener('mousedown', (e) => this.handleAllMouseEvents(e, 'mousedown'));
    document.addEventListener('contextmenu', (e) => this.handleAllMouseEvents(e, 'contextmenu'));
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
    
    // Also handle feedback elements
    this.isFullscreen = isFullscreen;
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
    
    // Handle scale controls (works with or without video)
    if (e.target.classList.contains('scale-decrease') && eventType === 'mousedown') {
      e.preventDefault();
      this.decreaseScale();
      return;
    } else if (e.target.classList.contains('scale-increase') && eventType === 'mousedown') {
      e.preventDefault();
      this.increaseScale();
      return;
    }
    
    // Handle reset button (works with or without video)
    if (e.target.classList.contains('reset-button') && eventType === 'mousedown') {
      e.preventDefault();
      console.log('Reset button clicked');
      this.resetPoints();
      return;
    }
    
    // Handle close button (ALWAYS works, even without video)
    if (e.target.classList.contains('close-button') && eventType === 'mousedown') {
      e.preventDefault();
      console.log('Close button clicked');
      this.closeExtension();
      return;
    }
    
    // Handle menu button (works with or without video)
    if (e.target.classList.contains('menu-button') && eventType === 'mousedown') {
      e.preventDefault();
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
      // Create unique event ID to prevent duplicates
      const eventId = `${eventType}-${e.button}-${e.timeStamp}`;
      
      // Check for duplicate events within 100ms
      if (this.lastEventId === eventId) {
        console.log('Duplicate event detected, ignoring');
        return;
      }
      this.lastEventId = eventId;
      
      // Clear event ID after 100ms to allow new events
      setTimeout(() => {
        if (this.lastEventId === eventId) {
          this.lastEventId = null;
        }
      }, 100);
      
      // RIGHT CLICK / TWO-FINGER TAP = MINUS POINT
      if (eventType === 'contextmenu' || 
          (eventType === 'auxclick' && e.button === 1) ||
          (eventType === 'mousedown' && e.button === 2)) {
        e.preventDefault();
        console.log(`Right-click/Two-finger tap detected via ${eventType} - subtracting point`);
        this.subtractPoint(eventId);
        return;
      }
      
      // LEFT CLICK / SINGLE-FINGER TAP = PLUS POINT
      if (eventType === 'mousedown' && e.button === 0) {
        e.preventDefault();
        console.log(`Left-click/Single-finger tap detected via ${eventType} - adding point`);
        this.addPoint(eventId);
        return;
      }
    }
  }

  isDragHandle(element) {
    return element.classList.contains('draggable-header') || 
           element.closest('.draggable-header');
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
    this.scale = Math.max(0.5, this.scale - 0.1);
    this.updateScale();
    this.saveScale();
  }

  increaseScale() {
    this.scale = Math.min(2.0, this.scale + 0.1);
    this.updateScale();
    this.saveScale();
  }

  updateScale() {
    if (this.pointsDisplay) {
      this.pointsDisplay.style.transform = `scale(${this.scale})`;
      const scaleText = this.pointsDisplay.querySelector('.scale-text');
      if (scaleText) {
        scaleText.textContent = `${Math.round(this.scale * 100)}%`;
      }
    }
  }

  isPointsArea(element) {
    // Exclude menu dropdown and its children
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

  addPoint(eventId = null) {
    const now = Date.now();
    // Prevent very rapid duplicates (within 150ms) for better Windows compatibility
    if (now - this.lastAddTime < 150) {
      console.log('Rapid duplicate add action prevented - too soon after last add');
      return;
    }
    
    this.lastAddTime = now;
    
    this.points++;
    this.plusPoints++;
    this.updatePointsDisplay();
    this.showFeedback('+1', '#4CAF50');
    this.savePoints();
    console.log('Point added - Total:', this.points, eventId ? `(Event: ${eventId})` : '');
  }

  subtractPoint(eventId = null) {
    const now = Date.now();
    // Prevent very rapid duplicates (within 150ms) for better Windows compatibility
    if (now - this.lastSubtractTime < 150) {
      console.log('Rapid duplicate subtract action prevented - too soon after last subtract');
      return;
    }
    
    this.lastSubtractTime = now;
    
    this.points--;
    this.minusPoints++;
    this.updatePointsDisplay();
    this.showFeedback('-1', '#f44336');
    this.savePoints();
    console.log('Point subtracted - Total:', this.points, eventId ? `(Event: ${eventId})` : '');
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
    
    if (this.pointsDisplay) {
      this.pointsDisplay.style.display = 'block';
      // Update display to show reset values
      this.updatePointsDisplay();
    }
    if (this.feedbackDisplay) {
      this.feedbackDisplay.style.display = 'block';
    }
    
    // Remove closed state
    const url = window.location.hostname;
    chrome.storage.local.remove([`extension_closed_${url}`]);
    
    console.log('YoYo Clicker extension shown with reset values');
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
      <div class="menu-header">Settings</div>
      <div class="menu-item" data-action="background-light">🌟 Light Background</div>
      <div class="menu-item" data-action="background-dark">🌙 Dark Background</div>
      <div class="menu-separator"></div>
      <div class="menu-item" data-action="about">ℹ️ About</div>
    `;
    
    // Apply current background mode to menu
    if (this.backgroundMode === 'dark') {
      this.menuDropdown.classList.add('dark-mode');
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
      case 'about':
        this.showAbout();
        break;
    }
  }


  showAbout() {
    const about = 'YoYo Clicker v1.0\nDesigned by Shawn Ren';
    this.showFeedback(about, '#607D8B', 5000); // Stay for 5 seconds
  }

  setBackgroundMode(mode) {
    this.backgroundMode = mode;
    this.updateBackgroundMode();
    this.saveBackgroundMode();
    this.showFeedback(`${mode === 'dark' ? 'Dark' : 'Light'} Mode`, '#9C27B0');
    console.log(`YoYo Clicker: Background mode set to ${mode}`);
  }

  updateBackgroundMode() {
    if (this.pointsDisplay) {
      if (this.backgroundMode === 'dark') {
        this.pointsDisplay.classList.add('dark-mode');
      } else {
        this.pointsDisplay.classList.remove('dark-mode');
      }
    }
    
    // Update menu dropdown if it exists
    if (this.menuDropdown) {
      if (this.backgroundMode === 'dark') {
        this.menuDropdown.classList.add('dark-mode');
      } else {
        this.menuDropdown.classList.remove('dark-mode');
      }
    }
  }

  createPointsDisplay() {
    if (this.pointsDisplay) return;
    
    this.pointsDisplay = document.createElement('div');
    this.pointsDisplay.id = 'video-points-display';
    this.pointsDisplay.className = 'points-display';
    
    // Set initial position explicitly to avoid drag issues
    this.pointsDisplay.style.top = '30px';
    this.pointsDisplay.style.right = '30px';
    this.pointsDisplay.style.left = 'auto';
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

    this.feedbackDisplay = document.createElement('div');
    this.feedbackDisplay.id = 'video-points-feedback';
    this.feedbackDisplay.className = 'points-feedback hidden';
    document.body.appendChild(this.feedbackDisplay);
    
    // Apply current background mode
    this.updateBackgroundMode();
    
    this.setupDragFunctionality();
    
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
    feedbackElement.className = `points-feedback visible${this.backgroundMode === 'dark' ? ' dark-mode' : ''}`;
    
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
    
    // Set higher z-index in fullscreen mode
    if (this.isFullscreen) {
      feedbackElement.style.zIndex = '2147483647'; // Maximum z-index for fullscreen
    }
    
    // Add to page
    document.body.appendChild(feedbackElement);
    
    console.log(`Feedback "${text}" shown at position: ${Math.round(feedbackX)}, ${Math.round(feedbackY)}`);
    
    // Start fade out after most of the duration (90% of total time)
    const fadeStartTime = duration * 0.9;
    setTimeout(() => {
      feedbackElement.style.opacity = '0';
      feedbackElement.style.transform = 'translateY(-20px) scale(0.8)';
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
      scale: this.scale,
      lastUpdated: Date.now()
    };
    chrome.storage.local.set({ [`points_${url}`]: data });
  }

  saveScale() {
    const url = window.location.hostname;
    chrome.storage.local.get([`points_${url}`], (result) => {
      const data = result[`points_${url}`] || {};
      data.scale = this.scale;
      chrome.storage.local.set({ [`points_${url}`]: data });
    });
  }

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
      
      // Restore scale setting
      if (data && typeof data === 'object') {
        this.scale = data.scale || 1.0;
        // Check if user has manually set a background mode recently (within last hour)
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
        this.scale = 1.0;
        this.setAutoBackgroundMode();
      }
      
      this.updatePointsDisplay();
      this.updateScale();
      this.updateBackgroundMode();
      console.log('YoYo Clicker: Points reset to zero, scale restored to', this.scale, 'background mode:', this.backgroundMode);
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
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
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
      
      // Account for transform origin (top right) - the window grows leftward when scaled
      const originOffsetX = (effectiveWidth - unscaledWidth);
      
      const maxX = window.innerWidth - unscaledWidth;
      const maxY = window.innerHeight - effectiveHeight;
      const minX = -originOffsetX; // Allow negative position to account for leftward growth
      
      const clampedX = Math.max(minX, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));
      
      // Apply position
      this.pointsDisplay.style.left = clampedX + 'px';
      this.pointsDisplay.style.top = clampedY + 'px';
      this.pointsDisplay.style.right = 'auto';
      
      e.preventDefault();
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