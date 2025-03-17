import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getMongoClient } from '@/lib/mongodb';
import { sendConfirmationEmail } from '@/lib/email';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ message: 'Invalid token' }, { status: 400 });
    }

    try {
        // Connect to the database
        const client = await getMongoClient();
        const database = client.db('mydb');
        const users = database.collection('Users');

        // Find the user with the confirmationToken
        const user = await users.findOne({ confirmationToken: token });

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // Confirm the email
        await users.updateOne(
            { _id: user._id },
            { $set: { emailConfirmed: true }, $unset: { confirmationToken: '' } }
        );

        await sendConfirmationEmail(user.email, user.firstname, user.lastname, user.username);
        return NextResponse.json({ message: 'Email confirmed successfully' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: (error as Error).message }, { status: 500 });
    }
}