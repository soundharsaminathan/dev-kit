export type PersonSearchFields = {
  name?: string | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function matchesPersonSearch(
  person: PersonSearchFields,
  search: string,
) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  const haystack = [person.name, person.email, person.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes(query)) return true;

  const queryDigits = digitsOnly(query);
  if (queryDigits.length < 4) return false;

  const phoneDigits = digitsOnly(person.phone ?? "");
  return phoneDigits.includes(queryDigits);
}
