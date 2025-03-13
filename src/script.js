var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

async function searchCity() {
    let city = document.getElementById('cityInput').value;

    if (!city) {
        alert("Ange en stad!");
        return;
    }

    try {
        let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${city}`);
        let data = await response.json();

        if (data.length === 0) {
            alert("Staden hittades inte.");
            return;
        }

        let lat = data[0].lat;
        let lon = data[0].lon;

        map.setView([lat, lon], 10);
        let marker = L.marker([lat, lon]).addTo(map);
        marker.bindPopup(`<p>${city}</p>`); 

    } catch (error) {
        console.error("Fel vid sökning av stad:", error);
    }
}