/* eslint no-undef: "off", no-unused-vars: "off" */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.126.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/controls/OrbitControls.js";
import { Rhino3dmLoader } from "https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/loaders/3DMLoader.js";
import rhino3dm from "https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/rhino3dm.module.js";



// set up loader for converting the results to threejs
const loader = new Rhino3dmLoader();
loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/");

const definition = "perlin_maze.gh";

// setup input change events
const radius_slider = document.getElementById("radius");
radius_slider.addEventListener("mouseup", onSliderChange, false);
radius_slider.addEventListener("touchend", onSliderChange, false);
const ucount_slider = document.getElementById("ucount");
ucount_slider.addEventListener("mouseup", onSliderChange, false);
ucount_slider.addEventListener("touchend", onSliderChange, false);
const vcount_slider = document.getElementById("vcount");
vcount_slider.addEventListener("mouseup", onSliderChange, false);
vcount_slider.addEventListener("touchend", onSliderChange, false);
const time_slider = document.getElementById("time");
time_slider.addEventListener("mouseup", onSliderChange, false);
time_slider.addEventListener("touchend", onSliderChange, false);
const scale_slider = document.getElementById("scale");
scale_slider.addEventListener("mouseup", onSliderChange, false);
scale_slider.addEventListener("touchend", onSliderChange, false);
const seed_slider = document.getElementById("seed");
seed_slider.addEventListener("mouseup", onSliderChange, false);
seed_slider.addEventListener("touchend", onSliderChange, false);
const start_slider = document.getElementById("start");
start_slider.addEventListener("mouseup", onSliderChange, false);
start_slider.addEventListener("touchend", onSliderChange, false);
const tube_slider = document.getElementById("tube");
tube_slider.addEventListener("mouseup", onSliderChange, false);
tube_slider.addEventListener("touchend", onSliderChange, false);
let rhino, doc;
rhino3dm().then(async (m) => {
  console.log("Loaded rhino3dm.");
  rhino = m; // global
  init();
  compute();
});
/**
 * Call appserver
 */
async function compute() {
  showSpinner(true);

  // initialise 'data' object that will be used by compute()
  const data = {
    definition: definition,
    inputs: {
      radius: radius_slider.valueAsNumber,
      ucount: ucount_slider.valueAsNumber,
      vcount: vcount_slider.valueAsNumber,
      time: time_slider.valueAsNumber,
      scale: scale_slider.valueAsNumber,
      seed: seed_slider.valueAsNumber,
      start : start_slider.valueAsNumber,
      tube: tube_slider.valueAsNumber,
      
    },
  };

  console.log(data.inputs);

  const request = {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  };

  try {
    const response = await fetch("/solve", request);

    if (!response.ok) throw new Error(response.statusText);

    const responseJson = await response.json();
    collectResults(responseJson);
  } catch (error) {
    console.error(error);
  }
}
const downloadButton = document.getElementById("downloadButton")
downloadButton.onclick = download
/**
* Parse response
*/
function collectResults(responseJson) {
const values = responseJson.values;

console.log(values);

// clear doc
try {
  if (doc !== undefined) doc.delete();
} catch {}

//console.log(values)
doc = new rhino.File3dm();

// for each output (RH_OUT:*)...
for (let i = 0; i < values.length; i++) {
  // ...iterate through data tree structure...
  for (const path in values[i].InnerTree) {
    const branch = values[i].InnerTree[path];
    // ...and for each branch...
    for (let j = 0; j < branch.length; j++) {
      // ...load rhino geometry into doc
      const rhinoObject = decodeItem(branch[j]);
      if (rhinoObject !== null) {
        // console.log(rhinoObject)
        doc.objects().add(rhinoObject, null);
      }
    }
  }
}

if (doc.objects().count < 1) {
  console.error("No rhino objects to load!");
  showSpinner(false);
  return;
}

// load rhino doc into three.js scene
const buffer = new Uint8Array(doc.toByteArray()).buffer;
loader.parse(buffer, function (object) {
  // clear objects from scene
  scene.traverse((child) => {
    if (
      child.userData.hasOwnProperty("objectType") &&
      child.userData.objectType === "File3dm"
    ) {
      scene.remove(child);
    }
  });

  ///////////////////////////////////////////////////////////////////////

  // color crvs
  object.traverse((child) => {
    if (child.isLine) {
      if (child.userData.attributes.geometry.userStringCount > 0) {
        //console.log(child.userData.attributes.geometry.userStrings[0][1])
        const col = child.userData.attributes.geometry.userStrings[0][1];
        const threeColor = new THREE.Color("rgb(" + col + ")");
        const mat = new THREE.LineBasicMaterial({ color: threeColor });
        child.material = mat;
      }
    }
  });

  ///////////////////////////////////////////////////////////////////////
  // add object graph from rhino model to three.js scene
  scene.add(object);

// hide spinner and enable download button
showSpinner(false)
downloadButton.disabled = false
// zoom to extents
  zoomCameraToSelection(camera, controls, scene.children)
});
}

/**
* Attempt to decode data tree item to rhino geometry
*/
function decodeItem(item) {
const data = JSON.parse(item.data);
if (item.type === "System.String") {
  // hack for draco meshes
  try {
    return rhino.DracoCompression.decompressBase64String(data);
  } catch {} // ignore errors (maybe the string was just a string...)
} else if (typeof data === "object") {
  return rhino.CommonObject.decode(data);
}
return null
}

/**
* Called when a slider value changes in the UI. Collect all of the
* slider values and call compute to solve for a new scene
*/
function onSliderChange() {
// show spinner
showSpinner(true);
compute();
}

/**
* Shows or hides the loading spinner
*/
function showSpinner(enable) {
if (enable) document.getElementById("loader").style.display = "block";
else document.getElementById("loader").style.display = "none";
}
 // more globals
 let scene, camera, renderer, controls

 /**
  * Sets up the scene, camera, renderer, lights and controls and starts the animation
  */
 function init() {
 
     // Rhino models are z-up, so set this as the default
     THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 );
 
     // create a scene and a camera
     scene = new THREE.Scene()
     scene.background = new THREE.Color(1, 1, 1)
     camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000)
     camera.position.set(1, -1, 1) // like perspective view
 
     // very light grey for background, like rhino
     scene.background = new THREE.Color('whitesmoke')
 
     // create the renderer and add it to the html
     renderer = new THREE.WebGLRenderer({ antialias: true })
     renderer.setPixelRatio( window.devicePixelRatio )
     renderer.setSize(window.innerWidth, window.innerHeight)
     document.body.appendChild(renderer.domElement)
 
     // add some controls to orbit the camera
     controls = new OrbitControls(camera, renderer.domElement)
 
     // add a directional light
     const directionalLight = new THREE.DirectionalLight( 0xffffff )
     directionalLight.intensity = 2
     scene.add( directionalLight )
 
     const ambientLight = new THREE.AmbientLight()
     scene.add( ambientLight )
 
     // handle changes in the window size
     window.addEventListener( 'resize', onWindowResize, false )
 
     animate();
 
 
   }
 
   function animate() {
     scene.traverse(function(child){
       if (child.isMesh){
         child.rotation.y +=0.0008
         child.rotation.z +=0.0008
         child.rotation.x +=0.0008
       }
       //else{(child.ispoint)
         //child.rotation.y +=0.0008
         //child.rotation.z +=0.0008
         //child.rotation.x +=0.0008      }
       else{(child.isLine)
         child.rotation.y +=0.0008
         child.rotation.z +=0.0008
         child.rotation.x +=0.0008
       }})
     requestAnimationFrame(animate);
     renderer.render(scene, camera);
   }
 
 function onWindowResize() {
 camera.aspect = window.innerWidth / window.innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth, window.innerHeight);
 animate();
 }
 
 /**
  * Helper function that behaves like rhino's "zoom to selection", but for three.js!
  */
  function zoomCameraToSelection( camera, controls, selection, fitOffset = 1.2 ) {
   
   const box = new THREE.Box3();
   
   for( const object of selection ) {
     if (object.isLight) continue
     box.expandByObject( object );
   }
   
   const size = box.getSize( new THREE.Vector3() );
   const center = box.getCenter( new THREE.Vector3() );
   
   const maxSize = Math.max( size.x, size.y, size.z );
   const fitHeightDistance = maxSize / ( 2 * Math.atan( Math.PI * camera.fov / 360 ) );
   const fitWidthDistance = fitHeightDistance / camera.aspect;
   const distance = fitOffset * Math.max( fitHeightDistance, fitWidthDistance );
   
   const direction = controls.target.clone()
     .sub( camera.position )
     .normalize()
     .multiplyScalar( distance );
   controls.maxDistance = distance * 10;
   controls.target.copy( center );
   
   camera.near = distance / 100;
   camera.far = distance * 100;
   camera.updateProjectionMatrix();
   camera.position.copy( controls.target ).sub(direction);
   
   controls.update();
    }
 
 /**
  * This function is called when the download button is clicked
  */
 function download () {
     // write rhino doc to "blob"
     const bytes = doc.toByteArray()
     const blob = new Blob([bytes], {type: "application/octect-stream"})
 
     // use "hidden link" trick to get the browser to download the blob
     const filename = data.definition.replace(/\.gh$/, '') + '.3dm'
     const link = document.createElement('a')
     link.href = window.URL.createObjectURL(blob)
     link.download = filename
     link.click()
 }