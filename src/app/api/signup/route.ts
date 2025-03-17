import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { cookies, headers } from 'next/headers'
import { UAParser } from 'ua-parser-js'
import bcrypt from 'bcrypt'
import validator from 'validator'
import { v4 as uuidv4 } from 'uuid'
import { getMongoClient } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { confirmationEmail } from '@/lib/email'


export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const protocol = (await headersList).get("x-forwarded-proto");
    const host = (await headersList).get("host");
    const BaseUrl = `${protocol}://${host}/`

    const body = await request.json()
    const time = new Date().toISOString();
    const { firstname, lastname, email, username, password } = body;
    const displayPictureFilename = null; // Handle file upload separately
    const userId = uuidv4();
    const saltRounds = 10;
    const client = await getMongoClient();

    const collection = client.db('mydb').collection('Users');
    const tokenCollection = client.db('mydb').collection('Tokens');

    if (!validator.isEmail(email)) {
        console.log(`Received an invalid email: ${email}`);
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if(!password){
        return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    // Generate a confirmation token
    const confirmationToken = await new SignJWT({ _id: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);


    // Check if the username or email already exists in the collection
    const result = await collection.findOne({ $or: [{ username: username }, { email: email }] });

    // If a matching document is found
    if (result) {

        if (result && result.isEmailConfirmed && result.username === username && result.email === email) {
            // Email is confirmed, prevent account creation
            
            return NextResponse.json({ error: 'Email is already confirmed.' }, { status: 403 });
            
        }

        // Check if the account has exceeded the sign-up limit
        const signUpLimitPerAccount = 5;
        if (result.signUpCount >= signUpLimitPerAccount) {
            // Return an error response indicating that sign-ups are not allowed for this account
            
            return NextResponse.json({ error: 'Sign-ups are not allowed for this account.' }, { status: 409 });
        }

        if (!result.isEmailConfirmed) {

            const updateFields = {
                firstname: firstname,
                lastname: lastname,
                password: hashedPassword,
                displayPicture: displayPictureFilename,
                isEmailConfirmed: false, // Set to false to trigger email confirmation
                confirmationToken: confirmationToken
            };

            // Only update the fields that need to be changed
            await collection.updateOne(
                { email: email }, // Filter to find the existing document
                { $set: updateFields, $inc: { signUpCount: 1 } }, // Increment signUpCount
                { upsert: false }
            );


        } else {

            let error = {};
            if (result.username === username) error = 'Username is already in use';

            if (result.email === email) error = 'Email is already in use';

            if (result.username === username && result.email === email) error = 'Both Email and Username are in use';
            // console.log(error);
            
            return NextResponse.json({ error: error }, { status: 409 });
        }

    }


    if (!result) {
        const user: { password?: string, confirmationToken?: string } & Record<string, any> = {
            _id: new ObjectId(),
            time: time,
            userId: userId,
            firstname: firstname,
            lastname: lastname,
            name: `${firstname} ${lastname}`,
            email: email,
            username: username,
            password: hashedPassword,
            displayPicture: displayPictureFilename,
            isEmailConfirmed: false,
            confirmationToken: confirmationToken,
            signUpCount: 1,
            verified: false,
            followers: [],
            following: [],
            lastUpdate: [],
            bio: '',
            coverPhoto: '',
            dob: '',
            location: '',
            noOfUpdates: 0,
            website: ''
        }
        // Insert the new user data into the collection
        await collection.insertOne(user);
        const token = await new SignJWT({ _id: user._id })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('15d')
        .sign(secret);
        
        // Extract device information
        const userAgent = (await headers()).get('user-agent') || '';
        const parser = new UAParser(userAgent);
        const deviceInfo = parser.getResult();

        await tokenCollection.insertOne({
            userId: user._id,
            token,
            deviceInfo,
            createdAt: new Date().toISOString()
        });

        (await cookies()).set('velo_12', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: process.env.NODE_ENV !== 'development' ? 'strict': 'none',
            maxAge: 3600 * 24 * 15,
            path: '/',
        });

        delete user.password
        delete user.confirmationToken

        await confirmationEmail(email, firstname, lastname, BaseUrl+"accounts/confirm-email/"+confirmationToken);
        return NextResponse.json(user, { status: 200 });;
    }

  } catch (error) {
    console.error('An error occurred:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}