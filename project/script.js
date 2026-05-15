document.addEventListener("DOMContentLoaded", function () {

  /* ================= ELEMENTS ================= */

  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const destinationInput = document.getElementById("destination");
  const aboutTrip = document.getElementById("aboutTrip");
  const form = document.getElementById("tripForm");

  // If page does not contain trip form, stop
  if (!form) return;

  /* ================= DATE RESTRICTIONS ================= */

  const today = new Date().toISOString().split("T")[0];
  startDateInput.setAttribute("min", today);
  endDateInput.setAttribute("min", today);

  startDateInput.addEventListener("change", function () {
    endDateInput.value = "";
    endDateInput.setAttribute("min", this.value);
  });

  /* ================= AUTO SUMMARY ================= */

  function generateTripTemplate() {

    const destination = destinationInput.value.trim();
    const startDateValue = startDateInput.value;
    const endDateValue = endDateInput.value;

    if (!destination || !startDateValue || !endDateValue) return;

    const startDate = new Date(startDateValue);
    const endDate = new Date(endDateValue);

    if (endDate < startDate) return;

    const diffTime = endDate - startDate;
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const formattedStart = startDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const formattedEnd = endDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    aboutTrip.value =
      `This is a ${days}-day trip to ${destination} from ${formattedStart} to ${formattedEnd}.`;
  }

  destinationInput.addEventListener("input", generateTripTemplate);
  startDateInput.addEventListener("change", generateTripTemplate);
  endDateInput.addEventListener("change", generateTripTemplate);

  /* ================= SAVE + REDIRECT ================= */

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const destination = destinationInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const about = aboutTrip.value.trim();

    if (!destination || !startDate || !endDate) {
      alert("Please fill all required fields.");
      return;
    }

    const newTrip = {
      id: Date.now(),
      destination,
      startDate,
      endDate,
      about
    };

    let trips = JSON.parse(localStorage.getItem("trips")) || [];
    trips.push(newTrip);

    localStorage.setItem("trips", JSON.stringify(trips));

    // 🔥 Redirect to Trips page
    window.location.href = "trips.html";
  });

});
