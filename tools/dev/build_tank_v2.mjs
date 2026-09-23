// Usage: node tools/dev/build_tank_v2.mjs /path/to/tank_v1.glb
// Rebuilds TANK's web model from the supplied articulated source asset.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

const source = process.argv[2];
if (!source) throw new Error("Pass the supplied tank_v1.glb path");

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};

const bytes = await fs.readFile(source);
const gltf = await new Promise((resolve, reject) =>
  new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "", resolve, reject)
);
const root = gltf.scene;
root.name = "TANK_V2";
const nodes = {};
root.traverse((object) => { if (object.name) nodes[object.name] = object; });

const materials = {
  crimson: new THREE.MeshStandardMaterial({ name: "Oxide Crimson Armor", color: "#8a1926", metalness: 0.55, roughness: 0.38 }),
  darkRed: new THREE.MeshStandardMaterial({ name: "Shadow Red Armor", color: "#4d111b", metalness: 0.58, roughness: 0.42 }),
  graphite: new THREE.MeshStandardMaterial({ name: "Graphite Chassis", color: "#202933", metalness: 0.6, roughness: 0.4 }),
  steel: new THREE.MeshStandardMaterial({ name: "Gunmetal Edges", color: "#61717d", metalness: 0.72, roughness: 0.32 }),
  black: new THREE.MeshStandardMaterial({ name: "Recessed Joints", color: "#080b10", metalness: 0.48, roughness: 0.48 }),
  glow: new THREE.MeshStandardMaterial({ name: "Red Reactor Light", color: "#c8232d", emissive: "#ed1427", emissiveIntensity: 1.5, metalness: 0.2, roughness: 0.25 }),
  silver: new THREE.MeshStandardMaterial({ name: "Axe Edge Alloy", color: "#a7b5bd", metalness: 0.9, roughness: 0.22 }),
};

const chamfer = (outline, depth = 1, bevel = 0.06) => {
  const shape = new THREE.Shape();
  shape.moveTo(...outline[0]);
  for (const point of outline.slice(1)) shape.lineTo(...point);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bevel, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1, curveSegments: 1 });
  geometry.translate(0, 0, -depth / 2 + bevel);
  geometry.computeVertexNormals();
  return geometry;
};
const box = chamfer([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]);
const torso = chamfer([[-0.37, -0.5], [0.37, -0.5], [0.5, 0.1], [0.41, 0.5], [-0.41, 0.5], [-0.5, 0.1]]);
const chest = chamfer([[-0.45, -0.46], [0.45, -0.46], [0.5, 0.22], [0.31, 0.5], [0, 0.27], [-0.31, 0.5], [-0.5, 0.22]], 1, 0.045);
const shoulder = chamfer([[-0.5, -0.26], [-0.33, -0.5], [0.36, -0.5], [0.5, -0.14], [0.32, 0.5], [-0.35, 0.5]]);
const thigh = chamfer([[-0.34, -0.5], [0.38, -0.5], [0.5, 0.37], [0.37, 0.5], [-0.5, 0.5]]);
const shin = chamfer([[-0.47, -0.5], [0.43, -0.5], [0.34, 0.5], [-0.28, 0.5]]);
const helmet = chamfer([[-0.4, -0.5], [0.4, -0.5], [0.5, -0.2], [0.37, 0.5], [-0.37, 0.5], [-0.5, -0.2]]);
const foot = chamfer([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.13], [0.25, 0.5], [-0.4, 0.5]], 1, 0.035);
const blade = chamfer([[-0.5, -0.5], [0.3, -0.47], [0.5, -0.12], [0.36, 0], [0.5, 0.12], [0.3, 0.47], [-0.5, 0.5]], 1, 0.025);
const slit = chamfer([[-0.5, -0.35], [0.43, -0.35], [0.5, 0.35], [-0.43, 0.35]], 1, 0.018);
const chevron = chamfer([[-0.5, 0.4], [0, -0.5], [0.5, 0.4], [0.25, 0.5], [0, 0.02], [-0.25, 0.5]], 1, 0.022);
const fin = chamfer([[-0.5, -0.5], [0.5, -0.5], [0.22, 0.5], [-0.2, 0.26]], 1, 0.03);
const pin = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
pin.rotateZ(Math.PI / 2);

const meshMap = {
  TorsoArmor: [torso, materials.graphite], TorsoInset: [chest, materials.crimson],
  ChestInsignia: [slit, materials.glow], Helmet: [helmet, materials.graphite],
  HelmetCrown: [shoulder, materials.crimson], Visor: [slit, materials.glow],
  AxeHead: [box, materials.graphite], AxeEdge: [blade, materials.silver],
};
for (const name of ["ShoulderPad_L", "ShoulderPad_R"]) meshMap[name] = [shoulder, materials.crimson];
for (const side of ["L", "R"]) {
  meshMap[`ThighArmor_${side}`] = [thigh, materials.crimson];
  meshMap[`ShinArmor_${side}`] = [shin, materials.graphite];
  meshMap[`Boot_${side}`] = [foot, materials.graphite];
  meshMap[`BootToe_${side}`] = [foot, materials.crimson];
  meshMap[`ElbowGuard_${side}`] = [pin, materials.black];
}
root.traverse((object) => {
  if (!object.isMesh) return;
  const [geometry, material] = meshMap[object.name] ?? [box, object.material.name === "Cube_Red" ? materials.crimson : materials.graphite];
  object.geometry = geometry;
  object.material = material;
});

const add = (parentName, name, geometry, material, position, scale, rotation) => {
  const part = new THREE.Mesh(geometry, material);
  part.name = name;
  part.position.set(...position);
  part.scale.set(...scale);
  if (rotation) part.rotation.set(...rotation);
  nodes[parentName].add(part);
  return part;
};

// Broad armor planes with inset seams read from the isometric gameplay camera.
add("Spine", "Split Crimson Breastplate", chest, materials.crimson, [0, 0.36, 0.28], [0.79, 0.51, 0.12]);
add("Spine", "Chest Chevron", chevron, materials.steel, [0, 0.35, 0.355], [0.24, 0.2, 0.036]);
add("Spine", "Reactor Slot", slit, materials.glow, [0, 0.27, 0.38], [0.16, 0.045, 0.024]);
add("Hips", "Belt Core", shoulder, materials.graphite, [0, 0.04, 0.26], [0.3, 0.16, 0.12]);
for (const side of [-1, 1]) {
  const label = side < 0 ? "L" : "R";
  add("Spine", `Chest Edge ${label}`, box, materials.steel, [side * 0.36, 0.33, 0.3], [0.045, 0.36, 0.07], [0, 0, side * -0.22]);
  add("Spine", `Chest Lamp ${label}`, slit, materials.glow, [side * 0.25, 0.4, 0.356], [0.12, 0.025, 0.025]);
  add("Spine", `Abdominal Rib ${label}`, box, materials.darkRed, [side * 0.17, -0.01, 0.18], [0.25, 0.085, 0.11]);
  add(`Shoulder_${label}`, `Pauldron Top ${label}`, shoulder, materials.darkRed, [side * 0.02, 0.12, 0], [0.38, 0.16, 0.48]);
  add(`Shoulder_${label}`, `Pauldron Stripe ${label}`, box, materials.steel, [side * 0.02, 0.22, 0.1], [0.26, 0.025, 0.37]);
  add(`Shoulder_${label}`, `Pauldron Lamp ${label}`, slit, materials.glow, [side * 0.07, 0.13, 0.25], [0.18, 0.055, 0.02]);
  add(`Shoulder_${label}`, `Rear Shoulder Fin ${label}`, fin, materials.crimson, [side * 0.1, 0.17, -0.26], [0.22, 0.31, 0.12], [0, 0, side * -0.18]);
  add(`UpperArm_${label}`, `Upper Arm Joint ${label}`, pin, materials.steel, [0, 0.02, 0], [0.25, 0.24, 0.25]);
  add(`UpperArm_${label}`, `Bicep Ram ${label}`, box, materials.steel, [side * 0.1, -0.22, 0.02], [0.075, 0.36, 0.09]);
  add(`Forearm_${label}`, `Forearm Shield ${label}`, shin, materials.crimson, [0, -0.19, 0.17], [0.27, 0.39, 0.09]);
  add(`Forearm_${label}`, `Forearm Guard ${label}`, fin, materials.steel, [side * 0.13, -0.19, 0.03], [0.09, 0.38, 0.28]);
  add(`Forearm_${label}`, `Gauntlet Vent ${label}`, slit, materials.glow, [0, -0.24, 0.226], [0.17, 0.035, 0.025]);
  add(`Thigh_${label}`, `Hip Actuator ${label}`, pin, materials.steel, [0, 0.02, 0], [0.31, 0.28, 0.28]);
  add(`Thigh_${label}`, `Thigh Front ${label}`, thigh, materials.darkRed, [0, -0.23, 0.19], [0.25, 0.43, 0.1]);
  add("Hips", `Hip Tasset ${label}`, fin, materials.crimson, [side * 0.39, -0.18, 0.06], [0.18, 0.34, 0.33], [0, 0, side * -0.14]);
  add(`Knee_${label}`, `Knee Bulwark ${label}`, shoulder, materials.crimson, [0, 0, 0.19], [0.31, 0.22, 0.13]);
  add(`Shin_${label}`, `Greave Face ${label}`, shin, materials.crimson, [0, -0.25, 0.17], [0.31, 0.46, 0.12]);
  add(`Shin_${label}`, `Greave Rail ${label}`, box, materials.steel, [side * 0.14, -0.27, 0.2], [0.042, 0.36, 0.06]);
  add(`Shin_${label}`, `Greave Lamp ${label}`, slit, materials.glow, [0, -0.29, 0.24], [0.16, 0.028, 0.023]);
  add(`Ankle_${label}`, `Sole ${label}`, foot, materials.black, [0, -0.2018, 0.09], [0.4, 0.034, 0.56]);
  add(`Ankle_${label}`, `Toe Guard ${label}`, foot, materials.steel, [0, -0.125, 0.29], [0.36, 0.085, 0.18]);
  add(`Ankle_${label}`, `Toe Lamp ${label}`, slit, materials.glow, [0, -0.13, 0.39], [0.21, 0.027, 0.025]);
  add("Spine", `Back Vent ${label}`, slit, materials.glow, [side * 0.18, 0.31, -0.43], [0.12, 0.2, 0.027]);
}
add("Head", "Brow Ridge", shoulder, materials.crimson, [0, 0.34, 0.13], [0.43, 0.09, 0.25]);
add("Head", "Visor Recess", slit, materials.black, [0, 0.18, 0.225], [0.38, 0.16, 0.04]);
add("Head", "Visor Red Slit", slit, materials.glow, [0, 0.19, 0.25], [0.28, 0.065, 0.028]);
add("Head", "Jaw Guard", helmet, materials.darkRed, [0, 0.005, 0.17], [0.31, 0.12, 0.22]);
for (const side of [-1, 1]) {
  add("Head", `Helmet Ear ${side}`, shoulder, materials.crimson, [side * 0.245, 0.15, -0.015], [0.12, 0.25, 0.32]);
  add("Head", `Helmet Vent ${side}`, slit, materials.steel, [side * 0.313, 0.11, 0.065], [0.015, 0.1, 0.13]);
}
add("Spine", "Reactor Housing", shoulder, materials.graphite, [0, 0.38, -0.51], [0.54, 0.38, 0.16]);
add("Spine", "Spinal Reactor", slit, materials.glow, [0, 0.4, -0.603], [0.18, 0.22, 0.02]);
add("Tank_Axe", "Axe Reverse Blade", blade, materials.silver, [-0.31, -0.78, 0], [-0.32, 0.44, 0.1]);
add("Tank_Axe", "Axe Core", shoulder, materials.darkRed, [0, -0.78, 0.09], [0.24, 0.22, 0.11]);
add("Tank_Axe", "Axe Reactor", slit, materials.glow, [0, -0.78, 0.15], [0.14, 0.045, 0.025]);
add("Tank_Axe", "Axe Pommel", shoulder, materials.steel, [0, 0.02, 0], [0.17, 0.18, 0.17]);
nodes.Tank_Axe.position.y += 0.12;
nodes.Tank_Axe.rotation.z = 1.0;
nodes.Boot_L.position.y += 0.0077;
nodes.Boot_R.position.y += 0.0077;

// The source run cycle swings both legs but holds its pelvis at one height.
// Sample the boot soles and key the pelvis so the planted foot stays at Y=0.
const run = gltf.animations.find((clip) => clip.name === "Run");
const mixer = new THREE.AnimationMixer(root);
mixer.clipAction(run).play();
const soles = [nodes.Boot_L, nodes.Boot_R, root.getObjectByName("Sole L"), root.getObjectByName("Sole R")];
const floorTimes = Array.from({ length: 17 }, (_, i) => +(i * run.duration / 16).toFixed(5));
const hipPositions = [];
for (const time of floorTimes) {
  mixer.setTime(time);
  root.updateMatrixWorld(true);
  let soleY = Infinity;
  for (const part of soles) {
    const bounds = new THREE.Box3().setFromObject(part);
    soleY = Math.min(soleY, bounds.min.y);
  }
  hipPositions.push(0, 1.32 - soleY, 0);
}
run.tracks.push(new THREE.VectorKeyframeTrack("Hips.position", floorTimes, hipPositions));
mixer.stopAllAction();
nodes.Hips.position.set(0, 1.32, 0);
root.updateMatrixWorld(true);

const death = gltf.animations.find((clip) => clip.name === "Death");
const deathKeys = [0, 0.25, 0.55, 0.9, death.duration];
const axeRotations = [1, 1.15, 1.65, 2.25, 2.8].flatMap((angle) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angle)).toArray()
);
death.tracks.push(new THREE.QuaternionKeyframeTrack("Tank_Axe.quaternion", deathKeys, axeRotations));
const deathMixer = new THREE.AnimationMixer(root);
deathMixer.clipAction(death).play();
const deathTimes = Array.from({ length: 28 }, (_, i) => +(i * death.duration / 27).toFixed(5));
const deathPositions = [];
for (const time of deathTimes) {
  deathMixer.setTime(time);
  root.updateMatrixWorld(true);
  const minimumY = new THREE.Box3().setFromObject(root).min.y;
  deathPositions.push(nodes.Hips.position.x, nodes.Hips.position.y - minimumY, nodes.Hips.position.z);
}
death.tracks[death.tracks.findIndex((track) => track.name === "Hips.position")] =
  new THREE.VectorKeyframeTrack("Hips.position", deathTimes, deathPositions);
deathMixer.stopAllAction();
nodes.Hips.position.set(0, 1.32, 0);
nodes.Tank_Axe.rotation.z = 1;

const output = await new Promise((resolve, reject) =>
  new GLTFExporter().parse(root, resolve, reject, { binary: true, animations: gltf.animations, onlyVisible: true })
);
const exported = await new Promise((resolve, reject) => new GLTFLoader().parse(output, "", resolve, reject));
assert.deepEqual(exported.animations.map((clip) => clip.name), ["Idle", "Run", "Attack", "Hit", "Death"]);
const bindBounds = new THREE.Box3().setFromObject(exported.scene);
assert.ok(Math.abs(bindBounds.min.y) < 0.005, "TANK boots must start on Y=0");
for (const name of ["Run", "Death"]) {
  const clip = exported.animations.find((item) => item.name === name);
  const checkMixer = new THREE.AnimationMixer(exported.scene);
  checkMixer.clipAction(clip).play();
  for (let i = 0; i <= 20; i++) {
    checkMixer.setTime((clip.duration * i) / 20);
    exported.scene.updateMatrixWorld(true);
    assert.ok(new THREE.Box3().setFromObject(exported.scene).min.y > -0.03, `${name} sinks below the floor`);
  }
  checkMixer.stopAllAction();
}
let triangles = 0;
exported.scene.traverse((object) => {
  if (object.isMesh) triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
});
assert.ok(triangles < 20000 && output.byteLength < 250000, "TANK exceeds the web asset budget");
await fs.mkdir("public/assets/characters", { recursive: true });
await fs.writeFile("public/assets/characters/tank-v2.glb", Buffer.from(output));
console.log(`tank-v2.glb: ${output.byteLength} bytes, ${triangles} triangles, ${exported.animations.map((clip) => clip.name).join(", ")}`);
