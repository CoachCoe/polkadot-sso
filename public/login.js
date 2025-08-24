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
  console.log('Status:', message, type);
}

// Enhanced wallet connection with wallet type support
connectButton.addEventListener('click', async () => {
  try {
    setLoading(true);
    const walletType = window.SSO_CONFIG.walletType || 'auto';

    updateStatus(`Connecting to ${walletType === 'auto' ? 'wallet' : walletType}...`);

    // Check if the extension is available
    if (!window.polkadotExtensionDapp) {
      throw new Error('Polkadot.js extension not found. Please install the Polkadot.js extension first.');
    }

    updateStatus('Requesting wallet access...');

    // This will definitely prompt the user to select a wallet
    const extensions = await window.polkadotExtensionDapp.web3Enable(window.SSO_CONFIG.appName);
    console.log('Available extensions:', extensions);
    console.log('Extension names:', extensions.map(ext => ext.name));
    console.log('Extension details:', extensions.map(ext => ({ name: ext.name, version: ext.version })));

    if (extensions.length === 0) {
      throw new Error('No wallet extensions found. Please install a Polkadot wallet extension.');
    }

    // If a specific wallet type was selected, try to find it
    let targetExtension = extensions[0];
    if (walletType !== 'auto') {
      const targetExt = extensions.find(ext => {
        const extName = ext.name.toLowerCase();
        if (walletType === 'polkadot-js') {
          return extName.includes('polkadot') || extName.includes('js') || extName.includes('extension');
        } else if (walletType === 'talisman') {
          return extName.includes('talisman');
        } else if (walletType === 'subwallet') {
          return extName.includes('subwallet') || extName.includes('sub');
        } else if (walletType === 'nova') {
          return extName.includes('nova');
        }
        return extName.includes(walletType.toLowerCase());
      });
      if (targetExt) {
        targetExtension = targetExt;
        console.log('Using selected wallet:', targetExt.name);
      }
    }

    updateStatus(`Getting accounts from ${targetExtension.name}...`);

    // Get accounts from the target extension
    let accounts = await targetExtension.accounts.get();
    console.log('Found accounts from target extension:', targetExtension.name, accounts);
    console.log('Target extension object:', targetExtension);
    console.log('Target extension accounts method:', targetExtension.accounts);

    // For polkadot-js, always check ALL extensions to get the maximum number of accounts
    if (walletType === 'polkadot-js') {
      console.log('Checking all extensions for polkadot-js accounts...');
      let allAccounts = [];

      // Check ALL extensions, not just ones with specific names
      for (const ext of extensions) {
        try {
          console.log(`Checking extension: ${ext.name}`);
          console.log(`Extension object:`, ext);
          console.log(`Extension accounts method:`, ext.accounts);
          const extAccounts = await ext.accounts.get();
          console.log(`Extension ${ext.name} has ${extAccounts?.length || 0} accounts:`, extAccounts);
          if (extAccounts && extAccounts.length > 0) {
            console.log(`Adding ${extAccounts.length} accounts from ${ext.name} to allAccounts`);
            allAccounts = allAccounts.concat(extAccounts);
            console.log(`allAccounts now has ${allAccounts.length} accounts:`, allAccounts);
          }
        } catch (error) {
          console.warn(`Error getting accounts from ${ext.name}:`, error);
        }
      }

      // Remove duplicate accounts (in case the same account appears in multiple extensions)
      const uniqueAccounts = allAccounts.filter((account, index, self) =>
        index === self.findIndex(a => a.address === account.address)
      );

      console.log('All accounts before deduplication:', allAccounts);
      console.log('Unique accounts after deduplication:', uniqueAccounts);
      console.log('Original accounts array:', accounts);

      if (uniqueAccounts.length > 0) {
        accounts = uniqueAccounts;
        console.log('Total unique accounts found across all extensions:', uniqueAccounts);
      }
    }

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found in your wallet. Please create an account first.');
    }

    // Always show account selection, even if only one account
    console.log('Final accounts array before showing selection:', accounts);
    console.log('Final accounts length:', accounts.length);
    updateStatus('Please select an account to continue');
    showAccountSelection(accounts);

  } catch (error) {
    console.error('Connection error:', error);
    updateStatus(error.message, 'error');
  } finally {
    setLoading(false);
  }
});

function showAccountSelection(accounts) {
  console.log('Showing account selection for:', accounts);
  console.log('Number of accounts to display:', accounts.length);
  console.log('Accounts array type:', Array.isArray(accounts));
  console.log('Accounts array keys:', Object.keys(accounts));

  // Create account selection dropdown
  const selectContainer = document.createElement('div');
  selectContainer.className = 'account-select-container';

  const select = document.createElement('select');
  select.id = 'accountSelect';
  select.className = 'account-select';

  accounts.forEach((account, index) => {
    console.log(`Creating option for account ${index}:`, account);
    const option = document.createElement('option');
    option.value = account.address;
    option.textContent = `${account.meta?.name || `Account ${index + 1}`} (${account.address.slice(0, 8)}...)`;
    select.appendChild(option);
  });

  const continueButton = document.createElement('button');
  continueButton.textContent = 'Continue with Selected Account';
  continueButton.className = 'continue-button';
  continueButton.onclick = () => {
    const selectedAddress = select.value;
    if (selectedAddress) {
      console.log('Selected account:', selectedAddress);
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

  console.log('Proceeding with address:', address);

  // Store wallet address in localStorage for home page detection
  localStorage.setItem('walletAddress', address);

  updateStatus('Redirecting to challenge page...', 'success');

  // Redirect to challenge page
  window.location.href = '/challenge?address=' +
    encodeURIComponent(address) +
    '&client_id=' + encodeURIComponent(window.SSO_CONFIG.clientId);
}

// Log initial status for debugging
console.log('Login page loaded with config:', window.SSO_CONFIG);
console.log('Polkadot extension available:', !!window.polkadotExtensionDapp);
console.log('InjectedWeb3 available:', !!window.injectedWeb3);
