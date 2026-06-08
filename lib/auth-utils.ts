export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@bolao.local`;
}