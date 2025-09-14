class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.handleClick.bind(this));
  }

  handleClick(event) {
    if (event.target.matches('.cart-drawer__close') || event.target.matches('.cart-overlay')) {
      this.close();
    }
  }

  open() {
    this.classList.add('open');
    document.querySelector('.cart-overlay')?.classList.add('show');
    document.body.style.overflow = 'hidden';
    this.focus();
    this.trapFocus();
  }

  close() {
    this.classList.remove('open');
    document.querySelector('.cart-overlay')?.classList.remove('show');
    document.body.style.overflow = '';
    this.removeTrapFocus();
  }

  trapFocus() {
    this.focusableElements = this.querySelectorAll(
      'a[href], button, [tabindex]:not([tabindex="-1"]), input, select, textarea'
    );
    this.firstFocusableElement = this.focusableElements[0];
    this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1];
    
    this.handleFocusTrap = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === this.firstFocusableElement) {
            this.lastFocusableElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === this.lastFocusableElement) {
            this.firstFocusableElement.focus();
            e.preventDefault();
          }
        }
      }
      
      if (e.key === 'Escape') {
        this.close();
      }
    };
    
    document.addEventListener('keydown', this.handleFocusTrap);
  }

  removeTrapFocus() {
    document.removeEventListener('keydown', this.handleFocusTrap);
  }
}

customElements.define('cart-drawer', CartDrawer);

class ProductCard extends HTMLElement {
  constructor() {
    super();
    this.form = this.querySelector('form');
    this.form?.addEventListener('submit', this.onSubmitHandler.bind(this));
  }

  onSubmitHandler(evt) {
    evt.preventDefault();
    const submitButton = this.querySelector('[type="submit"]');
    
    if (submitButton.getAttribute('aria-disabled') === 'true') return;

    this.handleErrorMessage();

    submitButton.setAttribute('aria-disabled', true);
    submitButton.classList.add('loading');

    const config = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const formData = new FormData(this.form);
    formData.append('sections', 'cart-drawer,cart-icon-bubble');
    formData.append('sections_url', window.location.pathname);
    
    config.body = JSON.stringify({
      ...Object.fromEntries(formData),
      sections: 'cart-drawer,cart-icon-bubble',
      sections_url: window.location.pathname
    });

    fetch(`${window.routes.cart_add_url}`, config)
      .then((response) => response.json())
      .then((response) => {
        if (response.status) {
          this.handleErrorMessage(response.description);
          return;
        }

        this.updateCart(response);
        this.showNotification('Product added to cart!', 'success');
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        submitButton.classList.remove('loading');
        submitButton.removeAttribute('aria-disabled');
      });
  }

  updateCart(response) {
    const cartDrawer = document.querySelector('cart-drawer');
    const cartIconBubble = document.querySelector('.cart-count');
    
    if (cartDrawer && response.sections['cart-drawer']) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = response.sections['cart-drawer'];
      const newCartDrawer = tempDiv.querySelector('cart-drawer');
      if (newCartDrawer) {
        cartDrawer.innerHTML = newCartDrawer.innerHTML;
      }
    }
    
    if (cartIconBubble && response.sections['cart-icon-bubble']) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = response.sections['cart-icon-bubble'];
      const newCount = tempDiv.querySelector('.cart-count');
      if (newCount) {
        cartIconBubble.textContent = newCount.textContent;
        cartIconBubble.style.display = newCount.textContent === '0' ? 'none' : 'flex';
      }
    }
    
    if (cartDrawer) {
      cartDrawer.open();
    }
  }

  handleErrorMessage(errorMessage = false) {
    this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
    this.errorMessage = this.errorMessage || this.errorMessageWrapper?.querySelector('.product-form__error-message');

    this.errorMessageWrapper?.toggleAttribute('hidden', !errorMessage);

    if (errorMessage) {
      this.errorMessage.textContent = errorMessage;
    }
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button class="notification__close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

customElements.define('product-card', ProductCard);

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    
    this.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', this.onButtonClick.bind(this));
    });
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;
    
    if (event.target.name === 'plus') {
      this.input.stepUp();
    } else {
      this.input.stepDown();
    }
    
    if (previousValue !== this.input.value) {
      this.input.dispatchEvent(this.changeEvent);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

// Cart functionality
class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('cart-item').remove();
      this.updateCart();
    });
  }

  updateCart() {
    const lineItem = this.closest('[data-cart-item]');
    const index = lineItem?.dataset.index;
    
    if (!index) return;

    const body = JSON.stringify({
      line: index,
      quantity: 0,
      sections: 'cart-drawer,cart-icon-bubble',
      sections_url: window.location.pathname
    });

    fetch(`${window.routes.cart_change_url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body
    })
    .then(response => response.json())
    .then(response => {
      // Update cart UI
      this.updateCartUI(response);
    })
    .catch(error => {
      console.error('Error:', error);
    });
  }

  updateCartUI(response) {
    // Implementation for updating cart UI after item removal
    location.reload(); // Simple reload for now
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

// Initialize theme
document.addEventListener('DOMContentLoaded', function() {
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Cart toggle
  const cartToggle = document.querySelector('[data-cart-toggle]');
  const cartDrawer = document.querySelector('cart-drawer');
  
  if (cartToggle && cartDrawer) {
    cartToggle.addEventListener('click', (e) => {
      e.preventDefault();
      cartDrawer.open();
    });
  }

  // Search functionality
  const searchInput = document.querySelector('[data-search-input]');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(function(e) {
      const searchTerm = e.target.value;
      if (searchTerm.length > 2) {
        performSearch(searchTerm);
      }
    }, 300));
  }

  // Mobile menu toggle
  const mobileMenuToggle = document.querySelector('[data-mobile-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  
  if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
      document.body.classList.toggle('menu-open');
    });
  }

  // Intersection Observer for animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, observerOptions);
  
  document.querySelectorAll('[data-animate]').forEach(el => {
    observer.observe(el);
  });
});

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function performSearch(searchTerm) {
  fetch(`${window.routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&section_id=predictive-search`)
    .then(response => response.text())
    .then(data => {
      // Handle search results
      const resultsContainer = document.querySelector('[data-search-results]');
      if (resultsContainer) {
        resultsContainer.innerHTML = data;
        resultsContainer.classList.add('active');
      }
    })
    .catch(error => {
      console.error('Search error:', error);
    });
}

// Currency formatting
function formatMoney(cents, format) {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }
  
  let value = '';
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  const formatString = format || '${{amount}}';
  
  function formatWithDelimiters(number, precision, thousands, decimal) {
    thousands = thousands || ',';
    decimal = decimal || '.';
    
    if (isNaN(number) || number == null) {
      return 0;
    }
    
    number = (number / 100.0).toFixed(precision);
    
    const parts = number.split('.');
    const dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`);
    const centsAmount = parts[1] ? decimal + parts[1] : '';
    
    return dollarsAmount + centsAmount;
  }
  
  switch (formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
    case 'amount_with_apostrophe_separator':
      value = formatWithDelimiters(cents, 2, "'", '.');
      break;
  }
  
  return formatString.replace(placeholderRegex, value);
}