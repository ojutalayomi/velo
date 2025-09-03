import { createPersonalChatForUser } from "./createPersonalChat";
import { UserSchema } from '../types/type';
import { MongoDBClient } from '../mongodb';

async function createChat() {
    const db = await new MongoDBClient().init();
    const chats = await db.chats().find({ chatType: 'Personal' }, { projection: { adminIds: 1 }}).toArray();
    const users = (await db.users().find({}).toArray()).filter((user) => chats.some((chat) => !chat.adminIds.includes(user._id.toString())) );
  // console.log(users.length);
    const newChat = [];
    for (const user of users) {
        const chat = chats.find((chat) => chat.adminIds.includes(user._id.toString()));
        if (!chat) {
            const newChat_ = await createPersonalChatForUser(user as UserSchema, db);
            newChat.push(newChat_);
        }
    }
    return newChat;
}

// (async () => {
//   // console.log('Creating chats...');
//     await createChat();
//   // console.log('Chats created');
//     process.exit(0);
// })();