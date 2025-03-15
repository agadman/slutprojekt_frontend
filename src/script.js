const API_KEY = process.env.VITE_API_KEY; 

var defaultLocation = [51.505, -0.09];
var map = L.map('map');

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(fetchEventsByLocation, showError);
    } else {
        setDefaultLocation();
    }
}

function fetchEventsByLocation(position) {
    let lat = position.coords.latitude;
    let lon = position.coords.longitude;
    map.setView([lat, lon], 12);
    
    fetchEvents(lat, lon);
}

function showError(error) {
    console.warn("Geolocation misslyckades:", error.message);
    setDefaultLocation();
}

function setDefaultLocation() {
    map.setView(defaultLocation, 12);
    fetchEvents(defaultLocation[0], defaultLocation[1]);
}

async function fetchEvents(lat, lon, city = null) {
    let url = city 
        ? `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&city=${city}&size=10`
        : `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&latlong=${lat},${lon}&radius=50&size=10`;

    try {
        let response = await fetch(url);
        let data = await response.json();

        if (!data._embedded || !data._embedded.events) {
            alert("Inga evenemang hittades.");
            return;
        }

        updateEventsList(data);
        updateMapMarkers(data);
    } catch (error) {
        console.error("Fel vid hämtning av evenemang:", error);
    }
}

function updateEventsList(data) {
    let eventsList = document.getElementById('eventsList');
    eventsList.innerHTML = "";

    data._embedded.events.forEach(event => {
        let listItem = document.createElement('li');
        listItem.innerHTML = `<strong><a href="${event.url}" target="_blank">${event.name}</a></strong> - ${event.dates.start.localDate} <br> ${event._embedded.venues[0].name}`;
        eventsList.appendChild(listItem);
    });
}

function updateMapMarkers(data) {
    map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });

    data._embedded.events.forEach(event => {
        let venue = event._embedded.venues[0];
        let lat = venue.location.latitude;
        let lon = venue.location.longitude;

        L.marker([lat, lon]).addTo(map)
            .bindPopup(`<strong>${event.name}</strong><br>${event.dates.start.localDate}<br>${venue.name}`);
    });

    let firstEvent = data._embedded.events[0]._embedded.venues[0].location;
    map.setView([firstEvent.latitude, firstEvent.longitude], 12);
}

document.addEventListener('DOMContentLoaded', function() {
    const searchButton = document.getElementById('searchButton');
    searchButton.addEventListener('click', searchCity);
});

function searchCity() {
    let city = document.getElementById('cityInput').value;
    if (!city) {
        alert("Ange en stad!");
        return;
    }
    fetchEvents(null, null, city);
}

getLocation();