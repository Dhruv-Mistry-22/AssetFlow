'use client';

import React from 'react';
import { StateProvider } from '../context/StateContext';
import AssetFlowApp from '../components/AssetFlowApp';

export default function Home() {
  return (
    <StateProvider>
      <AssetFlowApp />
    </StateProvider>
  );
}
