// The floating 3D devices of "Where to find Nextendo": a computer (emulators), the Switch (console) and an
// iPhone next to a Samsung (phone app). Each canvas lists its models in data-modeles ("a.glb|b.glb")
// and, when a model is not upright or not facing the camera, a correction in data-orient
// ("x,y,z|x,y,z" in degrees, one per model). Each model is centred on its own bounding box, so it
// spins around itself and never around empty space. Models only load near the screen, and the
// render loop stops while the card is off screen.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Small screens (phones, tablets): fewer pixels to shade, and no model before its card is near.
const petit = window.matchMedia("(max-width: 1024px)").matches;
// The models are meshopt-compressed (about 5x lighter): the loader needs the decoder.
const chargeur = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

function preparer(gltf, orient, opaque) {
  const modele = gltf.scene;
  if (orient) modele.rotation.set(...orient.map(THREE.MathUtils.degToRad));
  // data-opaque: the computer's materials are exported as "blend" although the case is solid, so
  // its far panels showed through the near ones. Draw them as the solid object they are.
  if (opaque) modele.traverse((o) => {
    if (!o.isMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      m.transparent = false; m.opacity = 1; m.depthWrite = true; m.alphaTest = 0.5; m.needsUpdate = true;
    });
  });
  // Skinned meshes: measure AFTER the bones are applied, or the centre is off.
  modele.updateMatrixWorld(true);
  modele.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); } });
  const boite = new THREE.Box3().setFromObject(modele);
  const dim = boite.getSize(new THREE.Vector3());
  const centre = boite.getCenter(new THREE.Vector3());
  const recentre = new THREE.Group();
  recentre.add(modele);
  modele.position.sub(centre);
  return { groupe: recentre, dim };
}

function demarrer(toile) {
  const renderer = new THREE.WebGLRenderer({ canvas: toile, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, petit ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  camera.position.set(0, 0.25, 4.6);
  const lumiere = new THREE.DirectionalLight(0xffffff, 1.4);
  lumiere.position.set(3, 4, 5);
  scene.add(lumiere, new THREE.AmbientLight(0xffffff, 0.3));

  const taille = () => {
    const r = toile.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  };
  taille();
  new ResizeObserver(taille).observe(toile);

  const fichiers = toile.dataset.modeles.split("|");
  const orients = (toile.dataset.orient || "").split("|").map((o) => (o ? o.split(",").map(Number) : null));
  const cote = fichiers.length > 1;
  // data-y lifts the device inside its card (the Switch sits higher, near the top).
  const hauteur = Number(toile.dataset.y || 0);
  const pivots = [];

  fichiers.forEach((f, i) => {
    const pivot = new THREE.Group();
    // Two devices side by side: each a little smaller, one on each side.
    if (cote) pivot.position.x = (i - (fichiers.length - 1) / 2) * 1.15;
    pivot.position.y = hauteur;
    scene.add(pivot);
    pivots.push(pivot);
    chargeur.load(f, (gltf) => {
      try {
        const { groupe, dim } = preparer(gltf, orients[i], "opaque" in toile.dataset);
        // Phones are sized on their height, so both stand the same size. The rest is sized on its
        // bounding sphere, so no corner leaves the frame whatever the angle of the spin.
        groupe.scale.setScalar(cote ? 1.6 / dim.y : 1.05 / (dim.length() / 2));
        pivot.add(groupe);
        toile.classList.add("est-pret");
        renderer.render(scene, camera);
      } catch (e) { console.error("[3d] model setup", f, e); }
    }, undefined, (e) => console.error("[3d] model load", f, e));
  });

  const horloge = new THREE.Clock();
  let visible = true;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(toile);
  renderer.setAnimationLoop(() => {
    if (!visible || calme) return;
    const t = horloge.getElapsedTime();
    pivots.forEach((p, i) => {
      const d = i * 0.9; // the second device moves slightly out of step with the first
      p.rotation.y = t * 0.35 + d;
      p.rotation.z = Math.sin(t * 0.8 + d) * 0.05;
      p.position.y = hauteur + Math.sin(t * 1.4 + d) * 0.12;
    });
    renderer.render(scene, camera);
  });
}

// Start each canvas when it comes near the screen. On large screens also at the latest 2.5 s after
// load, so the 3D never depends on a single event a browser might not deliver; on phones and
// tablets that fallback would download every model for a visitor who may never scroll there.
document.querySelectorAll(".plateforme-3d").forEach((toile) => {
  let lance = false;
  const lancer = () => {
    if (lance) return;
    lance = true;
    try { demarrer(toile); } catch (e) { console.error("[3d]", e); }
  };
  const io = new IntersectionObserver((e) => {
    if (e[0].isIntersecting) { io.disconnect(); lancer(); }
  }, { rootMargin: "400px" });
  io.observe(toile);
  if (!petit) window.addEventListener("load", () => setTimeout(lancer, 2500));
});
