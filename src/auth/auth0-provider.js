import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

export const Auth0ProviderWithHistory = ({ children }) => {
  const navigate = useNavigate();

  const domain = process.env.REACT_APP_AUTO_0_DOMAIN_LOCAL;
  const clientId = process.env.REACT_APP_AUTO_0_CLIENTID_LOCAL;

  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo || window.location.pathname);
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      redirectUri={window.location.origin}
      onRedirectCallback={onRedirectCallback}
      // scope="openid profile email"
    >
      {children}
    </Auth0Provider>
  );
};