

(function() {
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const signButton = document.getElementById('signButton') as HTMLButtonElement;
  const buttonText = document.getElementById('buttonText') as HTMLSpanElement;
  const loadingSpinner = document.getElementById('loadingSpinner') as HTMLSpanElement;

  function setLoading(isLoading: boolean): void {
    signButton.disabled = isLoading;
    loadingSpinner.style.display = isLoading ? 'inline-block' : 'none';
    buttonText.textContent = isLoading ? 'Signing...' : 'Sign with Wallet';
  }

  function updateStatus(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
    statusDiv.className = type;
    statusDiv.textContent = message;
  }

  signButton.addEventListener('click', async () => {
    try {
      setLoading(true);
      updateStatus('Connecting to wallet...');

      const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO Demo');
      if (extensions.length === 0) {
        throw new Error('No extension found');
      }

      const injector = await window.polkadotExtensionDapp.web3FromAddress(window.CHALLENGE_DATA.address);
      if (!injector?.signer?.signRaw) {
        throw new Error('Wallet does not support message signing');
      }

      updateStatus('Please sign the message in your wallet...', 'info');
      const { signature } = await injector.signer.signRaw({
        address: window.CHALLENGE_DATA.address,
        data: window.CHALLENGE_DATA.message,
        type: 'bytes'
      });

      updateStatus('Message signed! Verifying...', 'success');
      
      window.location.href = '/verify?signature=' + 
        encodeURIComponent(signature) +
        '&challenge_id=' + window.CHALLENGE_DATA.challengeId +
        '&address=' + encodeURIComponent(window.CHALLENGE_DATA.address) +
        '&code_verifier=' + encodeURIComponent(window.CHALLENGE_DATA.codeVerifier) +
        '&state=' + encodeURIComponent(window.CHALLENGE_DATA.state);

    } catch (error) {
      console.error('Signing error:', error);
      updateStatus(error instanceof Error ? error.message : 'Unknown error', 'error');
    } finally {
      setLoading(false);
    }
  });
})();
