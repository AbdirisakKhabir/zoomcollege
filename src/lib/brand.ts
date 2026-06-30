/**
 * Institution brand configuration used across the application.
 */
export const BRAND = {
  name: "Zoom International College",
  logoUrl: "/logo/era-pre-university.png",
  logoAlt: "Zoom International College",
  emailDomain: "zoomcollege.edu",
  adminEmail: "admin@zoomcollege.edu",
  registrarEmail: "registrar@zoomcollege.edu",
  website: "www.zoomcollege.edu",
} as const;

export function pageTitle(section: string): string {
  return `${section} | ${BRAND.name}`;
}
