// Theme-specific JavaScript
(function() {
  'use strict';

  // Theme initialization
  window.theme = window.theme || {};

  theme.init = function() {
    theme.initCache();
    theme.initAnimations();
    theme.initProductCards();
    theme.initCollections();
    theme.initNewsletter();
  };

  theme.initCache = function() {
    theme.cache = {
      window: window,
      document: document,
      body: document.body,
      html: document.documentElement
    };
  };

  theme.initAnimations = function() {
    // Add floating shapes
    const shapesContainer = document.createElement('div');
    shapesContainer.className = 'floating-shapes';
    shapesContainer.innerHTML = `
      <div class="shape-circle shape-1"></div>
      <div class="shape-triangle shape-2"></div>
      <div class="shape-square shape-3"></div>
      <div class="shape-circle shape-4"></div>
      <div class="shape-triangle shape-5"></div>
    `;
    document.body.appendChild(shapesContainer);

    // Parallax effect for shapes
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const shapes = document.querySelectorAll('.floating-shapes > *');
      
      shapes.forEach((shape, index) => {
        const speed = 0.5 + (index * 0.1);
        shape.style.transform = `translateY(${scrolled * speed}px)`;
      });
    });
  };

  theme.initProductCards = function() {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
      // Add hover effect
      card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) rotate(-1deg)';
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.transform = '';
      });
      
      // Quick view functionality
      const quickViewBtn = card.querySelector('[data-quick-view]');
      if (quickViewBtn) {
        quickViewBtn.addEventListener('click', function(e) {
          e.preventDefault();
          const productHandle = this.dataset.productHandle;
          theme.openQuickView(productHandle);
        });
      }
    });
  };

  theme.initCollections = function() {
    // Collection filtering
    const filterButtons = document.querySelectorAll('[data-collection-filter]');
    
    filterButtons.forEach(button => {
      button.addEventListener('click', function() {
        const filter = this.dataset.collectionFilter;
        theme.filterProducts(filter);
      });
    });

    // Sort functionality
    const sortSelect = document.querySelector('[data-sort-by]');
    if (sortSelect) {
      sortSelect.addEventListener('change', function() {
        const sortValue = this.value;
        theme.sortProducts(sortValue);
      });
    }
  };

  theme.initNewsletter = function() {
    const newsletterForm = document.querySelector('[data-newsletter-form]');
    
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = this.querySelector('input[type="email"]').value;
        
        // Submit to Shopify
        fetch('/contact#newsletter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: `form_type=customer&utf8=✓&contact[email]=${encodeURIComponent(email)}&contact[tags]=newsletter`
        })
        .then(response => {
          if (response.ok) {
            theme.showNotification('Thanks for subscribing! 🎉', 'success');
            theme.createConfetti();
            this.reset();
          } else {
            theme.showNotification('Something went wrong. Please try again.', 'error');
          }
        })
        .catch(error => {
          console.error('Newsletter error:', error);
          theme.showNotification('Something went wrong. Please try again.', 'error');
        });
      });
    }
  };

  theme.openQuickView = function(handle) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'quick-view-modal';
    modal.innerHTML = `
      <div class="quick-view-modal__overlay"></div>
      <div class="quick-view-modal__content">
        <button class="quick-view-modal__close">&times;</button>
        <div class="quick-view-modal__loading">
          <div class="loading-spinner"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Load product data
    fetch(`/products/${handle}?view=quick-view`)
      .then(response => response.text())
      .then(data => {
        const content = modal.querySelector('.quick-view-modal__content');
        content.innerHTML = `
          <button class="quick-view-modal__close">&times;</button>
          ${data}
        `;
        
        // Reinitialize product form
        theme.initProductForm(content);
      })
      .catch(error => {
        console.error('Quick view error:', error);
        modal.remove();
        document.body.style.overflow = '';
      });
    
    // Close modal
    modal.addEventListener('click', function(e) {
      if (e.target.matches('.quick-view-modal__overlay') || e.target.matches('.quick-view-modal__close')) {
        modal.remove();
        document.body.style.overflow = '';
      }
    });
  };

  theme.initProductForm = function(container) {
    const form = container.querySelector('[data-product-form]');
    if (!form) return;
    
    // Variant selection
    const variantSelects = form.querySelectorAll('[data-variant-select]');
    variantSelects.forEach(select => {
      select.addEventListener('change', function() {
        const selectedOptions = [];
        variantSelects.forEach(s => selectedOptions.push(s.value));
        theme.updateVariant(form, selectedOptions);
      });
    });
    
    // Quantity selector
    const quantityInput = form.querySelector('[data-quantity-input]');
    const quantityButtons = form.querySelectorAll('[data-quantity-button]');
    
    quantityButtons.forEach(button => {
      button.addEventListener('click', function() {
        const currentValue = parseInt(quantityInput.value);
        const action = this.dataset.quantityButton;
        
        if (action === 'increase') {
          quantityInput.value = currentValue + 1;
        } else if (action === 'decrease' && currentValue > 1) {
          quantityInput.value = currentValue - 1;
        }
      });
    });
  };

  theme.updateVariant = function(form, selectedOptions) {
    // Find matching variant
    const variants = JSON.parse(form.dataset.variants);
    const variant = variants.find(v => {
      return v.options.every((option, index) => option === selectedOptions[index]);
    });
    
    if (variant) {
      // Update price
      const priceElement = form.querySelector('[data-product-price]');
      if (priceElement) {
        priceElement.textContent = theme.formatMoney(variant.price);
      }
      
      // Update compare price
      const comparePriceElement = form.querySelector('[data-compare-price]');
      if (comparePriceElement) {
        if (variant.compare_at_price > variant.price) {
          comparePriceElement.textContent = theme.formatMoney(variant.compare_at_price);
          comparePriceElement.style.display = '';
        } else {
          comparePriceElement.style.display = 'none';
        }
      }
      
      // Update variant input
      const variantInput = form.querySelector('[name="id"]');
      if (variantInput) {
        variantInput.value = variant.id;
      }
      
      // Update add to cart button
      const addButton = form.querySelector('[data-add-to-cart]');
      if (addButton) {
        if (variant.available) {
          addButton.textContent = 'Add to Cart';
          addButton.disabled = false;
        } else {
          addButton.textContent = 'Sold Out';
          addButton.disabled = true;
        }
      }
    }
  };

  theme.filterProducts = function(filter) {
    const products = document.querySelectorAll('[data-product-card]');
    
    products.forEach(product => {
      const productTags = product.dataset.productTags.split(',');
      
      if (filter === 'all' || productTags.includes(filter)) {
        product.style.display = '';
        product.classList.add('animate-in');
      } else {
        product.style.display = 'none';
      }
    });
    
    // Update active filter button
    document.querySelectorAll('[data-collection-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.collectionFilter === filter);
    });
  };

  theme.sortProducts = function(sortBy) {
    const container = document.querySelector('[data-products-grid]');
    const products = Array.from(container.querySelectorAll('[data-product-card]'));
    
    products.sort((a, b) => {
      switch(sortBy) {
        case 'price-ascending':
          return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
        case 'price-descending':
          return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
        case 'title-ascending':
          return a.dataset.title.localeCompare(b.dataset.title);
        case 'title-descending':
          return b.dataset.title.localeCompare(a.dataset.title);
        case 'created-descending':
          return new Date(b.dataset.created) - new Date(a.dataset.created);
        case 'created-ascending':
          return new Date(a.dataset.created) - new Date(b.dataset.created);
        default:
          return 0;
      }
    });
    
    // Reorder products in DOM
    products.forEach(product => container.appendChild(product));
  };

  theme.showNotification = function(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button class="notification__close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  };

  theme.createConfetti = function() {
    const colors = ['#5329a6', '#f5f0e6', '#ff4757', '#2ed573', '#ffa502'];
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.cssText = `
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        animation-delay: ${Math.random() * 3}s;
        animation-duration: ${3 + Math.random() * 3}s;
      `;
      
      document.body.appendChild(confetti);
      
      // Remove after animation
      setTimeout(() => {
        confetti.remove();
      }, 6000);
    }
  };

  theme.formatMoney = function(cents) {
    const format = window.theme.moneyFormat || '${{amount}}';
    
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }
    
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    
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
    
    switch (format.match(placeholderRegex)[1]) {
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
    }
    
    return format.replace(placeholderRegex, value);
  };

  // Initialize theme when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', theme.init);
  } else {
    theme.init();
  }
})();