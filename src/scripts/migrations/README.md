# Database Migration Scripts

This directory contains database migration and maintenance scripts for the Velo application.

## Follow System Fix

To fix the follow/unfollow system and prevent duplicate follow relationships:

### 1. Clean up existing duplicates (if any)

```bash
npx ts-node src/scripts/migrations/cleanup-duplicate-follows.ts
```

This script will:
- Find all duplicate follow relationships in the database
- Keep the oldest record for each follower-followed pair
- Remove all newer duplicates
- Report the number of duplicates removed

### 2. Add unique index to prevent future duplicates

```bash
npx ts-node src/scripts/migrations/add-followers-index.ts
```

This script will:
- Create a unique compound index on `followerId` and `followedId`
- Prevent any duplicate follow relationships from being created
- Display all indexes on the Followers collection for verification

## Group Membership Fix

Group membership is one `Chat_Participants` row per `(chatId, userId)`. Without a unique
index, concurrent "add members" requests can insert the same member twice.

```bash
npx tsx src/scripts/migrations/add-chat-participants-index.ts
```

This script will:
- Remove duplicate membership rows, keeping the oldest (lowest `_id`) for each pair
- Create the unique compound index `unique_chat_user` on `chatId` and `userId`
- Display all indexes on the Chat_Participants collection for verification

It is safe to run multiple times. The add-members endpoint also attempts to create this
index lazily and tolerates duplicate-key errors on insert, so it stays correct before the
migration runs — but only the index makes the guarantee hold for every writer.

## Notes

- Run these scripts in order (cleanup first, then add index)
- The cleanup script is safe to run multiple times
- The index creation will fail if duplicates still exist
- Make sure you have the correct MongoDB connection string in your `.env` file

## Environment Variables Required

- `MONGOLINK` - MongoDB connection string
- `MONGODB_DATABASE` - Database name

## Trim message senders

Chat messages used to store a copy of the sender's name, username, picture and verified badge.
They are now read from the user's account, so the copies can be removed. Only `sender.id` stays.
Messages from deleted accounts are left alone.

Deploy the web app and the socket server first, then:

```bash
npm run cleanup:message-senders              # dry run: prints counts, changes nothing
npm run cleanup:message-senders -- --apply   # trims the messages
```

Take a backup (or an Atlas snapshot) before `--apply`. It is safe to run again.
