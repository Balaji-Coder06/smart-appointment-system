function loadSlots() {
  fetch("https://smart-appointment-system.onrender.com/slots")
    .then(res => res.json())
    .then(data => {
      const div = document.getElementById("slots");
      div.innerHTML = "";

      if (data.length === 0) {
        div.innerHTML = `
          <div class="empty">
            No slots available right now
          </div>
        `;
        return;
      }

      data.forEach(slot => {
        div.innerHTML += `
          <div class="card">
            <span>📅 ${slot.date}</span>
            <span>🕒 ${slot.time}</span>
            <button class="primary" onclick="book(${slot.id}, this)">
              Book Appointment
            </button>
          </div>
        `;
      });
    })
    .catch(err => {
      console.error(err);
      alert("Failed to load slots");
    });
}

function book(id, btn) {
  const username = localStorage.getItem("username");

  if (!username) {
    alert("Please login again");
    window.location = "login.html";
    return;
  }

  btn.disabled = true;
  btn.innerText = "Booking...";

  fetch(`https://smart-appointment-system.onrender.com/book/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadSlots();
    })
    .catch(() => {
      btn.disabled = false;
      btn.innerText = "Book Appointment";
      alert("Booking failed");
    });
}
