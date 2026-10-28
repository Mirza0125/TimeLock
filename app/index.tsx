import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useStore } from '../src/store';

export default function Index() {
  const { user } = useStore();
  useEffect(() => {
    if (user) router.replace('/(tabs)');
    else router.replace('/welcome');
  }, [user]);
  return <View />;
}
