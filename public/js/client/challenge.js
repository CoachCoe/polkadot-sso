"use strict";
/// <reference path="../types/window.d.ts" />
(function () {
    const statusDiv = document.getElementById('status');
    const signButton = document.getElementById('signButton');
    const buttonText = document.getElementById('buttonText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    function setLoading(isLoading) {
        signButton.disabled = isLoading;
        if (isLoading) {
            loadingSpinner.classList.add('show');
        } else {
            loadingSpinner.classList.remove('show');
        }
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
            if (extensions.length === 0) {
                throw new Error('No extension found');
            }
            const injector = await window.polkadotExtensionDapp.web3FromAddress(window.CHALLENGE_DATA.address);
            if (!injector?.signer?.signRaw) {
                throw new Error('Wallet does not support message signing');
            }
            updateStatus('Please sign the message in your wallet...', 'info');

            console.log('Signing message:', window.CHALLENGE_DATA.message);
            console.log('For address:', window.CHALLENGE_DATA.address);

            const { signature } = await injector.signer.signRaw({
                address: window.CHALLENGE_DATA.address,
                data: window.CHALLENGE_DATA.message,
                type: 'bytes'
            });

            console.log('Signature received:', signature);
            updateStatus('Message signed! Verifying...', 'success');
            window.location.href = '/verify?signature=' +
                encodeURIComponent(signature) +
                '&challenge_id=' + window.CHALLENGE_DATA.challengeId +
                '&address=' + encodeURIComponent(window.CHALLENGE_DATA.address) +
                '&code_verifier=' + encodeURIComponent(window.CHALLENGE_DATA.codeVerifier) +
                '&state=' + encodeURIComponent(window.CHALLENGE_DATA.state);
        }
        catch (error) {
            console.error('Signing error:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            updateStatus(error instanceof Error ? error.message : 'Unknown error', 'error');
        }
        finally {
            setLoading(false);
        }
    });
})();
