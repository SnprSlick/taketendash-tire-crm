import '../app/globals.css';
import { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/auth-context';
import { StoreProvider } from '../contexts/store-context';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="light">
      <AuthProvider>
        <StoreProvider>
          <Component {...pageProps} />
        </StoreProvider>
      </AuthProvider>
    </div>
  );
}