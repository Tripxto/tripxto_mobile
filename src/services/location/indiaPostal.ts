/**
 * Replace with your backend proxy in production (hide third-party API, rate limits).
 */
export async function lookupIndiaPincode(
  pincode: string,
): Promise<{ ok: true; city: string; state: string } | { ok: false; message: string }> {
  const pin = pincode.replace(/\D/g, '');
  if (pin.length !== 6) {
    return { ok: false, message: 'Enter a 6-digit pincode.' };
  }
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = (await res.json()) as Array<{
      Status: string;
      PostOffice?: Array<{ District: string; State: string }>;
    }>;
    const block = data?.[0];
    if (block?.Status !== 'Success' || !block.PostOffice?.[0]) {
      return { ok: false, message: 'Invalid pincode.' };
    }
    const post = block.PostOffice[0];
    return { ok: true, city: post.District, state: post.State };
  } catch {
    return { ok: false, message: 'Network error. Try again.' };
  }
}
