# heidi the barista

Heidi (the barista) is the bot that ran #cafe on the hack club slack!

Using an undocumented Slack API endpoint, specifically `huddles.info`, heidi was able to timestamp huddle joins and leaves, calculating and logging the time they spent in the huddle. 

## how to run it yourself?

Heidi is written in Typescript. To quickly run it and get started, install `bun` and use `bun run src/entry.ts` (but make sure to install dependencies first!)

You'll need an environment file to properly set up heidi and test her for yourself. You can DM me, @manitej on the Hack Club Slack, and I'd be happy to provide an env file for you to test with (and also help you set up and learn about heidi!)

## user flow

Heidi uses huddle join events provided by slack and polling to keep track of a user's huddle status. Since slack doesn't provide a convinent way to see if a user is in a huddle or not, there's possibilities where heidi might bug and not detect a user leaving a huddle (polling should have covered edge cases, but it seems like some people are facing issues/bugs still happening).

pretty much the flow is:
```
user joins the huddle -> heidi sends a message to the user to send a scrap

user sends a message
    -> in the huddle and waiting for a scrap? create the scrap and start the session
    -> in the huddle and in a session? add the scrap to the session

user leaves the huddle -> heidi sends a message to the user to ship + pauses the session
    -> user joins the huddle again? resume the session
    -> user ships? end the session
    -> user does nothing? end the session using last scrap as the ship

there is also AFK checking and reminders - when a specific interval triggers, heidi will check if a user is AFK and remind them to ship. Once an hour passes (or whatever time is configured), heidi will remind the user to ship their session.
```