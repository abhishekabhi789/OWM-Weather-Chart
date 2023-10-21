var owmData = null;
var cityData = [];
var timeOut = null;
var customMarkers = [];
var chart = null;
const locale = window.navigator.language.split('-')[0];
const constants = { UNITS: { METRIC: "metric", IMPERIAL: "imperial", STANDARD: "standard" }, VISIBILITY: { VISIBLE: "visible", HIDDEN: "hidden" } }
function getStrings() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'strings.json', false);
    xhr.send();
    if (xhr.status === 200) {
        return JSON.parse(xhr.responseText)[locale];
    } else {
        console.error('Error fetching strings JSON:', xhr.status);
        showError('loading error', 'Failed to load resources!');
        return null;
    }
}
const strings = getStrings();
function getId(el) {
    return document.getElementById(el);
}
function weatherIconEnabled() {
    return document.getElementById('show-icons').checked;
}
function willFormatSpeed() {
    return document.getElementById('format-speed').checked;
}
function chosenUnitSystem() {
    return document.querySelector('input[name="unit-radio"]:checked').value;
}
const unitRadios = getId("unit-systems-boxes");
unitRadios.querySelectorAll('.unit-system').forEach(function (unitsystem) {
    unitsystem.addEventListener('click', function () {
        const nowSelected = unitsystem.querySelector('input[type="radio"]');
        const alreadySelected = unitRadios.querySelector('input[type="radio"]:checked');
        getId(nowSelected.value).checked = true;
        if (alreadySelected.id != nowSelected.id) {
            getId('format-speed').disabled = nowSelected.id == constants.UNITS.IMPERIAL ? true : false;
            chart.options.data = [getWeatherObject(), getTemperatureObject(), getHumidityObject(), getWindObject()];
            chart.render();
            refreshCustomMarker();
        }
    });
});

getId('format-speed-box').addEventListener('click', function () {
    getId('format-speed').checked = getId('format-speed').checked == false;
    chart.options.data[3] = getWindObject();
    chart.render();
});
getId('show-icons-box').addEventListener('click', function () {
    getId('show-icons').checked = getId('show-icons').checked == false;
    refreshCustomMarker();
});
getId('theme-alt-box').addEventListener('click', function () {
    getId('theme-alt').checked = getId('theme-alt').checked == false;
    setTheme();
});
getId('dark-mode-box').addEventListener('click', function () {
    getId('dark-mode').checked = getId('dark-mode').checked == false;
    setTheme();
});
getId('reset-city').addEventListener('click', function () {
    getId('save').style.display = 'none';
    getId('cityInput').focus();
    getId('citynamesuggestions').innerHTML = '';
});
function showError(title, message) {
    let errorContainer = document.createElement('div');
    errorContainer.className = 'errorMessage'
    let h1 = document.createElement('h1');
    h1.innerText = title;
    errorContainer.appendChild(h1)
    let p = document.createElement('p');
    p.innerText = message;
    errorContainer.appendChild(p)
    getId('chartContainer').replaceChildren(errorContainer)
}
function refreshCustomMarker() {
    let icons = document.querySelectorAll('#customMarker')
    if (weatherIconEnabled()) {
        repositionCustomMarker()
        icons.forEach(it => it.style.visibility = constants.VISIBILITY.VISIBLE);
    } else {
        icons.forEach(it => it.style.visibility = constants.VISIBILITY.HIDDEN);
    }
}
function getTheme() {
    return (getId('dark-mode').checked) ? 'dark2' : 'light2';
}
function setTheme() {
    const themes = ['dark1', 'light1', 'dark2', 'light2'];
    const nightMode = getId('dark-mode').checked;
    const themeAlt = getId('theme-alt').checked;
    var themeindex = nightMode ? 0 : 1;
    themeindex = themeAlt ? themeindex + 2 : themeindex;
    chart?.set("theme", themes[themeindex]);
    chart?.render();
    const bgColor = (getId('theme-alt').checked) ? "#32373a" : "#2a2a2a";
    document.body.style = nightMode ? `background-color: ${bgColor};color: #dadada;` : 'background-color: #fff;color: #000;';
}
function getUnit(index) {
    if (willFormatSpeed() && index === 1) return (chosenUnitSystem() != constants.UNITS.IMPERIAL) ? 'kmph' : 'mph';
    switch (chosenUnitSystem()) {
        case constants.UNITS.METRIC:
            const metricUnits = ["°C", "m/s", "mm", "m", "hPa"];
            return metricUnits[index];
        case constants.UNITS.IMPERIAL:
            const imperialUnits = ["°F", "mph", "mm", "m", "hPa"];
            return imperialUnits[index];
        default:
            const standardUnits = ["K", "m/s", "mm", "m", "hPa"];
            return standardUnits[index];
    }
}
function getTemperature(t) {
    switch (chosenUnitSystem()) {
        case constants.UNITS.METRIC:
            return (t - 273.15).toFixed(2);
        case  constants.UNITS.IMPERIAL:
            return (((t - 273.15) * (9 / 5)) + 32).toFixed(2);
        default:
            return t;
    }
}

function getSpeed(wind) {
    switch (chosenUnitSystem()) {
        case constants.UNITS.METRIC: {
            return (willFormatSpeed()) ? (wind * 3.6).toFixed(2) : wind;
        }
        case  constants.UNITS.IMPERIAL: {
            return (wind * 2.23694).toFixed(2);
        }
        default: {
            return (willFormatSpeed()) ? (wind * 3.6).toFixed(2) : wind;
        }
    }
}

function getIcons(id) {
    return `https://openweathermap.org/img/wn/${id}@2x.png`;
}

function formatTime(time) {
    date = new Date(time * 1000);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    let strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}

function getWindDirection(deg) {
    let directions = strings.directions.split(',');
    const index = Math.round(deg / 45) % 8;
    return directions[index];
}
function todayOrTomorrow(time) {
    d = new Date(time * 1000);
    n = new Date();
    t = new Date(Date.now() + (24 * 60 * 60 * 1000));
    day = d.getDate();
    today = n.getDate();
    tomorrow = t.getDate();
    if (day == today) r = strings.today;
    else if (day == tomorrow) r = strings.tomorrow;
    else r = day + ' ' + d.toLocaleString('default', { month: 'short' });
    r = r + ' ' + formatTime(time);
    return r;
}

function addMarkerImages(chart) {
    customMarkers = [];
    for (var i = 0; i < chart.data[0].dataPoints.length; i++) {
        customMarkers.push($('<img id="customMarker">').attr("src", chart.data[0].dataPoints[i].markerImageUrl)
            .css("display", "none")
            .css("height", 30)
            .css("width", 30)
            .appendTo($("#chartContainer>.canvasjs-chart-container"))
        );
        positionMarkerImage(customMarkers[i], i);
    }
}

function repositionCustomMarker() {
    for (var i = 0; i < chart.data[0].dataPoints.length; i++) {
        positionMarkerImage(customMarkers[i], i);
    }
}
function positionMarkerImage(customMarker, i) {
    const xAxis = chart.axisX[0];
    const yAxis = chart.axisY[0];
    let dp = chart.options.data[0].dataPoints;
    var pixelX = xAxis.convertValueToPixel(dp[i].x);
    var pixelY = yAxis.convertValueToPixel(dp[i].y);
    if (dp[i].x > xAxis.viewportMinimum && dp[i].x < xAxis.viewportMaximum) {
        customMarker.css({
            "position": "absolute",
            "display": "block",
            "pointer-events": "none",
            "top": pixelY - customMarker.height() / 2,
            "left": pixelX - customMarker.width() / 2
        });
    } else {
        customMarker.css({
            "position": "absolute",
            "display": "none"
        });
    }
}

function changeToPanMode() {
    var childElement = document.getElementsByTagName("button");
    if (childElement[0].getAttribute("state") === "pan") {
        childElement[0].click();
    }
}
function prepareChart() {
    customMarkers = [];
    chart = new CanvasJS.Chart("chartContainer", {
        animationEnabled: true,
        theme: getTheme(),
        zoomEnabled: true,
        title: {
            text: getTitle(),
            fontSize: 20,
        }, subtitles: [
            {
                text: getSubtitle(),
            }],
        legend: {
            cursor: "pointer",
            itemclick: function (e) {

                if (e.dataSeries.visible == null || e.dataSeries.visible) {
                    e.dataSeries.visible = false;
                    if (e.dataSeries.name === strings.weather) document.querySelectorAll('#customMarker').forEach(it => it.style.visibility = 'hidden')
                } else {
                    e.dataSeries.visible = true;
                    if (e.dataSeries.name === strings.weather) document.querySelectorAll('#customMarker').forEach(it => it.style.visibility = 'visible')
                }
                e.chart.render();
                repositionCustomMarker();
            }
        },
        axisX: {
            valueType: "dateTime",
            valueFormatString: "DD MMM hh:mm tt",
            labelMaxWidth: 70,
            gridThickness: 0.2,
            viewportMinimum: Date.now() - (30 * 60 * 1000),
            viewportMaximum: Math.round(Date.now() + (12 * 60 * 60 * 1000)),
        },
        axisY: {
            includeZero: true,
            gridThickness: 0.2,
            valueFormatString: "##0",
        },
        toolTip: {
            animationEnabled: true,
            cornerRadius: 15,
        },
        rangeChanged: function (e) {
            repositionCustomMarker()
            if (e.trigger === "reset") changeToPanMode();
        },
        data: [getWeatherObject(), getTemperatureObject(), getHumidityObject(), getWindObject()]
    });
    chart.render();
    changeToPanMode();
    addMarkerImages(chart);
}
function getTitle() {
    return getLocationName(owmData.lat, owmData.lon);
}
function getSubtitle() {
    for (const it of owmData.hourly) {
        if (it.weather[0].id < 800) {
            const weather = it.weather[0];
            const description = weather.description;
            const time = todayOrTomorrow(it.dt);
            const string = eval('`' + strings.condition + '`');
            return string;
        }
    }
    return 'No weather alert';
}

function getWeatherObject() {
    var weather = [];
    owmData.hourly.forEach(hourly => {
        weather.push({
            label: todayOrTomorrow(hourly.dt),
            x: hourly.dt * 1000,
            y: Math.round(hourly.pop * 100),
            markerImageUrl: getIcons(hourly.weather[0].icon),
            toolTipContent: `<strong>${strings.weather}</strong><br>  ${strings.time}: ${todayOrTomorrow(hourly.dt)} <br/>${strings.pop} : {y}<br/>${strings.weather} : ${hourly.weather[0].main}<br/>${strings.description} : ${hourly.weather[0].description}${(hourly.weather[0].main == 'Rain') ? '</br>' + strings.volume + ' : ' + hourly['rain']['1h'] + ` ${getUnit(2)}` : ''}${(hourly.uvi > 0) ? '<br/> ' + strings.uv_index + ' : ' + hourly.uvi : ''}`
        });
    });
    return {
        type: "spline",
        name: strings.weather,
        xValueType: "dateTime",
        yValueFormatString: "##0.# \"%\"",
        showInLegend: true,
        markerType: "circle",
        markerSize: 10,
        dataPoints: weather
    };
}
function getTemperatureObject() {
    var temp = [];
    owmData.hourly.forEach(hourly => {
        temp.push({
            label: todayOrTomorrow(hourly.dt),
            x: hourly.dt * 1000,
            y: parseFloat(getTemperature(hourly.temp)),
            toolTipContent: `<strong>${strings.temp}</strong> <br/>${strings.time}: ${todayOrTomorrow(hourly.dt)} <br/>${strings.temp} : { y } <br/> ${strings.feels_like} : ${parseFloat(getTemperature(hourly.feels_like))} ${getUnit(0)} <br/> ${strings.dew_point}: ${getTemperature(hourly.dew_point)} ${getUnit(0)}`
        });
    });
    return {
        type: "spline",
        name: strings.temp,
        xValueType: "dateTime",
        yValueFormatString: `0.00\" ${getUnit(0)}\"`,
        showInLegend: true,
        markerType: "triangle",
        markerSize: 7,
        dataPoints: temp
    };
}

function getHumidityObject() {
    var humidity = [];
    owmData.hourly.forEach(hourly => {
        humidity.push({
            label: todayOrTomorrow(hourly.dt),
            x: hourly.dt * 1000,
            y: hourly.humidity,
            toolTipContent: `<strong>${strings.humidity}</strong> </br>  ${strings.time} : ${todayOrTomorrow(hourly.dt)} <br/>${strings.humidity} : {y}<br/>${strings.visibility} : ${hourly.visibility} ${getUnit(3)}`
        });
    });
    return {
        type: "spline",
        name: strings.humidity,
        xValueType: "dateTime",
        yValueFormatString: "0\" %\"",
        showInLegend: true,
        markerType: "square",
        markerSize: 7,
        dataPoints: humidity
    };
}
function getWindObject() {
    var wind = [];
    owmData.hourly.forEach(hourly => {
        wind.push({
            label: todayOrTomorrow(hourly.dt),
            x: hourly.dt * 1000,
            y: parseFloat(getSpeed(hourly.wind_speed)),
            toolTipContent: `<strong>${strings.wind}</strong> <br/>  ${strings.time} : ${todayOrTomorrow(hourly.dt)} <br/>${strings.wind_speed} : {y}<br/>${strings.wind_gust}: ${parseFloat(getSpeed(hourly.wind_gust))} ${getUnit(1)}<br/>${strings.wind_direction} : ${getWindDirection(hourly.wind_deg)}`
        })
    });
    return {
        type: "spline",
        name: strings.wind,
        xValueType: "dateTime",
        yValueFormatString: `0.00\" ${getUnit(1)}\"`,
        showInLegend: true,
        markerType: "cross",
        markerSize: 7,
        dataPoints: wind
    };
}

function fetchOwmData(lat, lon) {
    console.log("fetching data")
    //const apikey = "OWM_API_KEY";
    //const apiUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&lang=${locale}&exclude=current,minutely,daily&appid=${apikey}`;
    const apiUrl = `https://abhishekabhi789.pythonanywhere.com/owm?lat=${lat}&lon=${lon}&locale=${locale}`
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                showError("Network Error", "Reload or try again after sometime\n" + response.error);
                throw new Error('Network response was not ok.');
            }
            return response.json();
        })
        .then(data => {
            owmData = data;
            (!data.error) ? prepareChart(data) : showError('request failed', data.error);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            showError("Failed to fetch data", "Reload or try again after sometime \n" + error);
        });
}

function getLocationName(lat, lon) {
    if (cityData.name) {
        return cityData.name;
    } else if (localStorage.getItem('locName')) {
        return localStorage.getItem('locName');
    } else {
        const api = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&accept-language=${locale}&zoom=14&format=json`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', api, false);
        xhr.send(null);
        if (xhr.status == 200) {
            const data = JSON.parse(xhr.response);
            const name = data.name;
            return name;
        }
    }
}

function fetchWithCurrentLocation(position) {
    try {
        let lat = position.coords.latitude;
        let lon = position.coords.longitude;
        fetchOwmData(lat, lon);
    } catch (error) {
        showError("Failed to get location", "Try search with input field below.");
        console.error("failed to get location", error);
    }
}
function getLocation() {
    const myLat = localStorage.getItem('mylat');
    const myLon = localStorage.getItem('mylon');
    if (myLat & myLon) {
        fetchOwmData(myLat, myLon);
    } else if (navigator.geolocation) {
        showError("Location access needed", "Location information is needed to get weather data for you.")
        navigator.geolocation.getCurrentPosition(fetchWithCurrentLocation, null, { enableHighAccuracy: true });
    } else {
        console.error("Geolocation is not supported by this browser.");
        showError("Failed to get location", "Geolocation is not supported or permisison is not granted. Try search with input field below.");
    }
}
getId('city-input').oninput = function () {
    const input = this.value;
    getId('save').style.display = 'none';
    if (timeOut) {
        clearTimeout(timeOut);
    }
    timeOut = setTimeout(() => {
        getCityNames(input);
    }, 1000);

}
getId('city-input').onchange = function () {
    this.blur();
    clearTimeout(timeOut)
    const index = cityData.findIndex(item => item.display_name === this.value);
    if (index > -1) {
        const lat = cityData[index].lat;
        const lon = cityData[index].lon;
        getId('citynamesuggestions').innerHTML = '';
        cityData = cityData[index];
        this.value = getLocationName();
        getId('save').style.display = 'block';
        fetchOwmData(lat, lon);
    } else {
        console.error('No data found for the selected city.' + index);
    }
}
getId('save').onclick = function (e) {
    e.preventDefault();
    localStorage.setItem('mylat', owmData.lat);
    localStorage.setItem('mylon', owmData.lon);
    localStorage.setItem('locName', cityData.name);
    getId('save').style.display = 'none';
}
function getCityNames(query) {
    const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&accept-language=${locale}&format=json`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            let datalist = getId('citynamesuggestions');
            datalist.innerHTML = '';
            if (data.length > 0) {
                cityData = data;
                data.forEach(it => {
                    let option = document.createElement('option');
                    option.innerText = it.display_name;
                    datalist.appendChild(option);
                })
            } else {
                datalist.innerHTML = '';
                let field = getId('city-input');
                field.setCustomValidity("No city found!");
                field.reportValidity();
                console.log("No suggestions for ", query);
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}
window.onresize = function () {
    if (chart) {
        refreshCustomMarker();
    }
}

function initializeWindow() {
    getId('dark-mode').checked = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme();
}
initializeWindow();
showError("Loading...", "")
getLocation();
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("assets/serviceWorker.js")
            .then(res => console.log("service worker registered"))
            .catch(err => console.log("service worker not registered", err))
    })
}