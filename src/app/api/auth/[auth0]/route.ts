import { handleAuth } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
    onError(req: Request, error: Error) {
      console.error(error);
    }
});
const data = {
    "given_name": "Ayomide",
    "family_name": "Ojutalayo",
    "nickname": "ojutalayoayomide21",
    "name": "Ayomide Ojutalayo",
    "picture": "https://lh3.googleusercontent.com/a/ACg8ocJfEYWO_wvE5hJcZWA8YyennSXk7iSDlv9xpXcbWB_xRkvmnw=s96-c",
    "updated_at": "2024-07-06T07:59:11.160Z",
    "email": "ojutalayoayomide21@gmail.com",
    "email_verified": true,
    "sub": "google-oauth2|109177407497028007190",
    "sid": "qGEnME936ROKOKNQ-0zwhSwSJjLWFDmm"
  }