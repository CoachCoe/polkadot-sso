import { PolkadotProfileProps } from '../types';

export function PolkadotProfile({
  address,
  session,
  onDisconnect,
  className = '',
  showBalance = false,
  showChain = false,
}: PolkadotProfileProps) {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  const handleDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    }
  };

  return (
    <div className={`polkadot-auth-profile ${className}`}>
      <div className='polkadot-auth-profile-header'>
        <h3>Polkadot Profile</h3>
        <button
          className='polkadot-auth-disconnect-button'
          onClick={handleDisconnect}
          type='button'
        >
          Disconnect
        </button>
      </div>

      <div className='polkadot-auth-profile-content'>
        <div className='polkadot-auth-address-section'>
          <label>Address:</label>
          <span className='polkadot-auth-address'>{formatAddress(address)}</span>
        </div>

        {session && (
          <div className='polkadot-auth-session-info'>
            <div className='polkadot-auth-session-item'>
              <label>Session ID:</label>
              <span>{session.id.slice(0, 8)}...</span>
            </div>
            <div className='polkadot-auth-session-item'>
              <label>Created:</label>
              <span>{new Date(session.createdAt).toLocaleDateString()}</span>
            </div>
            <div className='polkadot-auth-session-item'>
              <label>Last Used:</label>
              <span>{new Date(session.lastUsedAt).toLocaleDateString()}</span>
            </div>
            <div className='polkadot-auth-session-item'>
              <label>Status:</label>
              <span className={session.isActive ? 'active' : 'inactive'}>
                {session.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        )}

        {showBalance && (
          <div className='polkadot-auth-balance-section'>
            <label>Balance:</label>
            <span>Loading...</span>
          </div>
        )}

        {showChain && (
          <div className='polkadot-auth-chain-section'>
            <label>Chain:</label>
            <span>Polkadot</span>
          </div>
        )}
      </div>
    </div>
  );
}
