export function emailToName(email: string) {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}