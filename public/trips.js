
document.addEventListener("DOMContentLoaded", function () {

  /* ================= HERO SECTION ================= */
  // ================= PROMO DATA =================

const promoData = [
  {
    type: "Product",
    title: "Plan Smarter Travel with TripXto",
    description: "Organize trips, manage itineraries and plan intelligently.",
    buttonText: "Create Your First Trip",
    gradient: "from-blue-600 to-indigo-600",
    image: "travel"
  },
  {
    type: "Feature Highlight",
    title: "All Your Trips in One Dashboard",
    description: "Track ongoing, upcoming and past trips in a clean interface.",
    buttonText: "Explore Trips",
    gradient: "from-purple-600 to-pink-600",
    image: "planning"
  },
  {
    type: "Collaboration",
    title: "Open for Travel Partnerships",
    description: "TripXto welcomes collaboration with travel brands and creators.",
    buttonText: "Partner With Us",
    gradient: "from-emerald-600 to-teal-600",
    image: "hotel"
  }
];

// ================= RENDER PROMOS =================

const slider = document.getElementById("promoSlider");
const dotsContainer = document.getElementById("promoDots");

let currentIndex = 0;

function renderPromos() {
  slider.innerHTML = "";
  dotsContainer.innerHTML = "";

  promoData.forEach((promo, index) => {

    const slide = document.createElement("div");
    slide.className = `min-w-full flex items-center justify-between p-10 
                       bg-gradient-to-r ${promo.gradient} text-white`;

    slide.innerHTML = `
      <div class="max-w-xl space-y-4">
        <span class="text-xs uppercase tracking-wide bg-white/20 px-3 py-1 rounded-full">
          ${promo.type}
        </span>

        <h2 class="text-3xl font-semibold leading-tight">
          ${promo.title}
        </h2>

        <p class="text-white/80 text-sm">
          ${promo.description}
        </p>

        <button class="bg-white text-gray-800 px-6 py-2 rounded-xl font-medium hover:bg-gray-100 transition">
          ${promo.buttonText}
        </button>
      </div>

      <img src="https://source.unsplash.com/350x220/?${promo.image}"
           class="rounded-2xl shadow-md hidden md:block" />
    `;

    slider.appendChild(slide);

    // Create dot
    const dot = document.createElement("button");
    dot.className = "w-3 h-3 rounded-full bg-gray-300";
    dot.addEventListener("click", () => {
      currentIndex = index;
      updateSlider();
    });

    dotsContainer.appendChild(dot);
  });

  updateSlider();
}

// ================= SLIDER LOGIC =================

function updateSlider() {
  slider.style.transform = `translateX(-${currentIndex * 100}%)`;

  const dots = dotsContainer.querySelectorAll("button");
  dots.forEach(dot => dot.classList.remove("bg-white"));
  dots[currentIndex].classList.add("bg-white");
}

// Auto slide
setInterval(() => {
  currentIndex = (currentIndex + 1) % promoData.length;
  updateSlider();
}, 5000);

// Init
renderPromos();


  /* ================= TRIPS LOGIC ================= */


  const container = document.getElementById("tripContainer");
  const emptyState = document.getElementById("emptyState");
  const tabs = document.querySelectorAll(".trip-tab");

  let trips = JSON.parse(localStorage.getItem("trips")) || [];

  trips.sort((a,b)=> new Date(a.startDate) - new Date(b.startDate));

  let activeCategory = "Ongoing";

  tabs.forEach(tab => {
    tab.addEventListener("click", function () {

      // Reset all buttons
      tabs.forEach(t => {
        t.classList.remove("active", "bg-emerald-600", "text-white", "shadow-md", "shadow-emerald-200");
        t.classList.add("text-gray-500");
      });

      // Activate clicked one
      this.classList.add("active", "bg-emerald-600", "text-white", "shadow-md", "shadow-emerald-200");
      this.classList.remove("text-gray-500");

      activeCategory = this.innerText.trim();
      renderTrips();
    });
  });

window.addEventListener("storage", function () {
  trips = JSON.parse(localStorage.getItem("trips")) || [];
  trips.sort((a,b)=> new Date(a.startDate) - new Date(b.startDate));
  renderTrips();
  });


  function renderTrips() {

    container.innerHTML = "";
    emptyState.classList.add("hidden");

    const today = new Date();
    today.setHours(0,0,0,0);

    let filteredTrips = trips.filter(trip => {

      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);

      if (activeCategory === "Ongoing") {
        return today >= start && today <= end;
      }

      if (activeCategory === "Upcoming") {
        return today < start;
      }

      if (activeCategory === "Past") {
        return today > end;
      }
    });

    if (filteredTrips.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }

    filteredTrips.forEach(trip => {

      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      const diff = end - start;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

      const formattedStart = start.toLocaleDateString("en-GB", {
        day:'2-digit', month:'short', year:'numeric'
      });

      const formattedEnd = end.toLocaleDateString("en-GB", {
        day:'2-digit', month:'short', year:'numeric'
      });

      const card = document.createElement("div");

      card.className =
"bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition duration-300 overflow-hidden cursor-pointer";


card.innerHTML = `
  <div class="relative h-44 overflow-hidden">

    <img src="https://source.unsplash.com/800x600/?${trip.destination},city"
         class="w-full h-full object-cover transition duration-500 hover:scale-105" />

    <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

    <div class="absolute bottom-4 left-5 text-white">
      <h3 class="text-xl font-semibold tracking-tight">
        ${trip.title || trip.destination + " Trip"}
      </h3>
    </div>

  </div>

  <div class="p-6 space-y-3">

    <!-- 🔵 Highlighted Dates -->
    <p class="text-base font-semibold text-blue-600 tracking-tight">
      ${formattedStart} – ${formattedEnd}
    </p>

    <!-- Description -->
    <p class="text-sm text-gray-700 leading-relaxed line-clamp-2">
      ${trip.description || `A planned journey to ${trip.destination}.`}
    </p>

    <!-- Bottom Row -->
    <div class="flex justify-between items-center pt-3 border-t border-gray-100">

      <span class="text-xs text-gray-400 uppercase tracking-wide">
        ${activeCategory}
      </span>

      <button data-id="${trip.id}" onclick="event.stopPropagation();"
        class="text-sm font-medium text-red-500 hover:text-red-600 transition">
        Delete
      </button>

    </div>

  </div>
`;




      container.appendChild(card);

      // Navigate to itinerary on card click
      card.addEventListener("click", function() {
        window.location.href = `Main_Itinerary.html?id=${trip.id}`;
      });

      const deleteBtn = card.querySelector("button");
      deleteBtn.addEventListener("click", function () {
        const id = Number(this.getAttribute("data-id"));
        trips = trips.filter(t => t.id !== id);
        localStorage.setItem("trips", JSON.stringify(trips));
        renderTrips();
      });
    });
  }


  renderTrips();

  });

