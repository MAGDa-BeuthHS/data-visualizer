/**
 * Created by Minh Hoang DANG on 05/05/2017.
 */

var size = 300;
var sizeLng = 237, sizeTime = size, sizeLat = 235;
var newSizeX = sizeLng, newSizeY = sizeTime, newSizeZ = sizeLat;
var step = 50;
var offsetNX = 0, offsetNY = 0, offsetNZ = 0;
var processedData, dataAmount;
var fileName = 'gistar_output_d';

var TIME_STEP_LOWER_BOUND, TIME_STEP_UPPER_BOUND, ZSCORE_LOWER_BOUND, ZSCORE_UPPER_BOUND, ZSCORE_SCALE, X_LOWER_BOUND, X_UPPER_BOUND, Y_LOWER_BOUND, Y_UPPER_BOUND;
var xLowerBound, xUpperBound, yLowerBound, yUpperBound, timeStepLowerBound, timeStepUpperBound, zScoreLowerBound, zScoreUpperBound;
var axisXScale, axisYScale, axisZScale;
var X_SCALE, Y_SCALE, Z_SCALE;

var CSVLoader = new THREE.FileLoader();
CSVLoader.setResponseType('text');
CSVLoader.load(`./data/${fileName}.minified.json`, function (text) {
    processedData = JSON.parse(text);
    dataAmount = processedData.length;

    // Sorting algorithm
    TIME_STEP_LOWER_BOUND = (processedData[0])['time_step'], TIME_STEP_UPPER_BOUND = (processedData[processedData.length - 1])['time_step'];
    ZSCORE_LOWER_BOUND = (processedData[0])['zscore'], ZSCORE_UPPER_BOUND = (processedData[processedData.length - 1])['zscore'];
    X_LOWER_BOUND = (processedData[0])['cell_x'], X_UPPER_BOUND = (processedData[processedData.length - 1])['cell_x'];
    Y_LOWER_BOUND = (processedData[0])['cell_y'], Y_UPPER_BOUND = (processedData[processedData.length - 1])['cell_y'];

    for(var entry of processedData){
        if(entry['time_step'] < TIME_STEP_LOWER_BOUND)
            TIME_STEP_LOWER_BOUND = entry["time_step"];
        if(entry["time_step"] > TIME_STEP_UPPER_BOUND)
            TIME_STEP_UPPER_BOUND = entry["time_step"];

        if(entry["zscore"] < ZSCORE_LOWER_BOUND)
            ZSCORE_LOWER_BOUND = entry["zscore"];
        if(entry["zscore"] > ZSCORE_UPPER_BOUND)
            ZSCORE_UPPER_BOUND = entry["zscore"];

        if(entry["cell_x"] < X_LOWER_BOUND)
            X_LOWER_BOUND = entry["cell_x"];
        if(entry["cell_x"] > X_UPPER_BOUND)
            X_UPPER_BOUND = entry["cell_x"];

        if(entry["cell_y"] < Y_LOWER_BOUND)
            Y_LOWER_BOUND = entry["cell_y"];
        if(entry["cell_y"] > Y_UPPER_BOUND)
            X_UPPER_BOUND = entry["cell_y"];
    }

    console.log(`Time_step: ${TIME_STEP_LOWER_BOUND} - ${TIME_STEP_UPPER_BOUND}`);
    console.log(`zScore: ${ZSCORE_LOWER_BOUND} - ${ZSCORE_UPPER_BOUND}`);
    console.log(`cell_x: ${X_LOWER_BOUND} - ${X_UPPER_BOUND}`);
    console.log(`cell_y: ${Y_LOWER_BOUND} - ${Y_UPPER_BOUND}`);

    timeStepLowerBound = TIME_STEP_LOWER_BOUND; timeStepUpperBound = TIME_STEP_UPPER_BOUND;
    zScoreLowerBound = ZSCORE_LOWER_BOUND; zScoreUpperBound = ZSCORE_UPPER_BOUND;
    xLowerBound = X_LOWER_BOUND; xUpperBound = X_UPPER_BOUND;
    yLowerBound = Y_LOWER_BOUND; yUpperBound = Y_UPPER_BOUND;

    X_SCALE = X_UPPER_BOUND - X_LOWER_BOUND;
    Y_SCALE = TIME_STEP_UPPER_BOUND - TIME_STEP_LOWER_BOUND;
    Z_SCALE = Y_UPPER_BOUND - Y_LOWER_BOUND;
    ZSCORE_SCALE = ZSCORE_UPPER_BOUND - ZSCORE_LOWER_BOUND;
});

var stats, camera, controls, WebGLRenderer, cssRenderer;
var WebGLScene = new THREE.Scene();
var cssScene = new THREE.Scene();
var raycaster = new THREE.Raycaster();

var mouse = new THREE.Vector2(), INTERSECTED;
var CUnitCluster = new THREE.Object3D();
//var tooltipContext, tooltipTex, spriteToolTip;
var zoomAmount = 1;
var zoomFactor = 5;
var isLMB = false, isRMB = false;

// Offset along axis X, Z, Y
var offsetZ = -sizeLng/2 + (sizeLng/step)/2;
var offsetX = sizeLat/2 - (sizeLat/step)/2 ;
var offsetY = sizeTime/2 - (sizeTime/step)/2;

var mapMesh, mapMat, mapLayer;
var dimensionX = sizeLng/step;
var dimensionY = sizeTime/step;
var dimensionZ = sizeLat/step;

var extrudeLayer = -1, mustExtrude = false, mustScale = false;


// Base plane (O - Lat - Lng)
var baseOXYGridHelper = new THREE.GridHelper(size, step);
baseOXYGridHelper.position.z = 0;
baseOXYGridHelper.position.x = 0;
baseOXYGridHelper.position.y = -size/2;
baseOXYGridHelper.scale.x = (sizeLat/size);
baseOXYGridHelper.scale.z = (sizeLng/size);
baseOXYGridHelper.renderOrder = 1;

var test = createDynamicGridHelper('OXY', 100);
WebGLScene.add(test);

// Plane along Longitude axis (O - Time - Lng)
var baseOYZGridHelper = new THREE.GridHelper(size, step);
baseOYZGridHelper.rotation.z = (Math.PI/2);
baseOYZGridHelper.rotation.y = (Math.PI/2);
baseOYZGridHelper.position.x = baseOXYGridHelper.position.x ;
baseOYZGridHelper.position.z = baseOXYGridHelper.position.z + sizeLng/2;
baseOYZGridHelper.position.y = baseOXYGridHelper.position.y + size/2;
baseOYZGridHelper.scale.z = (sizeLat/size);
baseOYZGridHelper.renderOrder = 1;

// Plane along Latitude axis (O - Time - Lat)
var baseOXZGridHelper = new THREE.GridHelper(size, step);
baseOXZGridHelper.rotation.z = (Math.PI/2);
baseOXZGridHelper.position.x = baseOXYGridHelper.position.x - sizeLat/2;
baseOXZGridHelper.position.z = baseOXYGridHelper.position.z;
baseOXZGridHelper.position.y = baseOXYGridHelper.position.y + size/2;
baseOXZGridHelper.scale.z = (sizeLng/size);
baseOXZGridHelper.renderOrder = 1;

var GEO_PRISM = new THREE.CylinderGeometry(dimensionX, dimensionZ, dimensionY, 6, 4);
var GEO_CUBE = new THREE.BoxGeometry(dimensionX, dimensionY, dimensionZ);
var BRUSH_SIZE = 1;

var CAMERA_SPAWN = new THREE.Vector3(size, size, size);

var LABEL_ORIGIN_SPAWN = new THREE.Vector3( baseOXYGridHelper.position.x - (size - sizeLng/2), baseOXYGridHelper.position.y, baseOXYGridHelper.position.z + (size - sizeLat/2));
var LABEL_TIME_SPAWN = new THREE.Vector3( baseOXZGridHelper.position.x, baseOXZGridHelper.position.y + (size - sizeTime/2), baseOXZGridHelper.position.z + (size - sizeLat/2) );
var LABEL_LAT_SPAWN = new THREE.Vector3( baseOXYGridHelper.position.x - (size - sizeLng/2), baseOXYGridHelper.position.y - size*0.1, - baseOXYGridHelper.position.z - (size - sizeLat/2) );
var LABEL_LNG_SPAWN = new THREE.Vector3( baseOXYGridHelper.position.x + (size - sizeLng/2), baseOXYGridHelper.position.y - size*0.1, baseOXYGridHelper.position.z + (size - sizeLat/2) );

var labelOrigin, labelT, labelLng, labelLat;

// Embed layer from OpenStreet Map

var locations = [];

var zoom = 13;
var LNG_MIN = -74.25909, LNG_MAX = -73.70009, LAT_MIN = 40.477399, LAT_MAX = 40.917577;
//var LNG_MIN = -74.38705, LNG_MAX = -73.74435, LAT_MIN = 40.520063, LAT_MAX = 40.874064;
var newLngMin = LNG_MIN, newLatMin = LAT_MIN, newLngMax = LNG_MAX, newLatMax = LAT_MAX;
var loc = encodeURIComponent(`${LNG_MIN},${LAT_MIN},${LNG_MAX},${LAT_MAX}`);

// A empty div is added in front of it to prevent users from interacting with the cube
var OSMFrame='<div id="outerOSM" style="opacity: 1"><div id="innerOSM">'+
    '<div id="OSMLayerBlocker" style="position:fixed;width:100%;height:100%;"></div>'+
    `<iframe id="OSMLayer" width="${661}px" height="${689}px" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" ` +
    `src="http://www.openstreetmap.org/export/embed.html?bbox=LOCATION&amp;layers=MAPTYPE&amp;marker=MRKERS" ` +
    'style="border: 1px solid black"></iframe>' +
    '</div></div>';

// Choose between roadmap, satellite, hybrid or terrain
var mapoption = '';
var maptype = 'mapnik' + mapoption;
var markers = encodeURIComponent(`${LAT_MIN},${LNG_MIN}`);
var sides = [];

// Camera types
var isInPerspectiveMode = true;

var combinedCamera = new THREE.CombinedCamera(window.innerWidth, window.innerHeight, 90, 1, 1000, -500, 1000);
combinedCamera.isPerspectiveCamera = true;
combinedCamera.isOrthographicCamera = false;
combinedCamera.position.copy(CAMERA_SPAWN);
combinedCamera.lookAt(new THREE.Vector3(sizeLng/2, sizeTime/2, sizeLat/2));

var perspectiveCamera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 5000 );
perspectiveCamera.position.set( 500, 350, 750 );


