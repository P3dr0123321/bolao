# Bolao da Familia

Private family World Cup prediction pool built with Next.js App Router, TypeScript, Tailwind CSS, shadcn-style components, Supabase Auth, Postgres, Storage, and RLS.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project.

3. Run `supabase/schema.sql` in the Supabase SQL editor. It creates the tables, indexes, helper functions, RLS policies, and public Storage buckets `avatars` and `family-photos`.

4. Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

5. Run locally:

```bash
npm run dev
```

## First Admin User

Create the first admin from the Supabase dashboard because the app requires an admin before `/admin` can create participants.

1. In Supabase Auth, create a user with email `admin@bolao.local` and a password.
2. Copy that auth user's UUID.
3. Insert the participant profile in SQL:

```sql
insert into public.participants (auth_user_id, username, full_name, role)
values ('AUTH_USER_UUID_HERE', 'admin', 'Admin da Familia', 'admin');
```

After that, log in at `/login` using username `admin` and the password you created.

## Main Flows To Test

- Login with username/password and confirm redirect to `/`.
- Add participants from `/admin`; confirm they can log in using their username.
- Add a match for today, then open `/jogos` as a participant and save a prediction.
- Move the match start time to less than 1 hour away and confirm prediction inputs are blocked.
- Enter the final score from `/admin`; correct winner or draw predictions receive 10 points and the leaderboard updates.
- Exact scores receive an additional 15 points, for a maximum of 25 points per match.
- Upload up to 3 family photos from `/admin`; confirm they appear in the home carousel.

## Deployment

Deploy to Vercel and configure the same environment variables in the Vercel project settings. The service role key must only exist as a server-side environment variable and must never be exposed with a `NEXT_PUBLIC_` prefix.

## Notes

- Usernames are mapped to internal Supabase Auth emails with `${username}@bolao.local`.
- Mutations use Server Actions. Privileged admin actions use a server-only Supabase Admin client.
- RLS also enforces authenticated reads, own-prediction writes, admin management, and the 1-hour prediction deadline.
- Scoring is cumulative: 10 points for the correct winner or draw, plus 15 additional points for the exact score.
