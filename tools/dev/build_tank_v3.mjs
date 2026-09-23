// Usage: node tools/dev/build_tank_v3.mjs /path/to/tank_v1.glb
// Builds TANK V3: Heavy Sci-Fi Frontline Mech art/visual polish pass
// Compliant with docs/CHARACTER_CREATION_GUIDELINES.md and approved TANK V3 Concept Guide.

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
root.name = "TANK_V3";
const nodes = {};
root.traverse((object) => { if (object.name) nodes[object.name] = object; });

// 1. TANK V3 PBR Materials Palette (Approved Concept Guide)
const materials = {
  // Primary Armor: Deep rich metallic crimson/dark red with crisp specular response
  crimson: new THREE.MeshStandardMaterial({
    name: "Tank Crimson Armor",
    color: "#7e1622",
    metalness: 0.58,
    roughness: 0.36
  }),
  // Secondary Inset Armor: Dark burgundy shadow panels
  darkRed: new THREE.MeshStandardMaterial({
    name: "Tank Shadow Armor",
    color: "#4a0f16",
    metalness: 0.62,
    roughness: 0.40
  }),
  // Secondary Chassis: Charcoal graphite plating for under-structure & abdominal ribs
  graphite: new THREE.MeshStandardMaterial({
    name: "Tank Graphite Chassis",
    color: "#1c2026",
    metalness: 0.55,
    roughness: 0.44
  }),
  // Mechanical Details: Gunmetal titanium for hydraulic pistons, mechanical joints & frame chamfers
  steel: new THREE.MeshStandardMaterial({
    name: "Tank Gunmetal Steel",
    color: "#525c6a",
    metalness: 0.76,
    roughness: 0.30
  }),
  // Recessed Joints & Gaskets: Deep black matte for sole treads and joint gaskets
  black: new THREE.MeshStandardMaterial({
    name: "Tank Black Gaskets",
    color: "#0a0c10",
    metalness: 0.50,
    roughness: 0.52
  }),
  // Emissive Accent: High-intensity neon red energy (Visor, Reactor Core, Thrusters, Warning lights)
  glow: new THREE.MeshStandardMaterial({
    name: "Tank Core Glow",
    color: "#dc1424",
    emissive: "#ff1828",
    emissiveIntensity: 2.2,
    metalness: 0.15,
    roughness: 0.20
  }),
  // Hardened Blade Alloy: Polished silver-steel for Axe edges and heavy edge trims
  silver: new THREE.MeshStandardMaterial({
    name: "Tank Alloy Edge",
    color: "#b0bfcc",
    metalness: 0.90,
    roughness: 0.22
  }),
};

// 2. Beveled Extrusion Geometry Generator
const chamfer = (outline, depth = 1, bevel = 0.05, bevelSegments = 1) => {
  const shape = new THREE.Shape();
  shape.moveTo(...outline[0]);
  for (const point of outline.slice(1)) shape.lineTo(...point);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - 2 * bevel),
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments,
    steps: 1,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2 + bevel);
  geometry.computeVertexNormals();
  return geometry;
};

// Procedural Geometry Definitions
const box = chamfer([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], 1, 0.05);
const hex = chamfer([[-0.25, -0.5], [0.25, -0.5], [0.5, 0], [0.25, 0.5], [-0.25, 0.5], [-0.5, 0]], 1, 0.04);
const torso = chamfer([[-0.38, -0.5], [0.38, -0.5], [0.5, 0.12], [0.42, 0.5], [-0.42, 0.5], [-0.5, 0.12]], 1, 0.05);
const chest = chamfer([[-0.46, -0.46], [0.46, -0.46], [0.5, 0.24], [0.32, 0.5], [0, 0.28], [-0.32, 0.5], [-0.5, 0.24]], 1, 0.045);
const gorget = chamfer([[-0.45, -0.2], [0.45, -0.2], [0.35, 0.45], [-0.35, 0.45]], 1, 0.035);
const shoulder = chamfer([[-0.5, -0.28], [-0.32, -0.5], [0.35, -0.5], [0.5, -0.15], [0.35, 0.5], [-0.35, 0.5]], 1, 0.05);
const pauldronFlare = chamfer([[-0.5, -0.45], [0.48, -0.45], [0.32, 0.48], [-0.2, 0.48]], 1, 0.04);
const thigh = chamfer([[-0.34, -0.5], [0.38, -0.5], [0.5, 0.38], [0.38, 0.5], [-0.5, 0.5]], 1, 0.045);
const shin = chamfer([[-0.48, -0.5], [0.44, -0.5], [0.36, 0.5], [-0.3, 0.5]], 1, 0.045);
const kneeBulwark = chamfer([[-0.35, -0.5], [0.35, -0.5], [0.5, -0.15], [0.4, 0.5], [-0.4, 0.5], [-0.5, -0.15]], 1, 0.04);
const helmet = chamfer([[-0.4, -0.5], [0.4, -0.5], [0.5, -0.18], [0.38, 0.5], [-0.38, 0.5], [-0.5, -0.18]], 1, 0.04);
const browRidge = chamfer([[-0.5, -0.3], [0.5, -0.3], [0.4, 0.35], [-0.4, 0.35]], 1, 0.03);
const foot = chamfer([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.15], [0.26, 0.5], [-0.42, 0.5]], 1, 0.035);
const soleTread = chamfer([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.4], [0.35, 0.5], [-0.4, 0.5]], 1, 0.025);
const blade = chamfer([[-0.5, -0.5], [0.32, -0.46], [0.5, -0.12], [0.38, 0], [0.5, 0.12], [0.32, 0.46], [-0.5, 0.5]], 1, 0.025);
const slit = chamfer([[-0.5, -0.32], [0.45, -0.32], [0.5, 0.32], [-0.45, 0.32]], 1, 0.016);
const fin = chamfer([[-0.5, -0.5], [0.5, -0.5], [0.22, 0.5], [-0.22, 0.28]], 1, 0.03);

// Circular/Piston Geometries
const pinZ = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
pinZ.rotateZ(Math.PI / 2);
const pinX = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
pinX.rotateX(Math.PI / 2);
const pinY = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);

// Circular Power Core Torus (Back Detail)
const reactorTorus = new THREE.TorusGeometry(0.42, 0.085, 6, 16);
const reactorHubDisc = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 12);
reactorHubDisc.rotateX(Math.PI / 2);

// Re-map base skeleton meshes to updated geometry and clean PBR materials
const meshMap = {
  TorsoArmor: [torso, materials.graphite],
  TorsoInset: [chest, materials.crimson],
  ChestInsignia: [slit, materials.glow],
  Helmet: [helmet, materials.graphite],
  HelmetCrown: [shoulder, materials.crimson],
  Visor: [slit, materials.glow],
  AxeHead: [box, materials.graphite],
  AxeEdge: [blade, materials.silver],
};
for (const name of ["ShoulderPad_L", "ShoulderPad_R"]) meshMap[name] = [shoulder, materials.crimson];
for (const side of ["L", "R"]) {
  meshMap[`ThighArmor_${side}`] = [thigh, materials.crimson];
  meshMap[`ShinArmor_${side}`] = [shin, materials.graphite];
  meshMap[`Boot_${side}`] = [foot, materials.graphite];
  meshMap[`BootToe_${side}`] = [foot, materials.crimson];
  meshMap[`ElbowGuard_${side}`] = [pinZ, materials.steel];
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

// =========================================================================
// 3. TANK V3 DETAILED HARD-SURFACE SCULPTING (Concept Guide Compliant)
// =========================================================================

// --- A. HEAD & HELMET DETAIL ---
add("Head", "V3 Brow Armor", browRidge, materials.crimson, [0, 0.32, 0.16], [0.46, 0.11, 0.26], [0.12, 0, 0]);
add("Head", "V3 Visor Recess", slit, materials.black, [0, 0.18, 0.22], [0.40, 0.15, 0.05]);
add("Head", "V3 Visor Red Slit", slit, materials.glow, [0, 0.185, 0.25], [0.32, 0.065, 0.03]);
add("Head", "V3 Jaw Guard", helmet, materials.crimson, [0, 0.01, 0.18], [0.34, 0.14, 0.24]);
add("Head", "V3 Chin Keel", hex, materials.steel, [0, -0.04, 0.24], [0.12, 0.08, 0.08]);

for (const side of [-1, 1]) {
  const label = side < 0 ? "L" : "R";
  add("Head", `V3 Helmet Ear ${label}`, hex, materials.graphite, [side * 0.25, 0.16, -0.01], [0.14, 0.26, 0.32]);
  add("Head", `V3 Helmet Ear Rim ${label}`, pinX, materials.steel, [side * 0.27, 0.16, -0.01], [0.10, 0.06, 0.10]);
  add("Head", `V3 Cheek Vent ${label}`, slit, materials.steel, [side * 0.19, 0.06, 0.18], [0.03, 0.08, 0.12], [0, side * 0.35, 0]);
}

// Neck Cowl Protector
add("Neck", "V3 Neck Cowl", gorget, materials.graphite, [0, -0.02, -0.02], [0.42, 0.18, 0.38]);

// --- B. CHEST & TORSO DETAIL ---
add("Spine", "V3 Gorget Clavicle", gorget, materials.crimson, [0, 0.58, 0.18], [0.68, 0.16, 0.28], [0.25, 0, 0]);
add("Spine", "V3 Heavy Breastplate Front", chest, materials.crimson, [0, 0.38, 0.29], [0.82, 0.52, 0.14]);
add("Spine", "V3 Sternum Core Housing", hex, materials.steel, [0, 0.30, 0.36], [0.28, 0.22, 0.06]);
add("Spine", "V3 Sternum Reactor Glow", slit, materials.glow, [0, 0.30, 0.395], [0.18, 0.065, 0.03]);

for (const side of [-1, 1]) {
  const label = side < 0 ? "L" : "R";
  // Chest angular facet borders
  add("Spine", `V3 Chest Edge ${label}`, box, materials.steel, [side * 0.38, 0.35, 0.31], [0.05, 0.38, 0.08], [0, 0, side * -0.22]);
  add("Spine", `V3 Chest Indicator ${label}`, slit, materials.glow, [side * 0.26, 0.44, 0.36], [0.12, 0.028, 0.025]);
  // Lateral Flank Ribs
  add("Spine", `V3 Flank Armor ${label}`, pauldronFlare, materials.crimson, [side * 0.34, 0.12, 0.16], [0.24, 0.26, 0.18], [0, side * 0.3, side * -0.15]);
  // Segmented Abdominal Ribs (Tapering to narrow waist)
  add("Spine", `V3 Abdominal Rib High ${label}`, box, materials.graphite, [side * 0.16, 0.06, 0.22], [0.26, 0.065, 0.12]);
  add("Spine", `V3 Abdominal Rib Mid ${label}`, box, materials.darkRed, [side * 0.15, -0.01, 0.20], [0.24, 0.065, 0.11]);
  add("Spine", `V3 Abdominal Rib Low ${label}`, box, materials.graphite, [side * 0.13, -0.08, 0.18], [0.21, 0.065, 0.10]);
  // Lateral Hydraulic Actuators
  add("Spine", `V3 Torso Actuator ${label}`, pinY, materials.steel, [side * 0.26, -0.02, 0.06], [0.06, 0.24, 0.06]);
}

// --- C. BACK DETAIL (POWER CORE & EXHAUST NACELLES) ---
// Central Circular Power Core (Directly matching concept art)
add("Spine", "V3 Reactor Housing", hex, materials.graphite, [0, 0.40, -0.46], [0.68, 0.52, 0.16]);
add("Spine", "V3 Reactor Gunmetal Ring", pinX, materials.steel, [0, 0.40, -0.54], [0.48, 0.06, 0.48]);
add("Spine", "V3 Reactor Core Torus Glow", reactorTorus, materials.glow, [0, 0.40, -0.56], [0.95, 0.95, 0.95]);
add("Spine", "V3 Reactor Core Center Hub", reactorHubDisc, materials.graphite, [0, 0.40, -0.55], [0.70, 0.70, 0.70]);

// Spinal Column
add("Spine", "V3 Spinal Vertebra High", box, materials.steel, [0, 0.18, -0.32], [0.18, 0.12, 0.14]);
add("Spine", "V3 Spinal Vertebra Mid", box, materials.crimson, [0, 0.04, -0.30], [0.16, 0.12, 0.13]);
add("Spine", "V3 Spinal Vertebra Low", box, materials.steel, [0, -0.10, -0.27], [0.14, 0.12, 0.12]);

for (const side of [-1, 1]) {
  const label = side < 0 ? "L" : "R";
  // Back Thruster Exhaust Nacelles
  add("Spine", `V3 Thruster Nacelle ${label}`, shoulder, materials.crimson, [side * 0.25, 0.42, -0.42], [0.26, 0.38, 0.22]);
  add("Spine", `V3 Thruster Exhaust Port ${label}`, pinX, materials.steel, [side * 0.25, 0.48, -0.53], [0.12, 0.08, 0.12]);
  add("Spine", `V3 Thruster Vent Light ${label}`, slit, materials.glow, [side * 0.25, 0.34, -0.535], [0.12, 0.04, 0.02]);
}

// --- D. MASSIVE SHOULDERS (PAULDRONS) & SILHOUETTE EXPANSION ---
for (const side of [-1, 1]) {
  const label = side < 0 ? "L" : "R";
  // Heavy Gunmetal Shoulder Joint Hinge
  add(`Shoulder_${label}`, `V3 Shoulder Joint ${label}`, pinX, materials.steel, [side * -0.08, 0.02, 0], [0.26, 0.24, 0.26]);

  // Primary Heavy Dark Red Pauldron Top
  add(`Shoulder_${label}`, `V3 Pauldron Top ${label}`, shoulder, materials.crimson, [side * 0.04, 0.14, 0], [0.44, 0.20, 0.52]);

  // Outer Shoulder Armor Wing (Expands silhouette significantly for isometric camera)
  add(`Shoulder_${label}`, `V3 Pauldron Wing ${label}`, pauldronFlare, materials.crimson, [side * 0.22, 0.08, 0], [0.28, 0.28, 0.46], [0, 0, side * -0.35]);

  // Recessed Graphite Secondary Armor Plate
  add(`Shoulder_${label}`, `V3 Pauldron Underplate ${label}`, box, materials.graphite, [side * 0.06, 0.04, 0.02], [0.42, 0.14, 0.48]);

  // Gunmetal Armor Bevel Stripe
  add(`Shoulder_${label}`, `V3 Pauldron Stripe ${label}`, box, materials.steel, [side * 0.06, 0.24, 0.08], [0.32, 0.03, 0.38]);

  // Forward Warning Indicator Lamp
  add(`Shoulder_${label}`, `V3 Pauldron Lamp ${label}`, slit, materials.glow, [side * 0.12, 0.16, 0.27], [0.22, 0.055, 0.03], [0, side * 0.2, 0]);

  // Rear Thruster Cowl / Fin
  add(`Shoulder_${label}`, `V3 Shoulder Rear Fin ${label}`, fin, materials.crimson, [side * 0.10, 0.18, -0.28], [0.24, 0.34, 0.14], [0, 0, side * -0.18]);
}

// --- E. ARMS, GAUNTLETS & MECHANICAL HANDS ---
for (const side of [-1, 1]) {
  const label = side < 0 ? "L" : "R";
  // Bicep Mechanical Sleeve & Hydraulic
  add(`UpperArm_${label}`, `V3 Upper Arm Joint ${label}`, pinZ, materials.steel, [0, 0.02, 0], [0.28, 0.24, 0.28]);
  add(`UpperArm_${label}`, `V3 Bicep Armor ${label}`, shoulder, materials.crimson, [side * 0.06, -0.20, 0.04], [0.24, 0.38, 0.26]);
  add(`UpperArm_${label}`, `V3 Bicep Ram ${label}`, pinY, materials.steel, [side * 0.09, -0.22, -0.04], [0.08, 0.36, 0.08]);

  // Reinforced Elbow Bulwark
  add(`Elbow_${label}`, `V3 Elbow Bulwark ${label}`, hex, materials.crimson, [0, 0.01, -0.10], [0.24, 0.22, 0.16]);

  // Forearm Gauntlet & Shields
  add(`Forearm_${label}`, `V3 Gauntlet Outer Shield ${label}`, shin, materials.crimson, [0, -0.20, 0.18], [0.32, 0.42, 0.11]);
  add(`Forearm_${label}`, `V3 Gauntlet Rail ${label}`, box, materials.steel, [side * 0.14, -0.20, 0.04], [0.10, 0.40, 0.30]);
  add(`Forearm_${label}`, `V3 Gauntlet Conduit Light ${label}`, slit, materials.glow, [0, -0.24, 0.24], [0.18, 0.04, 0.025]);

  // Mechanical Power Fist & Knuckle Plating
  add(`Hand_${label}`, `V3 Gauntlet Cuff ${label}`, hex, materials.graphite, [0, -0.01, 0], [0.28, 0.10, 0.28]);
  add(`Hand_${label}`, `V3 Hand Armor Plate ${label}`, box, materials.crimson, [0, -0.06, 0.11], [0.24, 0.14, 0.07]);
  add(`Hand_${label}`, `V3 Knuckle Guard ${label}`, box, materials.steel, [0, -0.13, 0.08], [0.25, 0.05, 0.08]);
}

// --- F. TANK'S HEAVY MECH AXE ---
nodes.Tank_Axe.position.y += 0.12;
nodes.Tank_Axe.rotation.z = 1.0;

add("Tank_Axe", "V3 Axe Shaft Upper", pinY, materials.steel, [0, -0.38, 0], [0.09, 0.78, 0.09]);
add("Tank_Axe", "V3 Axe Grip Band", pinY, materials.black, [0, -0.25, 0], [0.11, 0.20, 0.11]);
add("Tank_Axe", "V3 Axe Head Housing", hex, materials.crimson, [0, -0.78, 0.06], [0.36, 0.26, 0.18]);
add("Tank_Axe", "V3 Axe Core Slit", slit, materials.glow, [0, -0.78, 0.155], [0.16, 0.05, 0.03]);
add("Tank_Axe", "V3 Axe Main Blade", blade, materials.silver, [0.36, -0.78, 0], [0.38, 0.52, 0.10]);
add("Tank_Axe", "V3 Axe Reverse Blade", blade, materials.silver, [-0.34, -0.78, 0], [-0.34, 0.46, 0.10]);
add("Tank_Axe", "V3 Axe Pommel", hex, materials.steel, [0, 0.03, 0], [0.18, 0.18, 0.18]);

// --- G. HIPS, WAIST & FLARING SKIRT TASSETS ---
add("Hips", "V3 Belt Core Buckle", hex, materials.graphite, [0, 0.04, 0.27], [0.32, 0.18, 0.13]);
add("Hips", "V3 Belt Clasp", box, materials.steel, [0, 0.04, 0.33], [0.14, 0.09, 0.04]);
add("Hips", "V3 Belt Indicator", slit, materials.glow, [0, 0.04, 0.35], [0.08, 0.03, 0.02]);
add("Hips", "V3 Groin Protector", shin, materials.darkRed, [0, -0.14, 0.22], [0.22, 0.28, 0.12]);

for (const side of [-1, 1]) {
  const label = side < 0 ? "L" : "R";
  // Flared Hip Tasset Armor (Protects hip joint and widens stance)
  add("Hips", `V3 Hip Tasset ${label}`, pauldronFlare, materials.crimson, [side * 0.41, -0.16, 0.04], [0.22, 0.38, 0.36], [0, 0, side * -0.18]);
  add("Hips", `V3 Hip Tasset Trim ${label}`, box, materials.steel, [side * 0.44, -0.18, 0.04], [0.04, 0.36, 0.32], [0, 0, side * -0.18]);
  // Pelvis Actuator
  add(`Thigh_${label}`, `V3 Hip Actuator ${label}`, pinZ, materials.steel, [0, 0.02, 0], [0.34, 0.28, 0.34]);
}

// --- H. REINFORCED LEGS, KNEES & CALVES ---
for (const side of [-1, 1]) {
  const label = side < 0 ? "L" : "R";
  // Thigh Heavy Plates
  add(`Thigh_${label}`, `V3 Thigh Front Armor ${label}`, thigh, materials.crimson, [0, -0.22, 0.20], [0.28, 0.46, 0.12]);
  add(`Thigh_${label}`, `V3 Thigh Flank Plate ${label}`, box, materials.graphite, [side * 0.13, -0.24, 0.02], [0.08, 0.40, 0.28]);

  // Massive Knee Bulwark with Circular Center Hub and Warning Light
  add(`Knee_${label}`, `V3 Knee Bulwark ${label}`, kneeBulwark, materials.crimson, [0, 0, 0.20], [0.34, 0.25, 0.15]);
  add(`Knee_${label}`, `V3 Knee Center Hub ${label}`, pinX, materials.steel, [0, 0, 0.27], [0.18, 0.06, 0.18]);
  add(`Knee_${label}`, `V3 Knee Warning Light ${label}`, slit, materials.glow, [side * 0.16, 0, 0.20], [0.03, 0.08, 0.06], [0, side * 0.3, 0]);

  // Shin Greaves with Sharp Center Ridge
  add(`Shin_${label}`, `V3 Greave Face ${label}`, shin, materials.crimson, [0, -0.24, 0.18], [0.34, 0.48, 0.13]);
  add(`Shin_${label}`, `V3 Greave Rail ${label}`, box, materials.steel, [side * 0.15, -0.26, 0.21], [0.045, 0.38, 0.07]);
  add(`Shin_${label}`, `V3 Greave Light ${label}`, slit, materials.glow, [0, -0.28, 0.25], [0.17, 0.032, 0.025]);

  // Rear Calf Thrusters
  add(`Shin_${label}`, `V3 Calf Thruster ${label}`, box, materials.graphite, [0, -0.22, -0.19], [0.24, 0.34, 0.14]);
  add(`Shin_${label}`, `V3 Calf Exhaust Port ${label}`, pinX, materials.steel, [0, -0.32, -0.26], [0.12, 0.06, 0.12]);
}

// --- I. MASSIVE GROUNDED BOOTS ---
nodes.Boot_L.position.y += 0.0077;
nodes.Boot_R.position.y += 0.0077;

for (const side of [-1, 1]) {
  const label = side < 0 ? "L" : "R";
  // Heavy Ankle Pivot Discs
  add(`Ankle_${label}`, `V3 Ankle Joint Outer ${label}`, pinX, materials.steel, [side * 0.20, -0.06, 0.08], [0.16, 0.06, 0.16]);

  // Segmented Solid Grip Sole (Resting precisely on the ground)
  add(`Ankle_${label}`, `V3 Sole Plate ${label}`, soleTread, materials.black, [0, -0.2011, 0.09], [0.42, 0.036, 0.58]);

  // Heavy Toe Guard & Forward Bevel
  add(`Ankle_${label}`, `V3 Toe Guard ${label}`, foot, materials.crimson, [0, -0.125, 0.29], [0.38, 0.11, 0.22]);
  add(`Ankle_${label}`, `V3 Toe Bumper Steel ${label}`, box, materials.steel, [0, -0.16, 0.38], [0.34, 0.05, 0.08]);
  add(`Ankle_${label}`, `V3 Toe Hazard Light ${label}`, slit, materials.glow, [0, -0.12, 0.40], [0.22, 0.03, 0.025]);

  // Rear Heel Stabilizer Block
  add(`Ankle_${label}`, `V3 Heel Stabilizer ${label}`, box, materials.graphite, [0, -0.14, -0.16], [0.36, 0.10, 0.14]);
}

// =========================================================================
// 4. PRESERVE & REFINE GROUNDING / PELVIS KEYFRAMES (Run & Death)
// =========================================================================

// Sample boot soles and key the pelvis so the planted foot stays at Y=0
const run = gltf.animations.find((clip) => clip.name === "Run");
const mixer = new THREE.AnimationMixer(root);
mixer.clipAction(run).play();
const soles = [
  nodes.Boot_L,
  nodes.Boot_R,
  root.getObjectByName("V3 Sole Plate L"),
  root.getObjectByName("V3 Sole Plate R"),
];
const floorTimes = Array.from({ length: 17 }, (_, i) => +(i * run.duration / 16).toFixed(5));
const hipPositions = [];
for (const time of floorTimes) {
  mixer.setTime(time);
  root.updateMatrixWorld(true);
  let soleY = Infinity;
  for (const part of soles) {
    if (!part) continue;
    const bounds = new THREE.Box3().setFromObject(part);
    soleY = Math.min(soleY, bounds.min.y);
  }
  hipPositions.push(0, 1.32 - soleY, 0);
}
// Replace or push Hips.position track
const runHipsIdx = run.tracks.findIndex((track) => track.name === "Hips.position");
if (runHipsIdx >= 0) {
  run.tracks[runHipsIdx] = new THREE.VectorKeyframeTrack("Hips.position", floorTimes, hipPositions);
} else {
  run.tracks.push(new THREE.VectorKeyframeTrack("Hips.position", floorTimes, hipPositions));
}
mixer.stopAllAction();
nodes.Hips.position.set(0, 1.32, 0);
root.updateMatrixWorld(true);

// Death animation settling at floor level
const death = gltf.animations.find((clip) => clip.name === "Death");
const deathKeys = [0, 0.25, 0.55, 0.9, death.duration];
const axeRotations = [1, 1.15, 1.65, 2.25, 2.8].flatMap((angle) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angle)).toArray()
);
const deathAxeIdx = death.tracks.findIndex((track) => track.name === "Tank_Axe.quaternion");
if (deathAxeIdx >= 0) {
  death.tracks[deathAxeIdx] = new THREE.QuaternionKeyframeTrack("Tank_Axe.quaternion", deathKeys, axeRotations);
} else {
  death.tracks.push(new THREE.QuaternionKeyframeTrack("Tank_Axe.quaternion", deathKeys, axeRotations));
}

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

// =========================================================================
// 5. EXPORT & VALIDATE GLB ASSET
// =========================================================================
const output = await new Promise((resolve, reject) =>
  new GLTFExporter().parse(root, resolve, reject, {
    binary: true,
    animations: gltf.animations,
    onlyVisible: true,
  })
);

const exported = await new Promise((resolve, reject) =>
  new GLTFLoader().parse(output, "", resolve, reject)
);

// Verify animations
assert.deepEqual(
  exported.animations.map((clip) => clip.name),
  ["Idle", "Run", "Attack", "Hit", "Death"]
);

// Verify Grounding: Soles MUST rest at Y = 0.000m
const bindBounds = new THREE.Box3().setFromObject(exported.scene);
console.log(`[Grounding Check] bindBounds.min.y = ${bindBounds.min.y.toFixed(6)}m`);
assert.ok(Math.abs(bindBounds.min.y) < 0.005, `TANK boots must start on Y=0 (got ${bindBounds.min.y})`);

for (const name of ["Run", "Death"]) {
  const clip = exported.animations.find((item) => item.name === name);
  const checkMixer = new THREE.AnimationMixer(exported.scene);
  checkMixer.clipAction(clip).play();
  for (let i = 0; i <= 20; i++) {
    checkMixer.setTime((clip.duration * i) / 20);
    exported.scene.updateMatrixWorld(true);
    const frameMinY = new THREE.Box3().setFromObject(exported.scene).min.y;
    assert.ok(frameMinY > -0.03, `${name} sinks below floor (frame ${i}: ${frameMinY})`);
  }
  checkMixer.stopAllAction();
}

let triangles = 0;
let meshes = 0;
exported.scene.traverse((object) => {
  if (object.isMesh) {
    meshes++;
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
  }
});

console.log(`[Budget Check] Mesh count: ${meshes}`);
console.log(`[Budget Check] Triangle count: ${triangles}`);
console.log(`[Budget Check] Byte size: ${output.byteLength} bytes (${(output.byteLength / 1024).toFixed(1)} KB)`);

assert.ok(triangles < 20000, `Triangle count exceeds budget: ${triangles}`);
assert.ok(output.byteLength < 250000, `File size exceeds budget: ${output.byteLength}`);

// Write production GLB
await fs.mkdir("public/assets/characters", { recursive: true });
await fs.writeFile("public/assets/characters/tank-v3.glb", Buffer.from(output));

console.log(`Successfully built TANK V3:`);
console.log(`- File size: ${output.byteLength} bytes (${(output.byteLength / 1024).toFixed(1)} KB)`);
console.log(`- Triangles: ${triangles}`);
console.log(`- Meshes: ${meshes}`);
console.log(`- Animations: ${exported.animations.map((c) => c.name).join(", ")}`);
console.log(`- Grounding: bindBounds.min.y = ${bindBounds.min.y.toFixed(5)}m (Soles flat at Y=0)`);
