import fs from "node:fs";
import path from "node:path";

const morphTargets = [
  "head_width",
  "head_height",
  "head_depth",
  "forehead_width",
  "forehead_height",
  "cheek_width",
  "cheek_fullness",
  "jaw_width",
  "jaw_angle",
  "jaw_depth",
  "chin_width",
  "chin_height",
  "chin_projection",
  "chin_roundness",
  "eye_spacing",
  "eye_size",
  "eye_depth",
  "brow_height",
  "nose_width",
  "nose_length",
  "nose_projection",
  "nose_bridge_height",
  "mouth_width",
  "upper_lip_fullness",
  "lower_lip_fullness",
  "ear_size",
  "ear_projection",
  "neck_width"
];

const outDir = path.resolve(process.cwd(), "public/models/gameface/avatar");
const outFile = path.join(outDir, "gameface_neutral_head_v1.glb");
fs.mkdirSync(outDir, { recursive: true });

const buffers = [];
const bufferViews = [];
const accessors = [];
const nodes = [];
const meshes = [];
const materials = [
  material("skin", [0.66, 0.43, 0.3, 1]),
  material("hair", [0.08, 0.07, 0.06, 1]),
  material("eye", [0.08, 0.1, 0.12, 1]),
  material("jersey", [0.09, 0.16, 0.26, 1]),
  material("background", [0.04, 0.06, 0.1, 1]),
  material("lip", [0.42, 0.23, 0.22, 1])
];

const head = createHeadMesh();
const headPosition = addAccessor(head.positions, 5126, "VEC3", minMaxVec3(head.positions));
const headIndices = addAccessor(head.indices, 5123, "SCALAR", minMaxScalar(head.indices));
const targets = morphTargets.map((target) => ({
  POSITION: addAccessor(createMorphDelta(head.baseVertices, target), 5126, "VEC3", minMaxVec3(createMorphDelta(head.baseVertices, target)))
}));
meshes.push({
  name: "gameface_neutral_head_v1",
  primitives: [
    {
      attributes: { POSITION: headPosition },
      indices: headIndices,
      material: 0,
      targets
    }
  ],
  weights: morphTargets.map(() => 0),
  extras: { targetNames: morphTargets }
});
nodes.push({ mesh: 0, name: "morphable_head" });

addStaticMesh("neck", createEllipsoid({ rx: 0.3, ry: 0.52, rz: 0.2, y: -1.18, segments: 20, rings: 10 }), 0);
addStaticMesh("jersey_shoulders", createShoulders(), 3);
addStaticMesh("hair_cap", createCap({ rx: 0.68, ry: 0.32, rz: 0.58, y: 0.72 }), 1);
addStaticMesh("left_eye", createEllipsoid({ rx: 0.08, ry: 0.036, rz: 0.026, x: -0.26, y: 0.22, z: 0.58, segments: 12, rings: 6 }), 2);
addStaticMesh("right_eye", createEllipsoid({ rx: 0.08, ry: 0.036, rz: 0.026, x: 0.26, y: 0.22, z: 0.58, segments: 12, rings: 6 }), 2);
addStaticMesh("left_brow", createEllipsoid({ rx: 0.16, ry: 0.026, rz: 0.018, x: -0.27, y: 0.36, z: 0.59, segments: 10, rings: 5 }), 1);
addStaticMesh("right_brow", createEllipsoid({ rx: 0.16, ry: 0.026, rz: 0.018, x: 0.27, y: 0.36, z: 0.59, segments: 10, rings: 5 }), 1);
addStaticMesh("nose_bridge", createEllipsoid({ rx: 0.075, ry: 0.24, rz: 0.075, x: 0, y: -0.04, z: 0.62, segments: 14, rings: 8 }), 0);
addStaticMesh("nose_tip", createEllipsoid({ rx: 0.13, ry: 0.07, rz: 0.085, x: 0, y: -0.22, z: 0.67, segments: 14, rings: 8 }), 0);
addStaticMesh("mouth_upper_lip", createEllipsoid({ rx: 0.24, ry: 0.028, rz: 0.025, x: 0, y: -0.47, z: 0.6, segments: 16, rings: 5 }), 5);
addStaticMesh("mouth_lower_lip", createEllipsoid({ rx: 0.22, ry: 0.034, rz: 0.03, x: 0, y: -0.52, z: 0.6, segments: 16, rings: 5 }), 5);
addStaticMesh("left_ear", createEllipsoid({ rx: 0.075, ry: 0.18, rz: 0.04, x: -0.66, y: 0.02, z: 0.04, segments: 10, rings: 6 }), 0);
addStaticMesh("right_ear", createEllipsoid({ rx: 0.075, ry: 0.18, rz: 0.04, x: 0.66, y: 0.02, z: 0.04, segments: 10, rings: 6 }), 0);
addStaticMesh("facial_hair_shadow", createCap({ rx: 0.3, ry: 0.1, rz: 0.42, y: -0.6, z: 0.16, lowerOnly: true }), 1);
addStaticMesh("portrait_background", createBackground(), 4);

const buffer = Buffer.concat(buffers);
const gltf = {
  asset: {
    version: "2.0",
    generator: "GameFace Match neutral head generator",
    copyright: "Original synthetic GameFace Match runtime asset. No source photos, official game assets, or personal imagery."
  },
  scene: 0,
  scenes: [{ nodes: nodes.map((_, index) => index) }],
  nodes,
  meshes,
  materials,
  buffers: [{ byteLength: buffer.byteLength }],
  bufferViews,
  accessors
};

writeGlb(gltf, buffer, outFile);
console.log(`Generated ${path.relative(process.cwd(), outFile)} with ${morphTargets.length} morph targets.`);

function addStaticMesh(name, mesh, materialIndex) {
  const meshIndex = meshes.length;
  meshes.push({
    name,
    primitives: [
      {
        attributes: { POSITION: addAccessor(mesh.positions, 5126, "VEC3", minMaxVec3(mesh.positions)) },
        indices: addAccessor(mesh.indices, 5123, "SCALAR", minMaxScalar(mesh.indices)),
        material: materialIndex
      }
    ]
  });
  nodes.push({ mesh: meshIndex, name });
}

function createHeadMesh() {
  const positions = [];
  const indices = [];
  const baseVertices = [];
  const rings = 24;
  const segments = 36;
  for (let row = 0; row <= rings; row += 1) {
    const v = row / rings;
    const theta = v * Math.PI;
    const yBase = Math.cos(theta);
    const radius = Math.sin(theta);
    for (let col = 0; col <= segments; col += 1) {
      const u = col / segments;
      const phi = u * Math.PI * 2;
      const lowerTaper = yBase < -0.32 ? 1 - Math.min(0.28, Math.abs(yBase + 0.32) * 0.4) : 1;
      const x = Math.cos(phi) * radius * 0.64 * lowerTaper;
      const z = Math.sin(phi) * radius * 0.54 + 0.04;
      const y = yBase * 0.95;
      positions.push(x, y, z);
      baseVertices.push({ x, y, z });
    }
  }
  for (let row = 0; row < rings; row += 1) {
    for (let col = 0; col < segments; col += 1) {
      const a = row * (segments + 1) + col;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint16Array(indices), baseVertices };
}

function createMorphDelta(vertices, target) {
  const values = [];
  for (const vertex of vertices) {
    const forehead = smooth(vertex.y, 0.26, 0.78);
    const cheek = bell(vertex.y, -0.08, 0.34);
    const jaw = smooth(-vertex.y, 0.24, 0.78);
    const chin = smooth(-vertex.y, 0.7, 0.96);
    const eyeBand = bell(vertex.y, 0.16, 0.32) * smooth(vertex.z, 0.34, 0.62);
    const noseBand = bell(vertex.x, -0.12, 0.12) * bell(vertex.y, -0.2, 0.34) * smooth(vertex.z, 0.36, 0.62);
    const mouthBand = bell(vertex.x, -0.34, 0.34) * bell(vertex.y, -0.42, -0.18) * smooth(vertex.z, 0.36, 0.62);
    let dx = 0;
    let dy = 0;
    let dz = 0;
    if (target === "head_width") dx += vertex.x * 0.18;
    if (target === "head_height") dy += vertex.y * 0.16;
    if (target === "head_depth") dz += (vertex.z - 0.04) * 0.18;
    if (target === "forehead_width") dx += vertex.x * forehead * 0.2;
    if (target === "forehead_height") dy += forehead * 0.1;
    if (target === "cheek_width") dx += vertex.x * cheek * 0.22;
    if (target === "cheek_fullness") dz += cheek * 0.12;
    if (target === "jaw_width") dx += vertex.x * jaw * 0.24;
    if (target === "jaw_angle") dx += Math.sign(vertex.x) * jaw * Math.max(0, -vertex.y - 0.1) * 0.16;
    if (target === "jaw_depth") dz += jaw * 0.1;
    if (target === "chin_width") dx += vertex.x * chin * 0.22;
    if (target === "chin_height") dy -= chin * 0.13;
    if (target === "chin_projection") dz += chin * 0.14;
    if (target === "chin_roundness") {
      dx -= vertex.x * chin * 0.1;
      dy += chin * 0.05;
    }
    if (target === "eye_spacing") dx += Math.sign(vertex.x) * eyeBand * 0.08;
    if (target === "eye_size") dy += (vertex.y > 0.22 ? 1 : -1) * eyeBand * 0.035;
    if (target === "eye_depth") dz -= eyeBand * 0.08;
    if (target === "brow_height") dy += eyeBand * 0.08;
    if (target === "nose_width") dx += vertex.x * noseBand * 0.26;
    if (target === "nose_length") dy -= noseBand * 0.12;
    if (target === "nose_projection") dz += noseBand * 0.18;
    if (target === "nose_bridge_height") dz += noseBand * smooth(vertex.y, 0.0, 0.42) * 0.1;
    if (target === "mouth_width") dx += vertex.x * mouthBand * 0.2;
    if (target === "upper_lip_fullness") dz += mouthBand * smooth(vertex.y, -0.28, -0.12) * 0.06;
    if (target === "lower_lip_fullness") dz += mouthBand * smooth(-vertex.y, 0.24, 0.44) * 0.08;
    if (target === "ear_size") dy += bell(Math.abs(vertex.x), 0.52, 0.66) * bell(vertex.y, -0.05, 0.3) * 0.07;
    if (target === "ear_projection") dx += Math.sign(vertex.x) * bell(Math.abs(vertex.x), 0.52, 0.66) * 0.08;
    if (target === "neck_width") dx += vertex.x * smooth(-vertex.y, 0.5, 0.95) * 0.08;
    values.push(dx, dy, dz);
  }
  return new Float32Array(values);
}

function createEllipsoid({ rx, ry, rz, x = 0, y = 0, z = 0, segments = 18, rings = 10 }) {
  const positions = [];
  const indices = [];
  for (let row = 0; row <= rings; row += 1) {
    const theta = (row / rings) * Math.PI;
    for (let col = 0; col <= segments; col += 1) {
      const phi = (col / segments) * Math.PI * 2;
      positions.push(x + Math.cos(phi) * Math.sin(theta) * rx, y + Math.cos(theta) * ry, z + Math.sin(phi) * Math.sin(theta) * rz);
    }
  }
  for (let row = 0; row < rings; row += 1) {
    for (let col = 0; col < segments; col += 1) {
      const a = row * (segments + 1) + col;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint16Array(indices) };
}

function createCap({ rx, ry, rz, y, z = 0, lowerOnly = false }) {
  const mesh = createEllipsoid({ rx, ry, rz, y, z, segments: 24, rings: 8 });
  const positions = [];
  for (let index = 0; index < mesh.positions.length; index += 3) {
    const vy = mesh.positions[index + 1];
    if (!lowerOnly || vy < y + ry * 0.2) positions.push(mesh.positions[index], vy, mesh.positions[index + 2]);
    else positions.push(mesh.positions[index], y + ry * 0.2, mesh.positions[index + 2]);
  }
  return { positions: new Float32Array(positions), indices: mesh.indices };
}

function createShoulders() {
  return {
    positions: new Float32Array([-1.45, -1.7, 0, 1.45, -1.7, 0, 0.7, -0.95, 0.08, -0.7, -0.95, 0.08, -0.26, -0.76, 0.14, 0.26, -0.76, 0.14]),
    indices: new Uint16Array([0, 1, 2, 0, 2, 3, 3, 2, 5, 3, 5, 4])
  };
}

function createBackground() {
  return {
    positions: new Float32Array([-1.8, -1.8, -0.9, 1.8, -1.8, -0.9, 1.8, 1.8, -0.9, -1.8, 1.8, -0.9]),
    indices: new Uint16Array([0, 1, 2, 0, 2, 3])
  };
}

function material(name, color) {
  return {
    name,
    pbrMetallicRoughness: {
      baseColorFactor: color,
      metallicFactor: 0.02,
      roughnessFactor: 0.62
    }
  };
}

function addAccessor(array, componentType, type, bounds) {
  const byteOffset = alignBuffer();
  const byteLength = array.byteLength;
  buffers.push(Buffer.from(array.buffer));
  const bufferViewIndex = bufferViews.length;
  bufferViews.push({ buffer: 0, byteOffset, byteLength });
  const accessorIndex = accessors.length;
  accessors.push({
    bufferView: bufferViewIndex,
    byteOffset: 0,
    componentType,
    count: componentType === 5123 ? array.length : array.length / 3,
    type,
    min: bounds.min,
    max: bounds.max
  });
  return accessorIndex;
}

function alignBuffer() {
  const length = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const padding = (4 - (length % 4)) % 4;
  if (padding) buffers.push(Buffer.alloc(padding));
  return length + padding;
}

function minMaxVec3(array) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < array.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], array[index + axis]);
      max[axis] = Math.max(max[axis], array[index + axis]);
    }
  }
  return { min, max };
}

function minMaxScalar(array) {
  return { min: [Math.min(...array)], max: [Math.max(...array)] };
}

function smooth(value, edge0, edge1) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function bell(value, min, max) {
  const center = (min + max) / 2;
  const half = (max - min) / 2;
  return Math.max(0, 1 - Math.abs(value - center) / half);
}

function writeGlb(json, binary, file) {
  const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPadding = (4 - (jsonBuffer.byteLength % 4)) % 4;
  const binPadding = (4 - (binary.byteLength % 4)) % 4;
  const totalLength = 12 + 8 + jsonBuffer.byteLength + jsonPadding + 8 + binary.byteLength + binPadding;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuffer.byteLength + jsonPadding, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.byteLength + binPadding, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(file, Buffer.concat([header, jsonHeader, jsonBuffer, Buffer.alloc(jsonPadding, 0x20), binHeader, binary, Buffer.alloc(binPadding)]));
}
