import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../components/AppLayout';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  const router = useRouter();
  
  // Pages that should NOT use AppLayout (have their own full-page layouts)
  const noLayoutPages = ['/', '/Home', '/Login', '/Signup', '/index'];
  const useLayout = !noLayoutPages.includes(router.pathname);

  return (
    <QueryClientProvider client={queryClient}>
      {useLayout ? (
        <AppLayout>
          <Component {...pageProps} />
        </AppLayout>
      ) : (
        <Component {...pageProps} />
      )}
    </QueryClientProvider>
  );
}

