import { createClient } from "@neondatabase/neon-js";

/**
 * The Neon database URL, without credentials, e.g.
 * https://ep-example.c-2.eu-west-2.aws.neon.tech/neondb
 * The SDK derives the Auth and Data API endpoints from it.
 */
const url = import.meta.env.VITE_NEON_DATABASE_URL as string | undefined;

/**
 * One client for sign-in and data. Visitors who are not signed in still read
 * the catalogue with an anonymous token; Row-Level Security in the database
 * decides who may write (see db/schema.sql).
 */
export const neon = url ? createClient(url, { auth: { allowAnonymous: true } }) : null;
