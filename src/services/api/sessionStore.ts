import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@tripxto/api_jwt';

/** Bearer for tripxto-api when auth is wired to the server. */
export async function getApiJwt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setApiJwt(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(KEY, token);
    else await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
