import { web3Enable, web3Accounts } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.5/+esm';

const statusDiv = document.getElementById('status');
const connectButton = document.getElementById('connectButton');

connectButton.addEventListener('click', async () => {
  try {
    statusDiv.textContent = 'Requesting extension access...';
    
    const extensions = await web3Enable('Polkadot SSO Demo');
    if (extensions.length === 0) {
      throw new Error('No extension found');
    }

    const accounts = await web3Accounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    // Get the client_id from the window object that we set in the HTML
    const clientId = window.CLIENT_ID;
    if (!clientId) {
      throw new Error('Client ID not found');
    }

    window.location.href = '/challenge?address=' + 
      encodeURIComponent(accounts[0].address) + 
      '&client_id=' + encodeURIComponent(clientId);
  } catch (error) {
    statusDiv.textContent = 'Error: ' + error.message;
    console.error('Connection error:', error);
  }
});
