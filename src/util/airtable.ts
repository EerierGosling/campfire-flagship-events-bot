import Airtable from "airtable";

Airtable.configure({
    apiKey: process.env.AIRTABLE_TOKEN
});

if (!process.env.AIRTABLE_BASE) { throw new Error("No Airtable base provided"); }

const base = Airtable.base(process.env.AIRTABLE_BASE);

export const users = base("Community Events Attendees");
// export const callLogs = base("Call Logs");
export const sessions = base("Community Events Sessions");
export const scraps = base("Community Events Scraps");