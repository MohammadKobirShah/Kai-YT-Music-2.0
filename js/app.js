/**
 * Main Application Entry Point
 */
const App = {
  /**
   * Initialize application
   */
  init() {
    console.log('KaiYT Music initializing...');
    
    // Initialize all modules
    Storage.init();
    Player.init();
    
    // Initialize views
    HomeView.init();
    SearchView.init();
    PlayerView.init();
    PlaylistView.init();
    SettingsView.init();
    
    // Initialize navigation (must be last)
    Navigation.init();
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App is in background
        if (Player.currentSong) {
          Player.savePosition();
        }
      }
    });
    
    // Handle before unload
    window.addEventListener('beforeunload', () => {
      if (Player.currentSong) {
        Player.savePosition();
      }
    });
    
    console.log('KaiYT Music initialized successfully');
  }
};

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
