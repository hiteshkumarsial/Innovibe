import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Extract the host IP where Metro bundler is serving from (auto-detected on physical device or emulator)
const debuggerHost =
  Constants.expoConfig?.hostUri ||
  (Constants as any)?.manifest?.debuggerHost ||
  (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;

const dynamicHost = debuggerHost ? debuggerHost.split(':')[0] : null;

// Primary address: Wi-Fi LAN address for standalone APK on common network
export const WIFI_HOST = '10.23.159.105';
export const API_BASE_URL = `http://${WIFI_HOST}:8000/api`;

// Secondary fallbacks:
// 1. Localhost (if tethered via USB ADB reverse)
// 2. Dynamic host from Metro bundler
// 3. Android emulator loopback (10.0.2.2)
export const CANDIDATE_BASE_URLS = [
  API_BASE_URL,
  ...(dynamicHost && dynamicHost !== WIFI_HOST ? [`http://${dynamicHost}:8000/api`] : []),
  'http://localhost:8000/api',
  'http://10.0.2.2:8000/api',
];
