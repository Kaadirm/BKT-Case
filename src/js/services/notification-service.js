export class NotificationService {
  constructor() {
    this.container = null;
    this.init();
  }

  /**
   * Initialize notification container
   */
  init() {
    // Create notification container if it doesn't exist
    this.container = document.getElementById('notification-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'position-fixed top-0 end-0 p-3';
      this.container.style.zIndex = '1050';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a success notification
   */
  success(message, options = {}) {
    return this._showNotification(message, 'success', options);
  }

  /**
   * Show an error notification
   */
  error(message, options = {}) {
    return this._showNotification(message, 'danger', options);
  }

  /**
   * Show a warning notification
   */
  warning(message, options = {}) {
    return this._showNotification(message, 'warning', options);
  }

  /**
   * Show an info notification
   */
  info(message, options = {}) {
    return this._showNotification(message, 'info', options);
  }

  /**
   * Show a loading notification
   */
  loading(message, options = {}) {
    const notification = this._showNotification(message, 'info', {
      ...options,
      autoHide: false,
      showSpinner: true
    });
    return notification;
  }

  /**
   * Show a custom notification
   */
  _showNotification(message, type = 'info', options = {}) {
    const {
      duration = 5000,
      autoHide = true,
      showSpinner = false,
      showCloseButton = true,
      persistent = false,
      actions = []
    } = options;

    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show notification-item`;
    notification.setAttribute('role', 'alert');

    // Create notification content
    let content = '';
    
    if (showSpinner) {
      content += '<div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>';
    }
    
    content += `<span class="notification-message">${message}</span>`;

    // Add action buttons
    if (actions.length > 0) {
      content += '<div class="mt-2">';
      actions.forEach(action => {
        content += `<button type="button" class="btn btn-sm btn-outline-${type} me-2" data-action="${action.action}">${action.label}</button>`;
      });
      content += '</div>';
    }

    // Add close button
    if (showCloseButton) {
      content += '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
    }

    notification.innerHTML = content;

    // Add event listeners for action buttons
    actions.forEach(action => {
      const button = notification.querySelector(`[data-action="${action.action}"]`);
      if (button && action.handler) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          action.handler(notification);
        });
      }
    });

    // Add to container
    this.container.appendChild(notification);

    // Auto hide if specified
    if (autoHide && !persistent) {
      setTimeout(() => {
        this.hide(notification);
      }, duration);
    }

    // Add close event listener
    const closeButton = notification.querySelector('.btn-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hide(notification);
      });
    }

    return notification;
  }

  /**
   * Hide a specific notification
   */
  hide(notification) {
    if (notification && notification.parentNode) {
      notification.classList.remove('show');
      notification.classList.add('fade');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }

  /**
   * Hide all notifications
   */
  hideAll() {
    const notifications = this.container.querySelectorAll('.notification-item');
    notifications.forEach(notification => this.hide(notification));
  }

  /**
   * Update an existing notification
   */
  update(notification, message, type = null) {
    if (!notification) return;

    const messageElement = notification.querySelector('.notification-message');
    if (messageElement) {
      messageElement.textContent = message;
    }

    if (type) {
      // Remove old type classes
      notification.className = notification.className.replace(/alert-\w+/, `alert-${type}`);
    }
  }

  /**
   * Show confirmation dialog
   */
  confirm(message, options = {}) {
    return new Promise((resolve) => {
      const {
        title = 'Confirm',
        confirmLabel = 'Confirm',
        cancelLabel = 'Cancel',
        type = 'warning'
      } = options;

      const actions = [
        {
          action: 'confirm',
          label: confirmLabel,
          handler: (notification) => {
            this.hide(notification);
            resolve(true);
          }
        },
        {
          action: 'cancel',
          label: cancelLabel,
          handler: (notification) => {
            this.hide(notification);
            resolve(false);
          }
        }
      ];

      this._showNotification(
        `<strong>${title}</strong><br>${message}`,
        type,
        {
          autoHide: false,
          showCloseButton: false,
          actions
        }
      );
    });
  }

  /**
   * Show progress notification
   */
  progress(message, initialProgress = 0) {
    const notification = this._showNotification(
      `${message}<div class="progress mt-2"><div class="progress-bar" role="progressbar" style="width: ${initialProgress}%" aria-valuenow="${initialProgress}" aria-valuemin="0" aria-valuemax="100"></div></div>`,
      'info',
      {
        autoHide: false,
        showCloseButton: false
      }
    );

    return {
      notification,
      updateProgress: (progress, newMessage = null) => {
        const progressBar = notification.querySelector('.progress-bar');
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
          progressBar.setAttribute('aria-valuenow', progress);
        }
        
        if (newMessage) {
          const messageElement = notification.querySelector('.notification-message');
          if (messageElement) {
            messageElement.innerHTML = `${newMessage}<div class="progress mt-2"><div class="progress-bar" role="progressbar" style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div></div>`;
          }
        }
      },
      complete: (successMessage = 'Operation completed successfully') => {
        this.hide(notification);
        this.success(successMessage);
      },
      error: (errorMessage = 'Operation failed') => {
        this.hide(notification);
        this.error(errorMessage);
      }
    };
  }

  /**
   * Show form validation errors
   */
  showValidationErrors(errors, formElement = null) {
    if (Array.isArray(errors)) {
      errors.forEach(error => this.error(error));
    } else if (typeof errors === 'object') {
      Object.entries(errors).forEach(([field, message]) => {
        this.error(`${field}: ${message}`);
        
        // Highlight form field if form element is provided
        if (formElement) {
          const fieldElement = formElement.querySelector(`[name="${field}"]`);
          if (fieldElement) {
            fieldElement.classList.add('is-invalid');
            setTimeout(() => fieldElement.classList.remove('is-invalid'), 5000);
          }
        }
      });
    } else {
      this.error(errors);
    }
  }

  /**
   * Clear validation errors from form
   */
  clearValidationErrors(formElement) {
    if (formElement) {
      const invalidFields = formElement.querySelectorAll('.is-invalid');
      invalidFields.forEach(field => field.classList.remove('is-invalid'));
    }
  }
}
