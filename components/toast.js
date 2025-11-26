/**
 * Toast Notification Component
 */
const Toast = {
  element: null,
  timeout: null,
  
  /**
   * Initialize toast
   */
  init() {
    this.element = document.getElementById('toast');
  },

  /**
   * Show toast message
   */
  show(message, duration = 2000) {
    if (!this.element) this.init();
    
    // Clear existing timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    // Show toast
    this.element.textContent = message;
    this.element.classList.remove('hidden');
    
    // Auto hide
    this.timeout = setTimeout(() => {
      this.hide();
    }, duration);
  },

  /**
   * Hide toast
   */
  hide() {
    if (this.element) {
      this.element.classList.add('hidden');
    }
  }
};

// Initialize
Toast.init();
