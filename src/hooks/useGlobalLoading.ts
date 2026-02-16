import { useEffect } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useLoading } from '../contexts/LoadingContext';

export const useGlobalLoading = () => {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const { setLoading } = useLoading();

  useEffect(() => {
    setLoading(isFetching > 0 || isMutating > 0);
  }, [isFetching, isMutating, setLoading]);
};
