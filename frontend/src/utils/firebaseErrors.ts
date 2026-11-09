/**
 * Helper to translate Firebase authentication errors into clear, professional messages.
 */

export function getFriendlyAuthErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred. Please try again.';

  const code = err.code || '';
  const message = err.message || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'This authentication method is currently not enabled in the Firebase project console.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 8 characters with a mix of letters and numbers.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before completion. Please try again.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups for this site or try again.';
    case 'auth/cancelled-popup-request':
      return 'Previous sign-in request was cancelled. Please try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for OAuth operations in your Firebase Console. Please add localhost to Authorized Domains.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'Firebase API key is not recognized or restricted. Please ensure Identity Toolkit API is enabled in your Google Cloud / Firebase Console.';
    default:
      // Strip "Firebase: Error (...)" wrapper if present
      if (typeof message === 'string' && message.includes('(')) {
        const match = message.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          return `Authentication error: ${match[1].replace('auth/', '').replace(/-/g, ' ')}`;
        }
      }
      return message || 'Authentication failed. Please check your details.';
  }
}
