/**
 * Dialog Component
 */
const Dialog = {
  element: null,
  contentElement: null,
  currentOptions: [],
  focusedIndex: 0,
  onSelect: null,
  onClose: null,
  isOpen: false,
  
  /**
   * Initialize dialog
   */
  init() {
    this.element = document.getElementById('dialog');
    this.contentElement = document.getElementById('dialog-content');
  },

  /**
   * Show dialog
   */
  show(config) {
    if (!this.element) this.init();
    
    const {
      title = '',
      message = '',
      options = [{ label: 'OK', value: 'ok' }],
      onSelect = () => {},
      onClose = () => {}
    } = config;
    
    document.getElementById('dialog-title').textContent = title;
    document.getElementById('dialog-message').textContent = message;
    
    const optionsContainer = document.getElementById('dialog-options');
    optionsContainer.innerHTML = '';
    
    options.forEach((option, index) => {
      const button = document.createElement('button');
      button.textContent = option.label;
      button.dataset.value = option.value;
      button.dataset.index = index;
      
      if (index === 0) {
        button.focus();
      }
      
      optionsContainer.appendChild(button);
    });
    
    this.currentOptions = options;
    this.focusedIndex = 0;
    this.onSelect = onSelect;
    this.onClose = onClose;
    this.isOpen = true;
    
    this.element.classList.remove('hidden');
    
    // Focus first button
    this.updateFocus();
  },

  /**
   * Hide dialog
   */
  hide() {
    if (this.element) {
      this.element.classList.add('hidden');
    }
    this.isOpen = false;
    
    if (this.onClose) {
      this.onClose();
    }
  },

  /**
   * Move focus
   */
  moveFocus(direction) {
    if (!this.isOpen) return;
    
    this.focusedIndex += direction;
    
    if (this.focusedIndex < 0) {
      this.focusedIndex = this.currentOptions.length - 1;
    } else if (this.focusedIndex >= this.currentOptions.length) {
      this.focusedIndex = 0;
    }
    
    this.updateFocus();
  },

  /**
   * Update focus display
   */
  updateFocus() {
    const buttons = document.querySelectorAll('#dialog-options button');
    buttons.forEach((btn, index) => {
      if (index === this.focusedIndex) {
        btn.focus();
      }
    });
  },

  /**
   * Select current option
   */
  select() {
    if (!this.isOpen) return;
    
    const selectedOption = this.currentOptions[this.focusedIndex];
    
    if (this.onSelect) {
      this.onSelect(selectedOption.value, selectedOption);
    }
    
    this.hide();
  },

  /**
   * Confirm dialog shortcut
   */
  confirm(message, onConfirm, onCancel = () => {}) {
    this.show({
      title: 'Confirm',
      message: message,
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false }
      ],
      onSelect: (value) => {
        if (value) {
          onConfirm();
        } else {
          onCancel();
        }
      }
    });
  },

  /**
   * Alert dialog shortcut
   */
  alert(message, onClose = () => {}) {
    this.show({
      title: 'Alert',
      message: message,
      options: [{ label: 'OK', value: 'ok' }],
      onClose: onClose
    });
  }
};

// Initialize
Dialog.init();
