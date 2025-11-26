/**
 * Home View
 */
const HomeView = {
  menuItems: [
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'history', icon: '📜', label: 'History' },
    { id: 'favorites', icon: '❤️', label: 'Favorites' },
    { id: 'playlists', icon: '📁', label: 'Playlists' },
    { id: 'trending', icon: '🔥', label: 'Trending' },
    { id: 'nowplaying', icon: '🎵', label: 'Now Playing' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ],

  /**
   * Initialize home view
   */
  init() {
    const listElement = document.getElementById('home-menu');
    
    Navigation.registerView('home', {
      listElement: listElement,
      onEnter: () => this.render(),
      onExit: () => {},
      onFocus: () => {},
      softkeys: {
        left: { label: '', handler: () => {} },
        center: { label: 'SELECT', handler: (index) => this.handleSelect(index) },
        right: { label: '', handler: () => {} }
      },
      keyHandler: () => false
    });
  },

  /**
   * Render home menu
   */
  render() {
    const listElement = document.getElementById('home-menu');
    UI.renderList(listElement, this.menuItems, UI.menuItemTemplate);
  },

  /**
   * Handle menu selection
   */
  handleSelect(index) {
    const item = this.menuItems[index];
    
    switch (item.id) {
      case 'search':
        Navigation.navigateTo('search');
        break;
      case 'history':
        Navigation.navigateTo('history');
        break;
      case 'favorites':
        Navigation.navigateTo('favorites');
        break;
      case 'playlists':
        Navigation.navigateTo('playlist');
        break;
      case 'trending':
        this.loadTrending();
        break;
      case 'nowplaying':
        if (Player.currentSong) {
          Navigation.navigateTo('player');
        } else {
          Toast.show('No song playing');
        }
        break;
      case 'settings':
        Navigation.navigateTo('settings');
        break;
    }
  },

  /**
   * Load trending music
   */
  async loadTrending() {
    try {
      UI.showLoading('Loading trending...');
      const results = await API.getTrending();
      UI.hideLoading();
      
      if (results.length > 0) {
        SearchView.showResults(results, 'Trending');
      } else {
        Toast.show('No trending found');
      }
    } catch (error) {
      UI.hideLoading();
      Toast.show('Failed to load trending');
    }
  }
};
