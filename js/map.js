// Mapbox token
const mapbox_token = 'pk.eyJ1Ijoibm92dXMxMDIwIiwiYSI6ImNrcGltcnp0MzBmNzUybnFlbjlzb2R6cXEifQ.GjmiO9cPjoIozKaG7nJ4qA'

//YOUR TURN: add your Mapbox token
mapboxgl.accessToken = mapbox_token
// mapboxgl.accessToken = 'pk.eyJ1Ijoibm92dXMxMDIwIiwiYSI6ImNrcGltcnp0MzBmNzUybnFlbjlzb2R6cXEifQ.GjmiO9cPjoIozKaG7nJ4qA'; let map = new mapboxgl.Map({ container: 'map', // container id style: 'mapbox://styles/mapbox/streets-v11', center: [-96, 37.8], // starting position zoom: 3 // starting zoom }); // Add geolocate control to the map. map.addControl( new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }) );

let map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/streets-v11', // YOUR TURN: choose a style: https://docs.mapbox.com/api/maps/#styles
    center: [-101.67517342866886,39.148784399009294], // starting position [lng, lat]
    // attributionControl: false
});


// geocoder/searchbar
let geocoder = new MapboxGeocoder({ // Initialize the geocoder
    accessToken: mapbox_token, // Set the access token
    mapboxgl: mapboxgl, // Set the mapbox-gl instance
});
// Add the geocoder to the map
map.addControl(geocoder);
map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');


let a = $.ajax({
    type: "GET",
    url: `https://api.mapbox.com/datasets/v1/novus1020/ckpmr3oan039k27ng6lp616xj/features?access_token=${mapbox_token}`,
    dataType: "json",
    success: function (data) {
        console.log('ok', data)
    }
}).done(geojson => {

    let UseBbox = (geo, pad) => {
        let bbox = turf.bbox(geo);
        map.fitBounds(bbox, {
            padding: pad,
        })
    }

    map.on('load', () => {
       
        let query = (latlng) => {
            let makeRadius = (lngLatArray, radiusInMiles) => {
                let point = turf.point(lngLatArray);
                let buffered = turf.buffer(point, radiusInMiles, {
                    units: 'miles'
                });
                return buffered;
            }

            let searchRadius = makeRadius(latlng, 500);

            let source = map.getSource('query-radius')
            source.setData(searchRadius);
            
            UseBbox(source._data, 70)

            let spatialJoin = (sourceGeoJSON, filterFeature) => {
                let joined = sourceGeoJSON.features.filter(function (feature) {
                    return turf.booleanPointInPolygon(feature, filterFeature)
                });
                return joined;
            }

            let featuresInBuffer = spatialJoin(geojson, searchRadius);

            let result = map.getSource('query-results')
            result.setData(turf.featureCollection(featuresInBuffer));

            if(result._data.features.length === 0) {
                let side =  document.querySelector('.listing-container').id = 'hide-bar'
            }

            let list = document.getElementById('listing')
            let newList = result._data.features.map(a => {
                let coor = a.geometry.coordinates.map(c => {
                    return c.toFixed(3)
                })
                let data = `
                <li class="sidebar-dropdown">
                    <a>
                        <p class="query-res"><span class="small-date">${a.properties['title'].replace("Provider", "")}</span>
                        <br>
                        <span style="font-weight:400;color:#0000008a;font-size:12px">${a.properties['address-display']}</span>
                        <br>
                        <span onclick="openInNewTab('${a.properties['provider-website']}')" style="font-weight:normal;color:blue;font-size:12px"> ${a.properties['phone']} | Website</span>
                        <br>
                        <span style="font-weight:normal;font-size:12px;;"> ${a.properties['filter']}</span>
                        <input type="hidden" value=${coor[0]}>
                        <input type="hidden" value=${coor[1]}>
                        </p>
                    </a>
                </li>
                `
                return data
            })

            let newEl = document.createElement('ul')
            newEl.id = 'newData'
            let temptArray = null

            function delete_row(e) {
                e.parentElement.remove();
            }

            if (result._data.features.length !== 0) {
                document.getElementById('default').style.display = "none"
                newEl.innerHTML = newList.join(",").replaceAll(",", "")
                list.appendChild(newEl)
                document.getElementById('query-count').innerText = `${result._data.features.length}`
            } else {
                document.getElementById('newData').style.display = "none"
                document.getElementById('default').style.display = "block"
                document.getElementById('query-count').innerText = '0'
            }

            let removeList = list.querySelectorAll('ul')

            if (removeList.length > 3) {
                removeList[2].remove()
            }
            let u = list.querySelectorAll('li')
            let p = new mapboxgl.Popup({
                closeOnMove: true,
                closeButton: false
            })
            for (let i in u) {
                if (i > 1) {
                    let l = u[i]
                    l.addEventListener("mouseover", function (event) {
                        let c = event.target.querySelectorAll("input")
                        let content = event.target.querySelectorAll(".query-res span")
                        console.log(content[1].innerText)
                        let lat = c[0].value
                        let long = c[1].value

                        let popup = p
                            .setLngLat([lat, long])
                            .setHTML(`
                            <a>
                            <p class="query-res"><span class="small-date">${content[0].innerText}</span>
                            <br>
                            <span style="font-weight:400;color:#0000008a;font-size:12px">${content[1].innerText}</span>
                            <br>
                            <span style="font-weight:normal;color:blue;font-size:12px">${content[2].innerText}</span>
                            <br>
                            <span style="font-weight:normal;font-size:12px;;">${content[3].innerText}</span>
                            </p>
                            </a>
                            `)
                            .addTo(map);
                    })
                }
            }
        }

        map.addSource('novus', {
            'type': 'geojson',
            'data': geojson
        });

        let eventLngLat;
        let currentM = new mapboxgl.Marker()
        navigator.geolocation.getCurrentPosition(position => {
            eventLngLat = [position.coords.longitude, position.coords.latitude]
            console.log(eventLngLat)
            currentM.setLngLat(eventLngLat)
                .addTo(map);
            document.querySelector('.listing-container').id = 'show-bar'
            query(eventLngLat)
        })
        if (geocoder) {
            eventLngLat = '';
            geocoder.on('result', (e) => {
                eventLngLat = e.result.geometry.coordinates
                currentM.setLngLat(eventLngLat)
                    .addTo(map);
                document.querySelector('.listing-container').id = 'show-bar'
                query(eventLngLat)
            });
        }

        map.addLayer({
            id: 'query-radius',
            source: {
                type: 'geojson',
                data: {
                    "type": "FeatureCollection",
                    "features": []
                }
            },
            type: 'fill',
            paint: {
                'fill-color': '#F1CF65',
                'fill-opacity': 0.5,
            }
        });

        map.addLayer({
            id: 'query-results',
            source: {
                type: 'geojson',
                data: {
                    "type": "FeatureCollection",
                    "features": []
                }
            },
            type: 'circle',
            paint: {
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-stroke-color': 'orange',
                'circle-stroke-opacity': 1,
                "circle-opacity": 0,
            }
        });

      
        UseBbox(geojson,100)

        let filterGroup = document.getElementById('menu');
        
        let color = ['dropship', '#ee9b00', 'delivery-citywide', '#ca6702', 'delivery-statewide-THC', '#5a189a', 'other', '#9b2226',
                     'dispensary-delivery-thc', '#d00000', 'deliver', '#e9c46a', 'deliver-statewide', '#023047']

        geojson.features.forEach((feature,i) => {
            
            let type = feature.properties['type'];
            let layerID = 'poi-' + type;
            // Add a layer for this symbol type if it hasn't been added already.
            if (!map.getLayer(layerID)) {
                map.addLayer({
                    'id': layerID,
                    'type': 'circle',
                    'source': 'novus',
                    'paint': {
                        'circle-color':'#41a1fb',
                        'circle-radius': 4,
                        'circle-stroke-width': 2,
                        'circle-stroke-color': 'white',
                        'circle-stroke-opacity': 1
                    },
                    'filter': ['==', 'type', type]
                });
                // console.log(layerID)
                // Add checkbox and label elements for the layer.
                let div = document.createElement('div')
                div.className = 'dbgCont'

                let lab = document.createElement('label')
                lab.innerText = type
                lab.className = 'container'
                lab.setAttribute('for', layerID)

                let input = document.createElement('input')
                input.id = layerID
                input.type = "checkbox"
                input.name = `radio${i}`
                input.checked = true

                let span = document.createElement('span')
                span.className = `checkmark c${i}`

                lab.appendChild(input)
                lab.appendChild(span)

                // div.appendChild(inp)
                // let input = document.createElement('input');
                // input.type = 'checkbox';
                // input.id = layerID;
                // input.checked = true;
                // // input.className = 'dbgCheck'
                div.appendChild(lab);

                // let label = document.createElement('label');
                // label.setAttribute('for', layerID);
                // label.textContent = type;
                // label.className = "lbl padding-8";
                // div.appendChild(elements);

                filterGroup.appendChild(div)

                // When the checkbox changes, update the visibility of the layer.
                input.addEventListener('change', function (e) {
                    map.setLayoutProperty(
                        layerID,
                        'visibility',
                        e.target.checked ? 'visible' : 'none'
                    );
                    console.log(e)
                });
            }
        })
    });
})
