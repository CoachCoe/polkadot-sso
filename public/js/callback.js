// Callback page functionality
function copyCode() {
  // Get the authorization code from the page
  const codeElement = document.querySelector('.code-display');
  if (!codeElement) {
    console.error('Code display element not found');
    return;
  }

  const code = codeElement.textContent;

  navigator.clipboard.writeText(code).then(() => {
    // Show success message
    const button = document.querySelector('.btn-primary');
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('btn-success');

      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('btn-success');
      }, 2000);
    }
  }).catch(err => {
    console.error('Failed to copy: ', err);
    alert('Failed to copy code to clipboard. Please copy manually.');
  });
}

// Initialize callback page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Add any additional initialization logic here
  console.log('Callback page loaded successfully');
});
