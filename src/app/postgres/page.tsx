import { sql } from "@vercel/postgres";

// Function to generate a random user
// function generateRandomUser() {
//   const randomId = Math.floor(Math.random() * 1000);
//   return {
//     time: new Date().toISOString(),
//     firstnames: `John${randomId}`,
//     lastnames: `Doe${randomId}`,
//     emails: `john${randomId}@example.com`,
//     usernames: `user${randomId}`,
//     passwords: `pass${randomId}` // Note: In a real application, never store passwords in plain text
//   };
// }

export default async function Cart({
  params
}: {
  params: Promise<{ user: string }>
}) {
  try {
    // Create the table if it doesn't exist
    // await sql`
    //   CREATE TABLE IF NOT EXISTS users (
    //     id SERIAL PRIMARY KEY,
    //     time TIMESTAMP,
    //     firstnames TEXT,
    //     lastnames TEXT,
    //     emails TEXT,
    //     usernames TEXT,
    //     passwords TEXT,
    //     UNIQUE(usernames)
    //   )
    // `;

    // Generate a random user
    // const newUser = generateRandomUser();

    // Insert the random user into the table
    // await sql`
    //   INSERT INTO users (time, firstnames, lastnames, emails, usernames, passwords)
    //   VALUES (${newUser.time}, ${newUser.firstnames}, ${newUser.lastnames}, ${newUser.emails}, ${newUser.usernames}, ${newUser.passwords})
    //   ON CONFLICT (usernames) DO NOTHING
    // `;

    // Fetch users from the table
    // const { rows } = await sql`SELECT * from users`;

    return (
      // <div>
      //   <h2>Users:</h2>
      //   {rows.map((row) => (
      //     <div key={row.id}>
      //       {row.id} - {row.usernames} ({row.emails})
      //     </div>
      //   ))}
      // </div>
      <></>
    );
  } catch (error) {
    console.error('Database error:', error);
    return <div>Error loading users. Please try again later.</div>;
  }
}