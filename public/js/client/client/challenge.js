/// <reference path="../types/window.ts" />
const statusDiv = document.getElementById('status');
const signButton = document.getElementById('signButton');
const buttonText = document.getElementById('buttonText');
const loadingSpinner = document.getElementById('loadingSpinner');
function setLoading(isLoading) {
    signButton.disabled = isLoading;
    loadingSpinner.style.display = isLoading ? 'inline-block' : 'none';
    buttonText.textContent = isLoading ? 'Signing...' : 'Sign with Wallet';
}
function updateStatus(message, type = 'info') {
    statusDiv.className = type;
    statusDiv.textContent = message;
}
signButton.addEventListener('click', async () => {
    try {
        setLoading(true);
        updateStatus('Connecting to wallet...');
        const extensions = await window.polkadotExtensionDapp.web3Enable('Polkadot SSO Demo');
        const extension = window.injectedWeb3['polkadot-js'];
        updateStatus('Getting signer...');
        const signRaw = extension.signer?.signRaw;
        if (!signRaw) {
            throw new Error('Wallet does not support message signing');
        }
        updateStatus('Please sign the message in your wallet...', 'info');
        const { signature } = await signRaw({
            address: window.CHALLENGE_DATA.address,
            data: window.CHALLENGE_DATA.message,
            type: 'bytes'
        });
        updateStatus('Message signed! Verifying...', 'success');
        window.location.href = '/verify?signature=' +
            encodeURIComponent(signature) +
            '&challenge_id=' + window.CHALLENGE_DATA.challengeId +
            '&address=' + encodeURIComponent(window.CHALLENGE_DATA.address);
    }
    catch (error) {
        console.error('Signing error:', error);
        updateStatus(error instanceof Error ? error.message : 'Unknown error', 'error');
    }
    finally {
        setLoading(false);
    }
});
export {};
