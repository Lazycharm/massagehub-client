import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import AppLayout from '../components/AppLayout';
import '../src/MessageHub/globals.css';

export default function App({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <Component {...pageProps} />
      </AppLayout>
    </QueryClientProvider>
  );
}
