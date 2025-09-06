import { WalletSelectorProps } from '../types';

export function WalletSelector({
  providers,
  onSelect,
  className = '',
  disabled = false,
}: WalletSelectorProps) {
  const handleSelect = (providerId: string) => {
    if (!disabled) {
      onSelect(providerId);
    }
  };

  return (
    <div className={`polkadot-auth-wallet-selector ${className}`}>
      <h3>Select Wallet</h3>
      <div className='polkadot-auth-wallet-list'>
        {providers.map(provider => (
          <button
            key={provider.id}
            className={`polkadot-auth-wallet-option ${disabled ? 'disabled' : ''}`}
            onClick={() => handleSelect(provider.id)}
            disabled={disabled}
            type='button'
          >
            <div className='polkadot-auth-wallet-info'>
              <span className='polkadot-auth-wallet-name'>{provider.name}</span>
              {provider.description && (
                <span className='polkadot-auth-wallet-description'>{provider.description}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
