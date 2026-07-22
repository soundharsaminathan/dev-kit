export function isSoftThemePath(pathname: string) {
  return (
    pathname === "/me" ||
    pathname.startsWith("/me/") ||
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/users" ||
    pathname.startsWith("/users/")
  );
}
