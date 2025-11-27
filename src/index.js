import { createRoot } from 'react-dom/client';
import App from './App';
import { Auth0Provider } from '@auth0/auth0-react';


const Auth0ProviderWithHistory = ({ children }) => {
  const domain=process.env.REACT_APP_AUTO_0_DOMAIN_LOCAL
  const clientId=process.env.REACT_APP_AUTO_0_CLIENTID_LOCAL

  // const domain = process.env.REACT_APP_AUTO_0_DOMAIN_PRODUCTION;
  // const clientId = process.env.REACT_APP_AUTO_0_CLIENTID_PRODUCTION;


  // Moblie Test
  // const domain ='dev-w60mj1dfwvavmltl.us.auth0.com'

  const onRedirectCallback = (appState) => {
    window.history.replaceState({}, document.title, appState?.returnTo || window.location.pathname);
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      // redirectUri="http://localhost:3000/Main"
      // redirect_uri="https://winkee.dating/Main"
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};


const root = createRoot(document.getElementById('root'));
root.render(
  <Auth0ProviderWithHistory>
    
      <App />
    
  </Auth0ProviderWithHistory>
);
