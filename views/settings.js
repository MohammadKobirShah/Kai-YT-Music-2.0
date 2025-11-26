/**
 * Settings View
 */
const SettingsView = {
  menuItems: [],

  /**
   * Initialize settings view
   */
  init() {
    const listElement = document.getElementById('settings-menu');
    
    Navigation.registerView('settings', {
      listElement: listElement,
      onEnter: () => this.render(),
      onExit: () => {},
      onFocus: () => {},
      softkeys: {
        left: { label: 'BACK', handler: () => Navigation.goBack() },
        center: { label: 'SELECT', handler: (index) => this.handleSelect(index) },
        right: { label: '', handler: () => {} }
      },
      keyHandler: () => false
    });
  },

  /**
   * Get menu items with current values
   */
  getMenuItems() {
    const settings = Storage.getSettings();
    
    return [
      {
        id: 'quality',
        icon: '🎧',
        label: `Audio Quality: ${settings.quality.toUpperCase()}`
      },
      {
        id: 'volume',
        icon: '🔊',
        label: `Volume: ${settings.volume}%`
      },
      {
        id: 'shuffle',
        icon: '🔀',
        label: `Shuffle: ${settings.shuffle ? 'ON' : 'OFF'}`
      },
      {
        id: 'repeat',
        icon: '🔁',
        label: `Repeat: ${settings.repeat.toUpperCase()}`
      },
      {
        id: 'clearcache',
        icon: '🗑️',
        label: 'Clear Cache'
      },
      {
        id: 'clearhistory',
        icon: '📜',
        label: 'Clear History'
      },
      {
        id: 'about',
        icon: 'ℹ️',
        label: 'About'
      }
    ];
  },

  /**
   * Render settings menu
   */
  render() {
    this.menuItems = this.getMenuItems();
    const listElement = document.getElementById('settings-menu');
    UI.renderList(listElement, this.menuItems, UI.menuItemTemplate);
  },

  /**
   * Handle menu selection
   */
  handleSelect(index) {
    const item = this.menuItems[index];
    const settings = Storage.getSettings();
    
    switch (item.id) {
      case 'quality':
        this.cycleQuality();
        break;
        
      case 'volume':
        this.showVolumeDialog();
        break;
        
      case 'shuffle':
        Player.toggleShuffle();
        this.render();
        break;
        
      case 'repeat':
        Player.toggleRepeat();
        this.render();
        break;
        
      case 'clearcache':
        Dialog.confirm('Clear all cached data?', () => {
          Storage.set(Storage.KEYS.CACHE, {});
          Toast.show('Cache cleared');
        });
        break;
        
      case 'clearhistory':
        Dialog.confirm('Clear all history?', () => {
          Storage.clearHistory();
          Toast.show('History cleared');
        });
        break;
        
      case 'about':
        this.showAbout();
        break;
    }
  },

  /**
   * Cycle through quality options
   */
  cycleQuality() {
    const qualities = ['low', 'medium', 'high'];
    const current = Storage.getSetting('quality') || 'medium';
    const currentIndex = qualities.indexOf(current);
    const newQuality = qualities[(currentIndex + 1) % qualities.length];
    
    Storage.updateSettings({ quality: newQuality });
    Toast.show(`Quality: ${newQuality.toUpperCase()}`);
    this.render();
  },

  /**
   * Show volume dialog
   */
  showVolumeDialog() {
    Dialog.show({
      title: 'Volume',
      message: `Current: ${Player.volume}%`,
      options: [
        { label: '25%', value: 25 },
        { label: '50%', value: 50 },
        { label: '75%', value: 75 },
        { label: '100%', value: 100 },
        { label: 'Cancel', value: 'cancel' }
      ],
      onSelect: (value) => {
        if (value !== 'cancel') {
          Player.setVolume(value);
          this.render();
        }
      }
    });
  },

  /**
   * Show about dialog
   */
  showAbout() {
    Dialog.alert(
      'KaiYT Music v2.0.0\n\n' +
      'A YouTube Music client for KaiOS\n\n' +
      'Controls:\n' +
      '* - Volume Down\n' +
      '# - Volume Up\n' +
      '0 - Toggle Shuffle\n' +
      '1 - Toggle Repeat\n' +
      'Left/Right - Seek'
    );
  }
};
