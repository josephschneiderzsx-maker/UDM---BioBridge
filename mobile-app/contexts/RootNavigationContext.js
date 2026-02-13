import React, { createContext, useContext } from 'react';
import { CommonActions } from '@react-navigation/native';

const RootNavigationContext = createContext(null);

export function RootNavigationProvider({ refValue, children }) {
  return (
    <RootNavigationContext.Provider value={refValue}>
      {children}
    </RootNavigationContext.Provider>
  );
}

export function useRootNavigation() {
  const ref = useContext(RootNavigationContext);
  return {
    resetToLogin: () => {
      ref?.current?.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
      );
    },
  };
}
