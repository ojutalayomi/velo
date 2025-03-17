'use server'
import { getMongoClient } from '@/lib/mongodb';
import { confirmationEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

export async function generateCode(data: { email: string }) {
    const { email } = data;

    try {
        // Generate a new confirmation code
        const confirmationCode = uuidv4();

        const client = await getMongoClient();
        const db = client.db('mydb');

        const user = await db.collection('Users').findOne({ email });

        if(user){
            if(user.isEmailConfirmed){
                return { message: 'Email already confirmed' };
            }

            // Store the confirmation code in the database
            await db.collection('Users').insertOne({
                email,
                confirmationCode,
            });

            // Generate the confirmation link
            const confirmationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/confirm-email?code=${confirmationCode}`;

            // Send the confirmation link through email
            await confirmationEmail(email, user.firstname, user.lastname, confirmationLink);
            return { message: 'Confirmation link sent' };
        }
        return { message: 'User not found' };
    } catch (error) {
        console.error(error);
        return { message: 'An error occurred' };
    }
}