/// <reference path="../types/window.d.ts" />

(function() {
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const connectButton = document.getElementById('connectButton') as HTMLButtonElement;
  const buttonText = document.getElementById('buttonText') as HTMLSpanElement;
  const loadingSpinner = document.getElementById('loadingSpinner') as HTMLSpanElement;

  function setLoading(isLoading: boolean): void {
    connectButton.disabled = isLoading;
    loadingSpinner.style.display = isLoading ? 'inline-block' : 'none';
    buttonText.textContent = isLoading ? 'Connecting...' : 'Connect Wallet';
  }

  function updateStatus(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
    statusDiv.className = type;
    statusDiv.textContent = message;
  }

  async function waitForExtension(maxAttempts: number = 10): Promise<any> {
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
      
      const extension = await waitForExtension();
      if (!extension) {
        throw new Error('Please install Polkadot.js extension first');
      }

      updateStatus('Enabling extension...');
      
      const enabledExtension = await extension.enable(window.SSO_CONFIG.appName);
      if (!enabledExtension) {
        throw new Error('Failed to enable extension');
      }

      updateStatus('Requesting account access...');
      
      const accounts = await enabledExtension.accounts.get();
      console.log('Found accounts:', accounts);

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please create an account in Polkadot.js extension');
      }

      updateStatus('Account found, proceeding...', 'success');
      
      window.location.href = '/challenge?address=' + 
        encodeURIComponent(accounts[0].address) + 
        '&client_id=' + encodeURIComponent(window.SSO_CONFIG.clientId);

    } catch (error) {
      console.error('Connection error:', error);
      updateStatus(error instanceof Error ? error.message : 'Unknown error', 'error');
    } finally {
      setLoading(false);
    }
  });
})();
