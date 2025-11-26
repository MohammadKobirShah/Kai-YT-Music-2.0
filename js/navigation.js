/**
 * Navigation Manager
 * Handles views, routing, and keyboard navigation
 */
const Navigation = {
  currentView: null,
  viewStack: [],
  focusedIndex: 0,
  viewConfigs: {},
  keyHandlers: {},
  
  /**
   * Initialize navigation
   */
  init() {
    this.bindEvents();
    this.updateNetworkStatus();
    this.navigateTo('home');
  },

  /**
   * Register a view configuration
   */
  registerView(name, config) {
    this.viewConfigs[name] = {
      element: document.getElementById(`view-${name}`),
      listElement: config.listElement,
      onEnter: config.onEnter || (() => {}),
      onExit: config.onExit || (() => {}),
      onFocus: config.onFocus || (() => {}),
      softkeys: config.softkeys || {},
      keyHandler: config.keyHandler || (() => false)
    };
  },

  /**
   * Navigate to a view
   */
  navigateTo(viewName, params = {}) {
    // Exit current view
    if (this.currentView && this.viewConfigs[this.currentView]) {
      const currentConfig = this.viewConfigs[this.currentView];
      currentConfig.element.classList.remove('active');
      currentConfig.onExit();
    }
    
    // Push to stack if not going back
    if (this.currentView && params.pushStack !== false) {
      this.viewStack.push(this.currentView);
    }
    
    // Enter new view
    this.currentView = viewName;
    const config = this.viewConfigs[viewName];
    
    if (config) {
      config.element.classList.add('active');
      config.onEnter(params);
      this.focusedIndex = 0;
      this.updateFocus();
      this.updateSoftkeys();
    }
    
    // Update header
    this.updateHeader(viewName);
  },

  /**
   * Go back to previous view
   */
  goBack() {
    if (this.viewStack.length > 0) {
      const previousView = this.viewStack.pop();
      this.navigateTo(previousView, { pushStack: false });
      return true;
    }
    return false;
  },

  /**
   * Bind keyboard events
   */
  bindEvents() {
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    window.addEventListener('online', () => this.updateNetworkStatus());
    window.addEventListener('offline', () => this.updateNetworkStatus());
  },

  /**
   * Handle keydown events
   */
  handleKeydown(e) {
    const key = e.key;
    
    // Let view handle key first
    const config = this.viewConfigs[this.currentView];
    if (config && config.keyHandler(key, e)) {
      e.preventDefault();
      return;
    }
    
    // Global key handling
    switch (key) {
      case 'ArrowUp':
        e.preventDefault();
        this.moveFocus(-1);
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        this.moveFocus(1);
        break;
        
      case 'Enter':
        e.preventDefault();
        this.handleSelect();
        break;
        
      case 'SoftLeft':
        e.preventDefault();
        this.handleSoftkey('left');
        break;
        
      case 'SoftRight':
        e.preventDefault();
        this.handleSoftkey('right');
        break;
        
      case 'Backspace':
      case 'EndCall':
        e.preventDefault();
        if (!this.goBack()) {
          // Exit app or minimize
          if (window.close) {
            window.close();
          }
        }
        break;
        
      // Volume controls
      case '*':
        e.preventDefault();
        Player.adjustVolume(-10);
        break;
        
      case '#':
        e.preventDefault();
        Player.adjustVolume(10);
        break;
        
      // Number shortcuts
      case '0':
        e.preventDefault();
        Player.toggleShuffle();
        break;
        
      case '1':
        e.preventDefault();
        Player.toggleRepeat();
        break;
    }
  },

  /**
   * Move focus in list
   */
  moveFocus(direction) {
    const config = this.viewConfigs[this.currentView];
    if (!config || !config.listElement) return;
    
    const items = config.listElement.querySelectorAll('li');
    if (items.length === 0) return;
    
    // Remove current focus
    items.forEach(item => item.classList.remove('focused'));
    
    // Calculate new index
    this.focusedIndex += direction;
    
    if (this.focusedIndex < 0) {
      this.focusedIndex = items.length - 1;
    } else if (this.focusedIndex >= items.length) {
      this.focusedIndex = 0;
    }
    
    // Apply focus
    const focusedItem = items[this.focusedIndex];
    focusedItem.classList.add('focused');
    focusedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    
    // Call onFocus callback
    config.onFocus(this.focusedIndex, focusedItem);
  },

  /**
   * Update focus display
   */
  updateFocus() {
    const config = this.viewConfigs[this.currentView];
    if (!config || !config.listElement) return;
    
    const items = config.listElement.querySelectorAll('li');
    items.forEach((item, index) => {
      item.classList.toggle('focused', index === this.focusedIndex);
    });
    
    if (items[this.focusedIndex]) {
      items[this.focusedIndex].scrollIntoView({ block: 'nearest' });
      config.onFocus(this.focusedIndex, items[this.focusedIndex]);
    }
  },

  /**
   * Handle select (Enter key)
   */
  handleSelect() {
    const config = this.viewConfigs[this.currentView];
    if (!config) return;
    
    if (config.softkeys.center && config.softkeys.center.handler) {
      config.softkeys.center.handler(this.focusedIndex);
    }
  },

  /**
   * Handle softkey press
   */
  handleSoftkey(side) {
    const config = this.viewConfigs[this.currentView];
    if (!config || !config.softkeys[side]) return;
    
    if (config.softkeys[side].handler) {
      config.softkeys[side].handler(this.focusedIndex);
    }
  },

  /**
   * Update softkeys display
   */
  updateSoftkeys() {
    const config = this.viewConfigs[this.currentView];
    const leftEl = document.getElementById('softkey-left');
    const centerEl = document.getElementById('softkey-center');
    const rightEl = document.getElementById('softkey-right');
    
    if (config && config.softkeys) {
      leftEl.textContent = config.softkeys.left ? config.softkeys.left.label : '';
      centerEl.textContent = config.softkeys.center ? config.softkeys.center.label : '';
      rightEl.textContent = config.softkeys.right ? config.softkeys.right.label : '';
    } else {
      leftEl.textContent = '';
      centerEl.textContent = '';
      rightEl.textContent = '';
    }
  },

  /**
   * Set dynamic softkeys
   */
  setSoftkeys(softkeys) {
    if (this.viewConfigs[this.currentView]) {
      this.viewConfigs[this.currentView].softkeys = softkeys;
      this.updateSoftkeys();
    }
  },

  /**
   * Update header
   */
  updateHeader(viewName) {
    const titles = {
      home: 'KaiYT Music',
      search: 'Search',
      player: 'Now Playing',
      playlist: 'Playlist',
      history: 'History',
      favorites: 'Favorites',
      settings: 'Settings'
    };
    
    document.getElementById('header-title').textContent = titles[viewName] || 'KaiYT Music';
  },

  /**
   * Update network status indicator
   */
  updateNetworkStatus() {
    const statusEl = document.getElementById('network-status');
    if (navigator.onLine) {
      statusEl.textContent = '●';
      statusEl.className = 'online';
    } else {
      statusEl.textContent = '○';
      statusEl.className = 'offline';
    }
  },

  /**
   * Get current focused item
   */
  getFocusedItem() {
    const config = this.viewConfigs[this.currentView];
    if (!config || !config.listElement) return null;
    
    const items = config.listElement.querySelectorAll('li');
    return items[this.focusedIndex] || null;
  },

  /**
   * Get focused index
   */
  getFocusedIndex() {
    return this.focusedIndex;
  },

  /**
   * Set focused index
   */
  setFocusedIndex(index) {
    this.focusedIndex = index;
    this.updateFocus();
  }
};
