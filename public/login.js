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
    console.log('=== WALLET CONNECTION STARTED ===');
    setLoading(true);
    const walletType = window.SSO_CONFIG.walletType || 'auto';

    updateStatus(`Connecting to ${walletType === 'auto' ? 'wallet' : walletType}...`);
    console.log('Wallet type:', walletType);

    // Check if the extension is available
    console.log('Checking if polkadotExtensionDapp is available...');
    console.log('window.polkadotExtensionDapp:', window.polkadotExtensionDapp);

    if (!window.polkadotExtensionDapp) {
      console.error('Polkadot extension not found!');
      throw new Error('Polkadot.js extension not found. Please install the Polkadot.js extension first.');
    }

    console.log('Polkadot extension found, checking web3Enable function...');
    if (!window.polkadotExtensionDapp.web3Enable) {
      console.error('web3Enable function not available!');
      throw new Error('Wallet extension not properly loaded. Please refresh the page.');
    }

    updateStatus('Requesting wallet access...');
    console.log('About to call web3Enable...');

    // This will definitely prompt the user to select a wallet
    console.log('Calling web3Enable with app name:', window.SSO_CONFIG.appName);
    const extensions = await window.polkadotExtensionDapp.web3Enable(window.SSO_CONFIG.appName);
    console.log('web3Enable completed successfully');
    console.log('Available extensions:', extensions);
    console.log('Extension names:', extensions.map(ext => ext.name));
    console.log('Extension details:', extensions.map(ext => ({ name: ext.name, version: ext.version })));

    // Check if we need to wait for user authorization
    if (extensions.length === 0) {
      updateStatus('Waiting for wallet authorization...');
      // Wait a bit for user to authorize
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Try again
      const retryExtensions = await window.polkadotExtensionDapp.web3Enable(window.SSO_CONFIG.appName);
      if (retryExtensions.length > 0) {
        extensions.push(...retryExtensions);
        console.log('Found additional extensions after retry:', retryExtensions);
      }
    }

    // Try to get accounts before and after authorization to see if permissions change
    console.log('Checking accounts before authorization...');
    try {
      const preAuthAccounts = await window.polkadotExtensionDapp.web3Accounts();
      console.log('Accounts before authorization:', preAuthAccounts?.length || 0);
    } catch (error) {
      console.log('Could not get accounts before authorization:', error.message);
    }

    // Additional debugging for extensions
    console.log('Final extensions array:', extensions);
    extensions.forEach((ext, index) => {
      console.log(`Extension ${index}:`, {
        name: ext.name,
        version: ext.version,
        hasAccounts: !!ext.accounts,
        accountsType: typeof ext.accounts,
        accountsMethod: ext.accounts?.get ? 'get() method available' : 'no get() method'
      });
    });

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
    console.log('Target extension:', targetExtension);
    console.log('Target extension name:', targetExtension.name);

    // Check if web3Accounts function is available
    console.log('Checking web3Accounts function availability...');
    if (!window.polkadotExtensionDapp.web3Accounts) {
      console.error('web3Accounts function not available');
      throw new Error('Wallet extension not properly loaded. Please refresh the page.');
    }
    console.log('web3Accounts function is available');

    // Try to get accounts directly from the extension first
    console.log('Trying to get accounts directly from extension...');
    try {
      const directAccounts = await targetExtension.accounts.get();
      console.log('Direct extension accounts:', directAccounts?.length || 0, directAccounts);

      if (directAccounts && directAccounts.length > 0) {
        console.log('Using direct extension accounts');
        accounts = directAccounts;
      }
    } catch (error) {
      console.warn('Error getting direct extension accounts:', error);
    }

    // Get accounts using the proper web3Accounts function
    console.log('About to call web3Accounts...');
    let accounts;
    try {
      accounts = await window.polkadotExtensionDapp.web3Accounts();
      console.log('web3Accounts call completed successfully');
      console.log('Found accounts using web3Accounts:', accounts);
    } catch (error) {
      console.error('Error calling web3Accounts:', error);
      throw new Error(`Failed to get accounts: ${error.message}`);
    }

    // Log the accounts structure for debugging
    if (accounts && accounts.length > 0) {
      console.log('First account structure:', accounts[0]);
      console.log('Account keys:', Object.keys(accounts[0]));
      console.log('Total accounts found:', accounts.length);
    } else {
      console.warn('No accounts found from web3Accounts');
    }

    // Check if this is a browser extension issue
    console.log('Checking browser extension status...');
    console.log('window.injectedWeb3:', window.injectedWeb3);
    if (window.injectedWeb3 && window.injectedWeb3['polkadot-js']) {
      console.log('Polkadot.js extension found in injectedWeb3');
      console.log('Extension object:', window.injectedWeb3['polkadot-js']);

      // Try to get accounts directly from the injected extension
      try {
        console.log('Trying to get accounts from injected extension...');
        const injectedAccounts = await window.injectedWeb3['polkadot-js'].enable('Polkadot SSO Demo');
        console.log('Injected extension enable result:', injectedAccounts);

        if (injectedAccounts && injectedAccounts.accounts) {
          console.log('Injected extension accounts:', injectedAccounts.accounts);
          if (injectedAccounts.accounts.length > accounts.length) {
            console.log(`Found more accounts from injected extension: ${injectedAccounts.accounts.length} vs ${accounts.length}`);
            accounts = injectedAccounts.accounts;
          }
        }
      } catch (error) {
        console.warn('Error getting accounts from injected extension:', error);
      }
    } else {
      console.log('Polkadot.js extension NOT found in injectedWeb3');
    }

    // Try to get accounts with different parameters to see if we can get more
    console.log('Trying to get accounts with different parameters...');

    try {
      const accountsWithParams = await window.polkadotExtensionDapp.web3Accounts({
        ss58Format: 0,
        genesisHash: undefined,
        accountType: undefined
      });
      console.log('Found accounts with explicit parameters:', accountsWithParams);

      // If we found more accounts with parameters, use those
      if (accountsWithParams && accountsWithParams.length > accounts.length) {
        console.log(`Found more accounts with parameters: ${accountsWithParams.length} vs ${accounts.length}`);
        accounts = accountsWithParams;
      }
    } catch (error) {
      console.warn('Error getting accounts with explicit parameters:', error);
    }

    // Try to get accounts with different permission levels
    console.log('Trying to get accounts with different permission levels...');
    try {
      // Try to get accounts with explicit permission request
      const accountsWithPermission = await window.polkadotExtensionDapp.web3Accounts({
        ss58Format: 0,
        genesisHash: undefined,
        accountType: undefined,
        // Try to request all accounts explicitly
        allAccounts: true
      });
      console.log('Found accounts with permission request:', accountsWithPermission);

      if (accountsWithPermission && accountsWithPermission.length > accounts.length) {
        console.log(`Found more accounts with permission request: ${accountsWithPermission.length} vs ${accounts.length}`);
        accounts = accountsWithPermission;
      }
    } catch (error) {
      console.warn('Error getting accounts with permission request:', error);
    }

    // Try to get accounts with a different approach - sometimes the extension needs to be asked differently
    console.log('Trying alternative account retrieval method...');
    try {
      // Try to get accounts without any parameters first
      const accountsNoParams = await window.polkadotExtensionDapp.web3Accounts();
      console.log('Accounts without parameters:', accountsNoParams);

      // Then try with explicit request for all accounts
      const accountsAll = await window.polkadotExtensionDapp.web3Accounts({
        ss58Format: 0,
        genesisHash: undefined,
        accountType: undefined
      });
      console.log('Accounts with explicit parameters:', accountsAll);

      // Use whichever method returned more accounts
      if (accountsAll && accountsAll.length > accounts.length) {
        console.log(`Using accounts with explicit parameters: ${accountsAll.length} vs ${accounts.length}`);
        accounts = accountsAll;
      } else if (accountsNoParams && accountsNoParams.length > accounts.length) {
        console.log(`Using accounts without parameters: ${accountsNoParams.length} vs ${accounts.length}`);
        accounts = accountsNoParams;
      }
    } catch (error) {
      console.warn('Error with alternative account retrieval:', error);
    }

    // Try to get accounts with explicit request for ALL accounts
    console.log('Trying to explicitly request ALL accounts...');
    try {
      // Try different approaches to get all accounts
      const allAccountsAttempts = [
        // Method 1: No parameters
        window.polkadotExtensionDapp.web3Accounts(),
        // Method 2: With explicit parameters
        window.polkadotExtensionDapp.web3Accounts({ ss58Format: 0 }),
        // Method 3: With genesis hash (try to get accounts for specific network)
        window.polkadotExtensionDapp.web3Accounts({
          ss58Format: 0,
          genesisHash: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe9' // Polkadot genesis
        }),
        // Method 4: With different account types
        window.polkadotExtensionDapp.web3Accounts({
          ss58Format: 0,
          accountType: 'sr25519'
        }),
        // Method 5: With different account types
        window.polkadotExtensionDapp.web3Accounts({
          ss58Format: 0,
          accountType: 'ed25519'
        })
      ];

      for (let i = 0; i < allAccountsAttempts.length; i++) {
        try {
          const attemptAccounts = await allAccountsAttempts[i];
          console.log(`Attempt ${i + 1} returned ${attemptAccounts?.length || 0} accounts:`, attemptAccounts);

          if (attemptAccounts && attemptAccounts.length > accounts.length) {
            console.log(`Attempt ${i + 1} found more accounts: ${attemptAccounts.length} vs ${accounts.length}`);
            accounts = attemptAccounts;
            break; // Use the first method that finds more accounts
          }
        } catch (attemptError) {
          console.warn(`Attempt ${i + 1} failed:`, attemptError);
        }
      }
    } catch (error) {
      console.warn('Error with explicit ALL accounts request:', error);
    }

    // Try with different ss58Format values
    const ss58Formats = [0, 2, 42, 1];
    for (const format of ss58Formats) {
      try {
        const formatAccounts = await window.polkadotExtensionDapp.web3Accounts({ ss58Format: format });
        console.log(`Found ${formatAccounts?.length || 0} accounts with ss58Format=${format}:`, formatAccounts);

        if (formatAccounts && formatAccounts.length > accounts.length) {
          console.log(`Found more accounts with ss58Format=${format}: ${formatAccounts.length} vs ${accounts.length}`);
          accounts = formatAccounts;
        }
      } catch (error) {
        console.warn(`Error getting accounts with ss58Format=${format}:`, error);
      }
    }

    // For polkadot-js, also try to get accounts from all extensions as a fallback
    if (walletType === 'polkadot-js') {
      console.log('Trying extension-specific methods for polkadot-js...');
      let allAccounts = [...(accounts || [])];

      // Check ALL extensions as a fallback
      for (const ext of extensions) {
        try {
          console.log(`Checking extension: ${ext.name}`);
          if (ext.accounts && typeof ext.accounts.get === 'function') {
            // Try different parameters for the extension's accounts.get() method
            const params = [
              {},
              { ss58Format: 0 },
              { ss58Format: 2 },
              { ss58Format: 42 },
              { genesisHash: undefined },
              { accountType: undefined }
            ];

            for (const param of params) {
              try {
                const extAccounts = await ext.accounts.get(param);
                console.log(`Extension ${ext.name} with params ${JSON.stringify(param)} has ${extAccounts?.length || 0} accounts:`, extAccounts);
                if (extAccounts && extAccounts.length > 0) {
                  console.log(`Adding ${extAccounts.length} accounts from ${ext.name} to allAccounts`);
                  allAccounts = allAccounts.concat(extAccounts);
                  console.log(`allAccounts now has ${allAccounts.length} accounts:`, allAccounts);
                }
              } catch (paramError) {
                console.warn(`Error getting accounts from ${ext.name} with params ${JSON.stringify(param)}:`, paramError);
              }
            }
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
    console.log('Accounts type:', typeof accounts);
    console.log('Accounts constructor:', accounts.constructor.name);

    if (Array.isArray(accounts)) {
      console.log('Accounts is a proper array');
    } else if (accounts && typeof accounts === 'object') {
      console.log('Accounts is an object, converting to array');
      accounts = Object.values(accounts);
    }

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

  // Ensure accounts is an array
  if (!Array.isArray(accounts)) {
    console.error('Accounts is not an array:', accounts);
    if (accounts && typeof accounts === 'object') {
      accounts = Object.values(accounts);
      console.log('Converted accounts to array:', accounts);
    } else {
      accounts = [];
      console.log('Set accounts to empty array');
    }
  }

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
