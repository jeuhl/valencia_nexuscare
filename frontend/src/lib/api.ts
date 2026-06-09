export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:4000`;
  }
  return 'http://localhost:4000';
};

// Use functions to ensure client-side detection works correctly after SSR
export const getSocketUrl = () => getApiUrl();
