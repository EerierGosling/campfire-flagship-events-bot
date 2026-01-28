import Airtable from "airtable";

Airtable.configure({
    apiKey: process.env.AIRTABLE_TOKEN
});

if (!process.env.AIRTABLE_BASE) { throw new Error("No Airtable base provided"); }

const base = Airtable.base(process.env.AIRTABLE_BASE);

export const users = base(process.env.AIRTABLE_USERS_TABLE!);
export const sessions = base(process.env.AIRTABLE_SESSIONS_TABLE!);
export const scraps = base(process.env.AIRTABLE_SCRAPS_TABLE!);