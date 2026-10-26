# Media attribution

- Hero video: "Close-up of chicken and onions cooking in saucepan" by Artem Kovalchuk, Pexels, https://www.pexels.com/video/cooking-chicken-with-onions-in-saucepan-31994422/ (Pexels free license).
- Hero still frame: extracted from the same Pexels video.

# Menu availability setup

The staff page is `admin.html`. Availability changes are shared with customer devices through Supabase. Until Supabase is configured, the menu remains fully visible and the admin page explains that setup is needed.

## Connect Supabase

Use a Supabase account controlled by you or the restaurant owner. I do not have a Supabase account and should not own the restaurant's project.

1. Create a Supabase project at https://supabase.com.
2. In the Supabase project, open **SQL Editor**, paste in `supabase-setup.sql`, and run it.
3. In **Project Settings > API**, copy the Project URL and the public `anon` key. Do not put a `service_role` key in browser code.
4. Put those two values in `supabase-config.js`:

   ```js
   window.AMROGN_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
   window.AMROGN_SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
   ```

## Create staff login

1. In Supabase **Authentication > Users**, create the staff user and confirm its email. Use an email controlled by the restaurant owner or manager.
2. Copy that user's UUID from the Users page.
3. In Supabase **SQL Editor**, run the following after replacing the example UUID. Running this as the project owner in the SQL Editor is safe; do not paste a service-role key into the website or chat.

    ```sql
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
       || '{"role":"menu_staff"}'::jsonb
    where id = 'REPLACE-WITH-STAFF-USER-UUID';
    ```

4. Open `admin.html`, sign in with that user's email and password, and toggle items as availability changes.

The database policy allows anyone to read availability, but only accounts whose trusted app metadata contains `role: menu_staff` can change it. Customer pages subscribe to availability changes in realtime.

## Publish

Upload the HTML, CSS, JavaScript, SQL setup reference, and `assets` folder to the same static hosting site. Use the host's access controls if you want to limit casual discovery of `admin.html`; the real protection is Supabase authentication and row-level security, not hiding the URL.
