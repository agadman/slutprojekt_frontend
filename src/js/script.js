/**
 * API-nyckel från .env
 * @constant {string}
 */
const API_KEY = process.env.API_KEY; 

/**
 * Standardplats om användarens position inte godkänns
 * @type {Array<number>}
 */
var defaultLocation = [51.505, -0.09];

/**
 * Variabel för Leaflet-kartan
 * @type {L.map}
 */
var map = L.map('map');

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

/**
 * Hämtar användarens plats och anropar fetchEventsByLocation
 */
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(fetchEventsByLocation, showError);
    } else {
        setDefaultLocation();
    }
}

/**
 * Hämtar evenemang baserat på användarens position (eller standard/default position)
 * @param {GeolocationPosition} position -- Användarens position
 */
function fetchEventsByLocation(position) {
    let lat = position.coords.latitude;
    let lon = position.coords.longitude;
    map.setView([lat, lon], 12);  
    fetchEvents(lat, lon);
}

/**
 * Visar felmeddelande om något misslyckas med att hämta användarens position
 * @param {GeolocationPositionError} error  -- Felmeddelande
 */
function showError(error) {
    console.warn("Geolocation misslyckades:", error.message);
    setDefaultLocation();
}

/**
 * Visar standardplatsen på kartan och kallar på funktionen för att hämta evenemang
 */
function setDefaultLocation() {
    map.setView(defaultLocation, 12);
    fetchEvents(defaultLocation[0], defaultLocation[1]);
}

/**
 * Hämtar evenemang från Ticketmaster api baserat på lat/lon eller stad.
 * @param {number} lat  -- Latitude
 * @param {number} lon -- Longitude
 * @param {string} city -- Stad
 * @returns {Promise<void>} -- Returnerar en promise som hämtar och uppdaterar evenemang
 */
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

/**
 * Uppdaterar listan med evenamang.
 * @param {Object} data -- Data (json) från api:et.
 */
function updateEventsList(data) {
    let eventsList = document.getElementById('eventsList');
    eventsList.innerHTML = "";

    let sortedEvents = data._embedded.events.sort((a, b) => 
        new Date(a.dates.start.localDate) - new Date(b.dates.start.localDate)
    );

    sortedEvents.forEach(event => {
        let venue = event._embedded?.venues?.[0];
        let venueName = venue?.name || venue?.address?.line1 || "Plats ej tillgänglig";
        let eventImage = event.images && event.images.length > 0 ? event.images[0].url : '';
    
        let listItem = document.createElement('li');
        listItem.innerHTML = `
            <article class="event-item">
                <img src="${eventImage}" alt="${event.name}" class="event-image">
                <div class="event-info">
                    <h2><a href="${event.url}" target="_blank">${event.name}</a></h2>
                    <p class="event-details">${event.dates.start.localDate} - ${venueName}</p>
                </div>
            </article>
        `;
    
        eventsList.appendChild(listItem);
    });    
}

/**
 * Uppdaterar markörer på kartan med platser för evemangen.
 * @param {Object} data -- Data från api:et. 
 */
function updateMapMarkers(data) {
    map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });

    let uniqueVenues = new Map(); 

    data._embedded.events.forEach(event => {
        let venue = event._embedded?.venues?.[0];

        if (!venue || !venue.location) {
            console.warn(`Ingen plats hittad för eventet: ${event.name}`);
            return;
        }

        let lat = parseFloat(venue.location.latitude);
        let lon = parseFloat(venue.location.longitude);
        let key = `${lat},${lon}`; 

        if (!uniqueVenues.has(key)) {
            uniqueVenues.set(key, { venueName: venue.name, lat, lon, events: [] });
        }

        uniqueVenues.get(key).events.push(event);
    });

    uniqueVenues.forEach(({ venueName, lat, lon, events }) => {
        let eventList = events.map(event => 
            `<p><strong><a href="${event.url}" target="_blank">${event.name}</a></strong><br>${event.dates.start.localDate}</p>`
        ).join("");

        let venue = events[0]._embedded?.venues?.[0];
        let locationText = venueName || venue?.address?.line1 || "Plats ej tillgänglig";

        let popupContent = `
            <strong>${locationText}</strong><br>
            <div class="popup-event-list">${eventList}</div>
        `;

        L.marker([lat, lon]).addTo(map)
            .bindPopup(popupContent);
    });

    if (uniqueVenues.size > 0) {
        let bounds = L.latLngBounds([...uniqueVenues.values()].map(v => [v.lat, v.lon]));
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

/**
 * Eventlyssnare för knappen när input getts.
 */
document.addEventListener('DOMContentLoaded', function() {
    const searchButton = document.getElementById('searchButton');
    searchButton.addEventListener('click', searchCity);
});

/**
 * Hämtar evenemang baserat på information som användaren skrivit i input.
 */
function searchCity() {
    let city = document.getElementById('cityInput').value;
    if (!city) {
        alert("Ange en stad!");
        return;
    }
    fetchEvents(null, null, city);
    document.querySelector('.layout').scrollIntoView({ behavior: 'smooth' });
}
getLocation();