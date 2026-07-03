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
- Configure "Palpite da Final" from `/admin`; participants can choose two finalists and a champion until the configured deadline.
- Upload up to 3 family photos from `/admin`; confirm they appear in the home carousel.

## Horário dos jogos

- Informe datas e horas de jogos no admin usando o Horário de Brasília (`America/Sao_Paulo`).
- O app converte esses valores para UTC antes de salvar no banco.
- Datas de jogos são exibidas no Horário de Brasília, independentemente do fuso do navegador ou servidor.
- O prazo dos palpites continua sendo calculado a partir do instante UTC salvo e termina 1 hora antes do jogo.

Quando o administrador cadastra um jogo às `20:00`, o sistema interpreta esse
horário como `20:00` em `America/Sao_Paulo`. O banco armazena o instante UTC
equivalente, mas todos os usuários veem `20:00 BRT` no app.

## Deployment

Deploy to Vercel and configure the same environment variables in the Vercel project settings. The service role key must only exist as a server-side environment variable and must never be exposed with a `NEXT_PUBLIC_` prefix.

## Notes

- Usernames are mapped to internal Supabase Auth emails with `${username}@bolao.local`.
- Mutations use Server Actions. Privileged admin actions use a server-only Supabase Admin client.
- RLS also enforces authenticated reads, own-prediction writes, admin management, and the 1-hour prediction deadline.
- Scoring is cumulative: 10 points for the correct winner or draw, plus 15 additional points for the exact score.
- If the live Supabase project was created before prediction visibility was opened, run this SQL in the Supabase SQL editor so authenticated users may read predictions after the app's server-side deadline gate allows them:

```sql
drop policy if exists "participants read own predictions" on public.predictions;
drop policy if exists "authenticated users can read all predictions" on public.predictions;

create policy "authenticated users can read all predictions"
on public.predictions
for select
to authenticated
using (true);
```
- To enable "Palpite da Final" on an existing Supabase project, run the new `final_prediction_settings` and `final_predictions` SQL section from `supabase/schema.sql`. After that, the admin must configure the prediction deadline and visibility time in `/admin` before participants can submit.
