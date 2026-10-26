document.getElementById("year").textContent = new Date().getFullYear();

const heroVideo = document.querySelector(".hero-video");

if (heroVideo) {
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	if (reduceMotion.matches) {
		heroVideo.pause();
	} else {
		heroVideo.addEventListener("timeupdate", () => {
			if (heroVideo.currentTime >= 8) heroVideo.currentTime = 0;
		});
	}
}

const menuFilters = document.querySelectorAll("[data-menu-filter]");
const menuCategories = document.querySelectorAll("[data-menu-category]");

for (const filter of menuFilters) {
	filter.addEventListener("click", () => {
		const selectedCategory = filter.dataset.menuFilter;

		for (const category of menuCategories) {
			category.hidden = selectedCategory !== "all" && category.dataset.menuCategory !== selectedCategory;
		}

		for (const button of menuFilters) {
			const isSelected = button === filter;
			button.classList.toggle("is-active", isSelected);
			button.setAttribute("aria-pressed", String(isSelected));
		}
	});
}

for (const featuredItem of document.querySelectorAll("[data-featured-filter]")) {
	featuredItem.addEventListener("click", () => {
		const matchingFilter = document.querySelector(
			`[data-menu-filter="${featuredItem.dataset.featuredFilter}"]`
		);
		matchingFilter?.click();
	});
}

const availabilityConfigured = Boolean(
	window.AMROGN_SUPABASE_URL &&
		window.AMROGN_SUPABASE_ANON_KEY &&
		window.supabase
);

if (availabilityConfigured) {
	const client = window.supabase.createClient(
		window.AMROGN_SUPABASE_URL,
		window.AMROGN_SUPABASE_ANON_KEY
	);
	const menuRows = [...document.querySelectorAll(".menu-item[data-item-id]")];

	for (const row of menuRows) {
		row.id = row.dataset.itemId;
	}

	function applyAvailability(items) {
		for (const item of items) {
			const row = menuRows.find((menuRow) => menuRow.dataset.itemId === item.item_id);
			if (!row) continue;

			const previousBadge = row.querySelector(".sold-out-badge");
			if (item.is_available) {
				row.classList.remove("is-sold-out");
				previousBadge?.remove();
				continue;
			}

			row.classList.add("is-sold-out");
			if (!previousBadge) {
				const badge = document.createElement("span");
				badge.className = "sold-out-badge";
				badge.textContent = "Sold out";
				row.append(badge);
			}
		}
	}

	async function loadAvailability() {
		const { data, error } = await client
			.from("menu_availability")
			.select("item_id, is_available");

		if (error) {
			console.error("Could not load menu availability:", error.message);
			return;
		}

		applyAvailability(data ?? []);
	}

	loadAvailability();
	client
		.channel("public-menu-availability")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "menu_availability" },
			(payload) => applyAvailability([payload.new ?? payload.old])
		)
		.subscribe();
}
