const configReady = Boolean(
  window.AMROGN_SUPABASE_URL &&
    window.AMROGN_SUPABASE_ANON_KEY &&
    window.supabase
);

const loginPanel = document.getElementById("admin-login-panel");
const controlsPanel = document.getElementById("admin-controls-panel");
const loginForm = document.getElementById("admin-login-form");
const loginMessage = document.getElementById("admin-login-message");
const statusMessage = document.getElementById("admin-status-message");
const menuList = document.getElementById("admin-menu-list");
const signOutButton = document.getElementById("admin-sign-out");

function setMessage(element, text, isError = false) {
  element.textContent = text;
  element.dataset.error = String(isError);
}

if (!configReady) {
  loginForm.querySelector("button").disabled = true;
  setMessage(
    loginMessage,
    "Availability controls are not connected yet. Add your Supabase project URL and public anon key to supabase-config.js, then run supabase-setup.sql in the Supabase SQL editor.",
    true
  );
} else {
  (async () => {
  const client = window.supabase.createClient(
    window.AMROGN_SUPABASE_URL,
    window.AMROGN_SUPABASE_ANON_KEY
  );

  const publicMenuResponse = await fetch("index.html");
  const publicMenuDocument = new DOMParser().parseFromString(
    await publicMenuResponse.text(),
    "text/html"
  );
  const entries = [...publicMenuDocument.querySelectorAll(".menu-item[data-item-id]")].map((row) => ({
    id: row.dataset.itemId,
    name: row.querySelector("h4")?.textContent.trim() ?? row.dataset.itemId,
    price: row.querySelector("span")?.textContent.trim() ?? ""
  }));

  async function renderAvailability() {
    const { data, error } = await client
      .from("menu_availability")
      .select("item_id, is_available")
      .order("item_id");

    if (error) {
      setMessage(statusMessage, `Could not load availability: ${error.message}`, true);
      return;
    }

    const statuses = new Map((data ?? []).map((entry) => [entry.item_id, entry.is_available]));
    menuList.replaceChildren();

    const groups = new Map();
    for (const row of publicMenuDocument.querySelectorAll(".menu-category")) {
      const title = row.querySelector("h3")?.textContent.trim() ?? "Menu";
      groups.set(title, [...row.querySelectorAll(".menu-item[data-item-id]")]);
    }

    for (const [category, rows] of groups) {
      const heading = document.createElement("h3");
      heading.className = "admin-category-heading";
      heading.textContent = category;
      menuList.append(heading);

      for (const row of rows) {
        const id = row.dataset.itemId;
        const isAvailable = statuses.get(id) ?? true;
        const entry = entries.find((item) => item.id === id);
        const itemRow = document.createElement("div");
        itemRow.className = "admin-menu-row";

        const label = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = entry?.name ?? id;
        const price = document.createElement("small");
        price.textContent = entry?.price ?? "";
        label.append(name, price);

        const switchLabel = document.createElement("label");
        switchLabel.className = "availability-switch";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = isAvailable;
        checkbox.setAttribute("aria-label", `${isAvailable ? "Mark" : "Mark"} ${name.textContent} ${isAvailable ? "sold out" : "available"}`);
        const switchTrack = document.createElement("span");
        const switchText = document.createElement("b");
        switchText.textContent = isAvailable ? "Available" : "Sold out";
        switchLabel.append(checkbox, switchTrack, switchText);

        const publicLink = document.createElement("a");
        publicLink.href = `index.html#${encodeURIComponent(id)}`;
        publicLink.textContent = "View item";

        checkbox.addEventListener("change", async () => {
          checkbox.disabled = true;
          setMessage(statusMessage, `Saving ${name.textContent}…`);

          const { error: updateError } = await client
            .from("menu_availability")
            .upsert({ item_id: id, is_available: checkbox.checked, updated_at: new Date().toISOString() });

          checkbox.disabled = false;
          if (updateError) {
            checkbox.checked = !checkbox.checked;
            setMessage(statusMessage, `Could not save ${name.textContent}: ${updateError.message}`, true);
            return;
          }

          switchText.textContent = checkbox.checked ? "Available" : "Sold out";
          checkbox.setAttribute("aria-label", `Mark ${name.textContent} ${checkbox.checked ? "sold out" : "available"}`);
          setMessage(statusMessage, `${name.textContent} marked ${checkbox.checked ? "available" : "sold out"}.`);
        });

        itemRow.append(label, switchLabel, publicLink);
        menuList.append(itemRow);
      }
    }

    setMessage(statusMessage, "Availability changes apply to the customer menu.");
  }

  async function updatePanels() {
    const { data } = await client.auth.getSession();
    const signedIn = Boolean(data.session);
    loginPanel.hidden = signedIn;
    controlsPanel.hidden = !signedIn;
    if (signedIn) await renderAvailability();
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = loginForm.querySelector("button");
    submitButton.disabled = true;
    setMessage(loginMessage, "Signing in…");

    const { error } = await client.auth.signInWithPassword({
      email: document.getElementById("admin-email").value,
      password: document.getElementById("admin-password").value
    });

    submitButton.disabled = false;
    if (error) {
      setMessage(loginMessage, error.message, true);
      return;
    }

    setMessage(loginMessage, "Signed in.");
    await updatePanels();
  });

  signOutButton.addEventListener("click", async () => {
    await client.auth.signOut();
    await updatePanels();
  });

  client.auth.onAuthStateChange(() => {
    updatePanels();
  });

  updatePanels();
  })();
}
