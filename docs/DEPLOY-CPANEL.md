# Deploying IQRAFI on cPanel hosting

This guide covers shared cPanel hosting. IQRAFI is a Node.js application, so it does not go in
`public_html` like a PHP site.

## What your hosting needs

| Requirement | Where to check in cPanel |
| --- | --- |
| **Setup Node.js App** with **Node.js 20 or newer** | Software → *Setup Node.js App* |
| A **PostgreSQL** database | Databases → *PostgreSQL Databases*. If there is none, use a free external database such as Supabase or Neon (see step 2). |
| About 600 MB of disk space and 512 MB+ of memory | Your hosting plan |

If there is no *Setup Node.js App*, your plan can't run IQRAFI. Ask your host to enable it, or use
a VPS or Vercel instead. MySQL is not supported; IQRAFI needs PostgreSQL.

## 1. Get the package

Download **IQRAFI-server-linux-x64** from the repository's *Server package* GitHub workflow (or run
`npm run deploy:package` on Linux). Unzip the download once; inside is **`IQRAFI-server-linux-x64.zip`**,
which is the file you upload.

## 2. Create the database

**Option A: PostgreSQL in cPanel (best, if available)**

1. Go to *PostgreSQL Databases* and create a database, e.g. `iqrafi`. cPanel adds your account
   prefix, so it becomes something like `myacct_iqrafi`.
2. Create a user with a strong password, add it to the database, and grant **ALL PRIVILEGES**.
3. Your connection string is:

```
postgresql://myacct_user:PASSWORD@localhost:5432/myacct_iqrafi
```

**Option B: Supabase (free)**

1. Create a project at supabase.com.
2. Click **Connect** and copy the *Session pooler* string.
3. Replace `[YOUR-PASSWORD]` and add `?sslmode=require&uselibpqcompat=true` to the end.

Some shared hosts block outgoing database connections. If the app logs a connection error, ask your
host to allow outbound port 5432, or use option A.

If your password contains `@ : / ? # %`, replace those characters with their URL encoding
(e.g. `@` → `%40`), or choose a password without them.

## 3. Create the Node.js application

Go to *Setup Node.js App* → **Create Application** and fill in:

| Field | Value |
| --- | --- |
| Node.js version | **20** or **22** (the highest offered) |
| Application mode | **Production** |
| Application root | `iqrafi` (a folder in your home directory, **not** inside `public_html`) |
| Application URL | `iqrafi.com` (leave the path empty) |
| Application startup file | `server.js` |

Under **Environment variables**, add:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | your connection string from step 2 |
| `APP_URL` | `https://iqrafi.com` |
| `CRON_SECRET` | a long random password (32+ characters) |
| `IQRAFI_AUTO_MIGRATE` | `1` |
| `NODE_ENV` | `production` |

Click **Create**, then **Stop App** for now.

## 4. Upload the files

1. Open *File Manager* and go to the `iqrafi` folder (the application root).
2. Delete any placeholder files cPanel created there (e.g. a sample `app.js`), but keep `tmp/` if it exists.
3. **Upload** `IQRAFI-server-linux-x64.zip`, then right-click it → **Extract** into this folder.
4. Enable *Settings → Show Hidden Files* and check that `server.js`, `.next/`, `node_modules/`, `data/` and
   `drizzle/` are directly inside `iqrafi/`. If they are in a subfolder, move them up one level.

Do **not** click "Run NPM Install". Everything IQRAFI needs is already included.

## 5. Start it

In *Setup Node.js App*, click **Start App** (or **Restart**). On the first start, IQRAFI creates its
tables and loads the verified Qur'an text, which takes up to a minute. Then open **https://iqrafi.com**.

Make sure HTTPS is on: use *SSL/TLS Status* → **Run AutoSSL**, so sign-in works securely.

## 6. Make yourself admin

1. Sign up on your site with your own email.
2. In *Setup Node.js App*, add the environment variable `IQRAFI_ADMIN_EMAIL` = your email, then **Restart**.
3. Open `https://iqrafi.com/admin`. You can remove the variable afterwards; the role stays.

## 7. Optional: refresh statistics nightly

Statistics refresh automatically whenever they are more than 10 minutes old. To also reconcile them
nightly, add a cron job in *Cron Jobs*:

```
0 3 * * * curl -s -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://iqrafi.com/api/cron/stats > /dev/null
```

## Updating to a new version

Download the new package, then **Stop App**. Delete the old `.next`, `node_modules`, `data` and
`drizzle` folders and `server.js`, upload and extract the new zip, then **Start App**. Database
changes are applied automatically on start, and your data is kept.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Incomplete response" / 503 | Check the app log (the `stderr.log` file in the application root, or *Setup Node.js App* → log). Usually `DATABASE_URL` is wrong or the database is unreachable. |
| `Could not find a production build` | The hidden `.next` folder is missing. Re-extract the zip and check step 4. |
| `password authentication failed` | Re-check the user, password and privileges from step 2. |
| `self-signed certificate` (Supabase) | Make sure the URL ends with `?sslmode=require&uselibpqcompat=true`. |
| `ECONNREFUSED` / timeout to an external database | Your host blocks outgoing connections. Use cPanel PostgreSQL (option A). |
| Sign-in doesn't stick | Use `https://`, and make sure `APP_URL` exactly matches the address you use. |
| Node.js version below 20 | Ask your host for Node.js 20+. Next.js 16 requires it. |
