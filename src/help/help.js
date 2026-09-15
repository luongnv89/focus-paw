/**
 * FocusPaw Help & FAQ Page JavaScript
 * Handles FAQ accordion functionality, theme sync, and accessibility
 */

document.addEventListener('DOMContentLoaded', () => {
  loadThemeSettings();
  initFaqAccordion();
  initKeyboardNavigation();
});

/**
 * Load theme settings from Chrome storage
 * Syncs with the dark/light mode preference set in dashboard settings
 */
function loadThemeSettings() {
  // Check if chrome.storage is available (extension context)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['darkMode', 'settings', 'colorBlindMode'], (result) => {
      // Default is dark mode (true)
      const isDarkMode = result.darkMode !== false;

      if (!isDarkMode) {
        document.body.classList.add('light-mode');
      }

      const fromSettings = result.settings?.highContrastMode;
      if (fromSettings === true || (fromSettings === undefined && result.colorBlindMode)) {
        document.body.classList.add('high-contrast');
      }
    });

    // Listen for storage changes to sync theme in real-time
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') return;

      if (changes.darkMode) {
        if (changes.darkMode.newValue === false) {
          document.body.classList.add('light-mode');
        } else {
          document.body.classList.remove('light-mode');
        }
      }

      if (changes.settings) {
        document.body.classList.toggle(
          'high-contrast',
          Boolean(changes.settings.newValue?.highContrastMode),
        );
      }
    });
  }
}

/**
 * Initialize FAQ accordion behavior
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (!question || !answer) return;

    question.addEventListener('click', () => {
      toggleFaqItem(item, question, answer);
    });
  });
}

/**
 * Toggle a FAQ item open/closed
 * @param {HTMLElement} item - The FAQ item container
 * @param {HTMLElement} question - The question button
 * @param {HTMLElement} answer - The answer content
 */
function toggleFaqItem(item, question, answer) {
  const isOpen = item.classList.contains('open');

  // Close all other items first (optional: remove these lines for multiple open)
  document.querySelectorAll('.faq-item.open').forEach((openItem) => {
    if (openItem !== item) {
      openItem.classList.remove('open');
      openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      openItem.querySelector('.faq-answer').hidden = true;
    }
  });

  if (isOpen) {
    // Close this item
    item.classList.remove('open');
    question.setAttribute('aria-expanded', 'false');
    answer.hidden = true;
  } else {
    // Open this item
    item.classList.add('open');
    question.setAttribute('aria-expanded', 'true');
    answer.hidden = false;
  }
}

/**
 * Initialize keyboard navigation for accessibility
 */
function initKeyboardNavigation() {
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach((question, index) => {
    question.addEventListener('keydown', (e) => {
      handleFaqKeydown(e, faqQuestions, index);
    });
  });
}

/**
 * Handle keyboard navigation within FAQ list
 * @param {KeyboardEvent} e - The keyboard event
 * @param {NodeList} questions - All FAQ question buttons
 * @param {number} currentIndex - Current focused question index
 */
function handleFaqKeydown(e, questions, currentIndex) {
  let targetIndex = currentIndex;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      targetIndex = (currentIndex + 1) % questions.length;
      break;
    case 'ArrowUp':
      e.preventDefault();
      targetIndex = (currentIndex - 1 + questions.length) % questions.length;
      break;
    case 'Home':
      e.preventDefault();
      targetIndex = 0;
      break;
    case 'End':
      e.preventDefault();
      targetIndex = questions.length - 1;
      break;
    default:
      return;
  }

  questions[targetIndex].focus();
}
