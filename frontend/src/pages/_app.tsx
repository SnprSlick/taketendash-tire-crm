import '../app/globals.css';
import { AppProps } from 'next/app';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="light">
      <Component {...pageProps} />
    </div>
  );
}