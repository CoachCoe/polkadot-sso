const statusDiv = document.getElementById('status');
const connectButton = document.getElementById('connectButton');

async function waitForExtension(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    if (window.injectedWeb3 && window.injectedWeb3['polkadot-js']) {
      return window.injectedWeb3['polkadot-js'];
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Polkadot extension not found after waiting');
}

connectButton.addEventListener('click', async () => {
  try {
    statusDiv.textContent = 'Checking for extension...';
    
    // Wait for extension to be injected
    const extension = await waitForExtension();
    if (!extension) {
      throw new Error('Please install Polkadot.js extension first');
    }

    statusDiv.textContent = 'Enabling extension...';
    
    // Enable the extension
    const enabledExtension = await extension.enable(window.SSO_CONFIG.appName);
    if (!enabledExtension) {
      throw new Error('Failed to enable extension');
    }

    statusDiv.textContent = 'Requesting account access...';
    
    // Get accounts
    const accounts = await enabledExtension.accounts.get();
    console.log('Found accounts:', accounts);

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please create an account in Polkadot.js extension');
    }

    statusDiv.textContent = 'Account found, proceeding...';
    
    window.location.href = '/challenge?address=' + 
      encodeURIComponent(accounts[0].address) + 
      '&client_id=' + encodeURIComponent(window.SSO_CONFIG.clientId);

  } catch (error) {
    console.error('Connection error:', error);
    statusDiv.textContent = 'Error: ' + error.message;
  }
});

// Log extension status for debugging
console.log('Extension status:', window.injectedWeb3);
