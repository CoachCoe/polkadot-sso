const statusDiv = document.getElementById('status');
const connectButton = document.getElementById('connectButton');
const buttonText = document.getElementById('buttonText');
const loadingSpinner = document.getElementById('loadingSpinner');

function setLoading(isLoading) {
  connectButton.disabled = isLoading;
  loadingSpinner.style.display = isLoading ? 'inline-block' : 'none';
  buttonText.textContent = isLoading ? 'Connecting...' : 'Connect Wallet';
}

function updateStatus(message, type = 'info') {
  statusDiv.className = type;
  statusDiv.textContent = message;
}

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
    setLoading(true);
    updateStatus('Checking for extension...');
    
    // Wait for extension to be injected
    const extension = await waitForExtension();
    if (!extension) {
      throw new Error('Please install Polkadot.js extension first');
    }

    updateStatus('Enabling extension...');
    
    // Enable the extension
    const enabledExtension = await extension.enable(window.SSO_CONFIG.appName);
    if (!enabledExtension) {
      throw new Error('Failed to enable extension');
    }

    updateStatus('Requesting account access...');
    
    // Get accounts
    const accounts = await enabledExtension.accounts.get();
    console.log('Found accounts:', accounts);

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please create an account in Polkadot.js extension');
    }

    // If there are multiple accounts, show account selection
    if (accounts.length > 1) {
      updateStatus('Please select an account');
      showAccountSelection(accounts);
      return;
    }

    updateStatus('Account found, proceeding...', 'success');
    
    // Proceed with the first account if only one exists
    proceedWithAddress(accounts[0].address);

  } catch (error) {
    console.error('Connection error:', error);
    updateStatus(error.message, 'error');
  } finally {
    setLoading(false);
  }
});

function showAccountSelection(accounts) {
  // Create account selection dropdown
  const selectContainer = document.createElement('div');
  selectContainer.className = 'account-select-container';
  
  const select = document.createElement('select');
  select.id = 'accountSelect';
  select.className = 'account-select';
  
  accounts.forEach((account, index) => {
    const option = document.createElement('option');
    option.value = account.address;
    option.textContent = `${account.meta.name || `Account ${index + 1}`} (${account.address.slice(0, 8)}...)`;
    select.appendChild(option);
  });

  const continueButton = document.createElement('button');
  continueButton.textContent = 'Continue';
  continueButton.className = 'continue-button';
  continueButton.onclick = () => {
    const selectedAddress = select.value;
    if (selectedAddress) {
      proceedWithAddress(selectedAddress);
    }
  };

  selectContainer.appendChild(select);
  selectContainer.appendChild(continueButton);

  // Insert after status div
  statusDiv.parentNode.insertBefore(selectContainer, statusDiv.nextSibling);
  connectButton.style.display = 'none';
}

function proceedWithAddress(address) {
  if (!window.SSO_CONFIG.clientId) {
    throw new Error('Client ID not found');
  }

  window.location.href = '/challenge?address=' + 
    encodeURIComponent(address) + 
    '&client_id=' + encodeURIComponent(window.SSO_CONFIG.clientId);
}

// Log initial extension status for debugging
console.log('Initial extension status:', window.injectedWeb3);
