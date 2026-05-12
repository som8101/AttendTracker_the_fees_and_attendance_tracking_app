import React from 'react';
import { useNetworkSync } from '../hooks/useNetworkSync';

export const GlobalSync = () => {
  useNetworkSync();
  return null;
};
