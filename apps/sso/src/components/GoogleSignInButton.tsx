import React, { useState } from 'react';

interface GoogleSignInButtonProps {
  clientId: string;
  onSuccess?: (token: string, user: any) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  clientId,
  onSuccess,
  onError,
  className = '',
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Generate Google OAuth2 challenge
      const response = await fetch(`/api/auth/google/challenge?client_id=${clientId}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate Google OAuth2 challenge');
      }

      const { auth_url, challenge_id } = await response.json();

      // Open Google OAuth2 in popup
      const popup = window.open(
        auth_url,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open Google OAuth2 popup');
      }

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(pollInterval);
            setIsLoading(false);
            return;
          }

          // Check if authentication was successful
          // This would typically involve checking for a success parameter
          // or making an API call to verify the authentication
          const callbackResponse = await fetch(`/api/auth/google/callback?challenge_id=${challenge_id}`);
          
          if (callbackResponse.ok) {
            const result = await callbackResponse.json();
            clearInterval(pollInterval);
            popup.close();
            setIsLoading(false);
            
            if (onSuccess) {
              onSuccess(result.access_token, result.user);
            }
          }
        } catch (error) {
          console.error('Google OAuth2 polling error:', error);
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (!popup.closed) {
          popup.close();
        }
        setIsLoading(false);
        if (onError) {
          onError('Authentication timeout');
        }
      }, 300000);

    } catch (error) {
      setIsLoading(false);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Authentication failed');
      }
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={disabled || isLoading}
      className={`
        google-sign-in-button
        ${className}
        ${disabled || isLoading ? 'disabled' : ''}
      `}
      style={{
        background: '#4285f4',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: '500',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        transition: 'all 0.2s ease',
        opacity: disabled || isLoading ? 0.6 : 1,
      }}
    >
      {isLoading ? (
        <>
          <div className="spinner" style={{
            width: '20px',
            height: '20px',
            border: '2px solid #ffffff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          Signing in...
        </>
      ) : (
        <>
          <div className="google-icon" style={{
            width: '20px',
            height: '20px',
            background: 'white',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#4285f4',
          }}>
            G
          </div>
          Continue with Google
        </>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .google-sign-in-button:hover:not(.disabled) {
          background: #3367d6;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(66, 133, 244, 0.3);
        }
        
        .google-sign-in-button:active:not(.disabled) {
          transform: translateY(0);
        }
      `}</style>
    </button>
  );
};

export default GoogleSignInButton;
