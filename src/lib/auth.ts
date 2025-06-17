import { jwtVerify } from 'jose';
import { MongoDBClient } from "@/lib/mongodb";
import { ObjectId } from "bson";
import { SignJWT } from "jose";
import { AuthOptions as NextAuthOptions, User, Account, Profile } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import { headers, cookies } from "next/headers";
import { UAParser } from "ua-parser-js";
import { v4 as uuidv4 } from "uuid";
import { UserSchema } from './types/type';
import { createPersonalChatForUser } from './chat/createPersonalChat';

export async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}


export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: User | AdapterUser; account: Account | null; profile?: Profile | undefined; email?: { verificationRequest?: boolean | undefined; } | undefined; credentials?: Record<string, unknown> | undefined; }) {
      try {
        const db = await new MongoDBClient().init();
        const users = db.users();

        // Check if user exists
        const existingUser = await users.findOne({ email: user.email as string });

        if (existingUser) {
          // Update last login and provider info for existing user
          if (existingUser.providers) {
            if (Object.keys(existingUser.providers).includes(account?.provider || '')) {
              await users.updateOne(
                { email: user.email as string },
                { $set: {
                  lastLogin: new Date().toISOString(),
                  [`providers.${account?.provider}`]: {
                    id: profile?.sub,
                    lastUsed: new Date().toISOString()
                  }
                }}
              );
            }
          } else {
            await users.updateOne(
              { email: user.email as string },
              { $set: {
                lastLogin: new Date().toISOString(),
              }}
            );
          }
          const tokenCollection = db.tokens();
          const secret = new TextEncoder().encode(process.env.JWT_SECRET);
          const token = await new SignJWT({ _id: existingUser._id })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('15d')
            .sign(secret);

          // Extract device information
          const userAgent = (await headers()).get('user-agent') || '';
          const parser = new UAParser(userAgent);
          const deviceInfo = parser.getResult();

          await tokenCollection.insertOne({
            _id: new ObjectId,
            userId: existingUser._id.toString(),
            token,
            deviceInfo,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
          });

          (await cookies()).set('velo_12', token, {
            httpOnly: true,
            secure: true,
            sameSite: process.env.NODE_ENV !== 'development' ? 'strict' : 'none',
            maxAge: 3600 * 24 * 15,
            path: '/',
          });

          return `/home`;
        }

        // Create new user
        const newUser: UserSchema = {
          _id: new ObjectId(),
          time: new Date().toISOString(),
          userId: uuidv4(),
          firstname: user.name?.split(' ')[0] || '',
          lastname: user.name?.split(' ')[1] || '',
          email: user.email as string,
          name: user.name as string,
          password: '',
          providers: {
            [account?.provider || 'unknown']: {
              id: profile?.sub,
              lastUsed: new Date().toISOString()
            }
          },
          username: (user.name?.split(' ')[0] || '') + uuidv4().split('-')[0],
          displayPicture: user.image || '',
          isEmailConfirmed: true,
          signUpCount: 1,
          verified: true,
          followers: 0,
          following: 0,
          lastUpdate: [],
          bio: '',
          coverPhoto: '',
          dob: '',
          location: '',
          noOfUpdates: 0,
          website: '',
          lastLogin: new Date().toISOString(),
        };

        await users.insertOne(newUser);

        await createPersonalChatForUser(newUser, db);
        const tokenCollection = db.tokens();
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const token = await new SignJWT({ _id: newUser._id })
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('15d')
          .sign(secret);

        // Extract device information
        const userAgent = (await headers()).get('user-agent') || '';
        const parser = new UAParser(userAgent);
        const deviceInfo = parser.getResult();

        await tokenCollection.insertOne({
          _id: new ObjectId,
          userId: newUser._id?.toString() as string,
          token,
          deviceInfo,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        });

        (await cookies()).set('velo_12', token, {
          httpOnly: true,
          secure: true,
          sameSite: process.env.NODE_ENV !== 'development' ? 'strict' : 'none',
          maxAge: 3600 * 24 * 15,
          path: '/',
        });

        return `/accounts/signup-complete?email=${encodeURIComponent(user.email || '')}`;

      } catch (error) {
        console.error('Auth error:', error);
        return '/auth/error?error=DatabaseError';
      }
    },

    async session({ session, user }: { session: any; user: User | AdapterUser; }) {
      try {
        const db = await new MongoDBClient().init();
        const dbUser = await db.users().findOne({ email: user.email as string });

        if (dbUser) {
          session.user = {
            ...session.user,
            id: dbUser.userId,
            username: dbUser.username,
            verified: dbUser.verified
          };
        }

        return session;
      } catch (error) {
        console.error('Session error:', error);
        return session;
      }
    },
  },
};