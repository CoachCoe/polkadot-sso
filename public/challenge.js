import { web3Enable, web3FromAddress } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.5/+esm';

const statusDiv = document.getElementById('status');
const signButton = document.getElementById('signButton');
const { address, message, challengeId } = window.CHALLENGE_DATA;

async function signMessage() {
  try {
    statusDiv.textContent = 'Connecting to wallet...';
    
    const extensions = await web3Enable('Polkadot SSO Demo');
    if (extensions.length === 0) {
      throw new Error('No extension found');
    }

    statusDiv.textContent = 'Getting signer...';
    const injector = await web3FromAddress(address);
    const signRaw = injector?.signer?.signRaw;
    
    if (!signRaw) {
      throw new Error('Wallet does not support message signing');
    }

    statusDiv.textContent = 'Please sign the message in your wallet...';
    const { signature } = await signRaw({
      address,
      data: message,
      type: 'bytes'
    });

    statusDiv.textContent = 'Message signed! Verifying...';
    
    window.location.href = '/verify?signature=' + 
      encodeURIComponent(signature) +
      '&challenge_id=' + challengeId +
      '&address=' + encodeURIComponent(address);
  } catch (error) {
    console.error('Signing error:', error);
    statusDiv.textContent = 'Error: ' + error.message;
  }
}

signButton.addEventListener('click', signMessage);
