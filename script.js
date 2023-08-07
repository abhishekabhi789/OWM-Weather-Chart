var owmData = null;
var cityData = [];
var timeOut = null;
var customMarkers = [];
var chart = null;
var theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark2' : 'light2';
const locale = window.navigator.language.split('-')[0];

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
function showWeatherIcons() {
    return document.getElementById('showIcons').checked;
}
function formatSpeed() {
    return document.getElementById('formatSpeed').checked;
}
function unitSystem() {
    return document.querySelector('input[name="unitsystem"]:checked').value;
}
getId('unitsystem').addEventListener('change', function () {
    getId('formatSpeed').disabled = event.target.value == 'imperial' ? true : false;
    chart.options.data = [getWeatherObject(), getTemperatureObject(), getHumidityObject(), getWindObject()];
    chart.render();
    refreshCustomMarker();
});
getId('formatSpeed').addEventListener('change', function () {
    chart.options.data[3] = getWindObject();
    chart.render();
});
getId('showIcons').addEventListener('change', function () {
    refreshCustomMarker();
});
getId('theme-alt').addEventListener('change', function () {
    setTheme();
});
getId('darkmode').addEventListener('change', function () {
    setTheme();
});
getId('reset-city').addEventListener('click', function () {
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
    if (showWeatherIcons()) {
        repositionCustomMarker()
        icons.forEach(it => it.style.visibility = 'visible');
    } else {
        icons.forEach(it => it.style.visibility = 'hidden');
    }
}
function setTheme() {
    const themes = ['dark1', 'light1', 'dark2', 'light2'];
    const nightMode = getId('darkmode').checked;
    var themeAlt = getId('theme-alt').checked;
    var themeindex = nightMode ? 0 : 1;
    themeindex = themeAlt ? themeindex + 2 : themeindex;
    chart?.set("theme", themes[themeindex]);
    chart?.render()
    document.body.style = nightMode ? 'background-color: #212121;color: #dadada;' : 'background-color: #fff;color: #000;';
}
function getUnit(index) {
    if (formatSpeed() && index === 1) return (unitSystem() != 'imperial') ? 'kmph' : 'mph';
    switch (unitSystem()) {
        case "metric":
            let metricUnits = ["°C", "m/s", "mm", "m", "hPa"];
            return metricUnits[index];
        case "imperial":
            let imperialUnits = ["°F", "mph", "mm", "m", "hPa"];
            return imperialUnits[index];
        default:
            let standardUnits = ["K", "m/s", "mm", "m", "hPa"];
            return standardUnits[index];
    }
}
function getTemperature(t) {
    switch (unitSystem()) {
        case "metric":
            return (t - 273.15).toFixed(2);
        case "imperial":
            return (((t - 273.15) * (9 / 5)) + 32).toFixed(2);
        default:
            return t;
    }
}

function getSpeed(wind) {
    switch (unitSystem()) {
        case 'metric': {
            return (formatSpeed()) ? (wind * 3.6).toFixed(2) : wind;
        }
        case 'imperial': {
            return (wind * 2.23694).toFixed(2);
        }
        default: {
            return (formatSpeed()) ? (wind * 3.6).toFixed(2) : wind;
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
        theme: theme,
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
    return (cityData?.display_name) ? cityData.display_name : 'Your Location';
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
                showError("Network Error", "Try again after sometime\n" + response.error);
                throw new Error('Network response was not ok.');
            }
            return response.json();
        })
        .then(data => {
            console.log("request success");
            owmData = data;
            (!data.error) ? prepareChart(data) : showError('request failed', data.error);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            showError("Failed to fetch data", "Try again after sometime \n" + error);
        });
}

function printLocation(position) {
    let latitude = position.coords.latitude;
    let longitude = position.coords.longitude;
    console.log("Latitude: ", latitude, "Longitude: ", longitude);
    fetchOwmData(latitude, longitude);
    showError('Getting data...', "");
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(printLocation);
    } else {
        console.log("Geolocation is not supported by this browser.");
        showError("Failed to get location", "Geolocation is not supported or permisison is not granted. Try search with input field below");
    }
}

getId('cityInput').oninput = function () {
    const input = this.value;
    if (timeOut) {
        clearTimeout(timeOut);
    }
    timeOut = setTimeout(() => {
        console.log(input);
        getCityNames(input);
    }, 1000);
}
getId('cityInput').onchange = function () {
    clearTimeout(timeOut)
    const index = cityData.findIndex(item => item.display_name === this.value);
    if (index > -1) {
        const lat = cityData[index].lat;
        const lon = cityData[index].lon;
        console.log("Latitude: ", lat, "Longitude: ", lon);
        this.value = '';
        getId('citynamesuggestions').innerHTML = '';
        cityData = cityData[index];
        console.log("finalised");
        fetchOwmData(lat, lon);
    } else {
        console.error('No data found for the selected city.' + index);
    }
}
function getCityNames(query) {
    const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json`;

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
                let field = getId('cityInput');
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
        console.log('window resize');
    }
}

function initializeWindow() {
    getId('darkmode').checked = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme();
}
initializeWindow();
showError("Need your location", "Make sure you've granted location permission. Or try search your city")
getLocation();
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("assets/serviceWorker.js")
            .then(res => console.log("service worker registered"))
            .catch(err => console.log("service worker not registered", err))
    })
}