const apiKey = "8e9310e39b25766c24c879aef0af9baa";
let unit = "metric";
let currentCity = "";
let isDarkMode = false;

// DOM Elements
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const geoBtn = document.getElementById("geo-btn");
const refreshBtn = document.getElementById("refresh-btn");
const unitBtn = document.getElementById("unit-btn");
const modeBtn = document.getElementById("mode-btn");
const favBtn = document.getElementById("fav-btn");
const favoritesDiv = document.getElementById("favorites");
const currentYear = document.getElementById("current-year");

const weatherCard = document.getElementById("current-weather");
const cityName = document.getElementById("city-name");
const temperature = document.getElementById("temperature");
const weatherDesc = document.getElementById("weather-desc");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const sunrise = document.getElementById("sunrise");
const sunset = document.getElementById("sunset");
const weatherIcon = document.getElementById("weather-icon");
const updatedTime = document.getElementById("updated-time");
const forecast = document.getElementById("forecast");
const errorMsg = document.getElementById("error-msg");
const errorText = document.querySelector(".error-text");

// Set current year in footer
currentYear.textContent = new Date().getFullYear();

// Event Listeners
searchBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeather(city);
        cityInput.value = "";
    }
});

cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const city = cityInput.value.trim();
        if (city) {
            getWeather(city);
            cityInput.value = "";
        }
    }
});

refreshBtn.addEventListener("click", () => {
    if (currentCity) {
        getWeather(currentCity);
        showNotification("Data refreshed successfully!");
    }
});

geoBtn.addEventListener("click", getLocationWeather);

unitBtn.addEventListener("click", () => {
    unit = unit === "metric" ? "imperial" : "metric";
    unitBtn.textContent = unit === "metric" ? "°F" : "°C";
    if (currentCity) {
        getWeather(currentCity);
        showNotification(`Switched to ${unit === "metric" ? "Celsius" : "Fahrenheit"}`);
    }
});

modeBtn.addEventListener("click", toggleTheme);

favBtn.addEventListener("click", saveFavorite);

// Initialize
loadFavorites();
setDefaultCity();

// Set default city to user's location or a popular city
function setDefaultCity() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
                // If geolocation fails, default to London
                getWeather("London");
            }
        );
    } else {
        getWeather("London");
    }
}

// Get weather data for a city
async function getWeather(city) {
    if (!city) return;

    showLoading();
    currentCity = city;

    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${unit}`);

        if (!res.ok) {
            throw new Error("City not found. Please try another city.");
        }

        const data = await res.json();
        displayWeather(data);
        getForecast(city);
        hideError();
    } catch (error) {
        showError(error.message);
    }
}

// Display current weather data
function displayWeather(data) {
    weatherCard.classList.remove("hidden");

    cityName.textContent = `${data.name}, ${data.sys.country}`;
    temperature.textContent = `${Math.round(data.main.temp)}°`;
    weatherDesc.textContent = data.weather[0].description;

    humidity.textContent = data.main.humidity;
    wind.textContent = `${data.wind.speed} ${unit === "metric" ? "km/h" : "mph"}`;
    sunrise.textContent = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    sunset.textContent = new Date(data.sys.sunset * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    updatedTime.textContent = `Updated: ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    weatherIcon.alt = data.weather[0].description;

    // Update favorite button if city is already in favorites
    updateFavoriteButton();
}

// Get 7-day forecast - FIXED VERSION
async function getForecast(city) {
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${unit}`);
        const data = await res.json();

        forecast.innerHTML = "";
        forecast.classList.remove("hidden");

        // Get 7 days starting from tomorrow
        const dailyForecasts = [];
        const daysAdded = new Set();
        const today = new Date().toDateString();

        // Process all forecast items
        for (const item of data.list) {
            const date = new Date(item.dt_txt);
            const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
            const dayDate = date.toDateString();

            // Skip today's forecasts
            if (dayDate === today) continue;

            // Use midday forecasts (around 12:00) when available
            const isMidday = date.getHours() >= 11 && date.getHours() <= 13;

            // If we haven't added this day yet
            if (!daysAdded.has(dayDate)) {
                // Prefer midday forecasts, but use any if midday not available
                dailyForecasts.push({
                    day: dayName,
                    fullDate: dayDate,
                    temp: Math.round(item.main.temp),
                    icon: item.weather[0].icon,
                    description: item.weather[0].description,
                    timestamp: date.getTime()
                });
                daysAdded.add(dayDate);
            }

            // Stop when we have 7 days
            if (dailyForecasts.length >= 7) break;
        }

        // Sort by date and take first 7
        dailyForecasts.sort((a, b) => a.timestamp - b.timestamp);
        const next7Days = dailyForecasts.slice(0, 7);

        // Create forecast cards for next 7 days
        next7Days.forEach(day => {
            const card = document.createElement("div");
            card.className = "forecast-card";
            card.innerHTML = `
                <h4>${day.day}</h4>
                <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="${day.description}">
                <p class="forecast-temp">${day.temp}°</p>
                <p class="forecast-desc">${day.description}</p>
            `;
            forecast.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching forecast:", error);
    }
}
// Get weather by geolocation
function getLocationWeather() {
    if (!navigator.geolocation) {
        showError("Geolocation is not supported by your browser.");
        return;
    }

    showNotification("Detecting your location...");

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            getWeatherByCoords(lat, lon);
        },
        (error) => {
            showError("Location access denied or unavailable.");
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}


async function getWeatherByCoords(lat, lon) {
    try {
        const weatherRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        );
        const weatherData = await weatherRes.json();
        console.log(weatherData);
        displayWeather(weatherData); // your function to show weather
    } catch (error) {
        showError("Unable to fetch weather data.");
        console.error(error);
    }
}

// Toggle dark/light theme
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle("dark");

    const icon = modeBtn.querySelector("i");
    if (isDarkMode) {
        icon.className = "fas fa-sun";
        modeBtn.title = "Switch to light mode";
        showNotification("Dark mode enabled");
    } else {
        icon.className = "fas fa-moon";
        modeBtn.title = "Switch to dark mode";
        showNotification("Light mode enabled");
    }
}

// Save city to favorites
function saveFavorite() {
    if (!currentCity) return;

    let favorites = JSON.parse(localStorage.getItem("favCities")) || [];

    if (!favorites.includes(currentCity)) {
        favorites.push(currentCity);
        localStorage.setItem("favCities", JSON.stringify(favorites));
        loadFavorites();
        updateFavoriteButton();
        showNotification(`${currentCity} added to favorites!`);
    } else {
        // Remove from favorites if already exists
        favorites = favorites.filter(city => city !== currentCity);
        localStorage.setItem("favCities", JSON.stringify(favorites));
        loadFavorites();
        updateFavoriteButton();
        showNotification(`${currentCity} removed from favorites.`);
    }
}

// Load favorites from localStorage
function loadFavorites() {
    favoritesDiv.innerHTML = "";
    let favorites = JSON.parse(localStorage.getItem("favCities")) || [];

    if (favorites.length === 0) {
        const emptyMsg = document.createElement("span");
        emptyMsg.textContent = "No favorites yet";
        emptyMsg.style.opacity = "0.7";
        emptyMsg.style.cursor = "default";
        favoritesDiv.appendChild(emptyMsg);
        return;
    }

    favorites.forEach(city => {
        const span = document.createElement("span");
        span.textContent = city;
        span.addEventListener("click", () => {
            getWeather(city);
            showNotification(`Loading ${city}...`);
        });
        favoritesDiv.appendChild(span);
    });
}

// Update favorite button appearance
function updateFavoriteButton() {
    const favorites = JSON.parse(localStorage.getItem("favCities")) || [];
    const icon = favBtn.querySelector("i");

    if (favorites.includes(currentCity)) {
        favBtn.innerHTML = '<i class="fas fa-star"></i> Remove from Favorites';
        favBtn.style.background = "#6b7280";
    } else {
        favBtn.innerHTML = '<i class="far fa-star"></i> Add to Favorites';
        favBtn.style.background = "var(--accent-secondary)";
    }
}

// Show error message
function showError(message) {
    errorText.textContent = message;
    errorMsg.classList.remove("hidden");
    weatherCard.classList.add("hidden");
    forecast.classList.add("hidden");
}

// Hide error message
function hideError() {
    errorMsg.classList.add("hidden");
}

// Show loading state
function showLoading() {
    cityName.textContent = "Loading...";
    temperature.textContent = "--°";
    weatherDesc.textContent = "Fetching weather data";
    humidity.textContent = "--";
    wind.textContent = "--";
    sunrise.textContent = "--:--";
    sunset.textContent = "--:--";
    updatedTime.textContent = "Updating...";
    weatherIcon.src = "https://openweathermap.org/img/wn/01d@2x.png";

    weatherCard.classList.remove("hidden");
    forecast.classList.add("hidden");
}

// Show notification (toast)
function showNotification(message) {
    // Remove existing notification
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-color);
        color: white;
        padding: 12px 20px;
        border-radius: var(--border-radius);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        font-weight: 500;
        animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
    `;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);

    // Add CSS for animations
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

