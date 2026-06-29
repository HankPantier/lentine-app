/** A member's name, split from the profile `display_name` ("First Last") into the app's fields. */
export interface ProfileName {
  firstName: string;
  lastName: string;
}

/** Split a "First Last" display name into first + last (rest). Pure; first word is the first name. */
export function splitName(displayName: string): ProfileName {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}
