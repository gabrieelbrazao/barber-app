// Build-time env that lib/config.ts requires at import time. Tests that care
// about the config itself override these inside `jest.isolateModules`.
process.env.EXPO_PUBLIC_SHOP_ID ??= 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

// supabase-js builds a realtime client at import time and throws when the
// runtime has no WebSocket (Node < 22). No test talks to realtime, so a stub
// keeps the suite independent of the Node version running it.
global.WebSocket = class {
  close() {}
};

// Anything that touches lib/supabase pulls in AsyncStorage's native module.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
