/**
 * Three.js spike renderer (THROWAWAY — Phase 0 of issue #22).
 *
 * Consumes a {@link TopologyScene} and renders its elements as swept solids
 * (β-strands → ribbons, helices → cylinders, coil → thin tubes). A single morph
 * parameter `t ∈ [0,1]` rolls the flat 2-D layout up into the real 3-D structure
 * via a travelling wavefront, while the camera eases from near-orthographic to a
 * ~35 mm-equivalent perspective.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SceneElement, TopologyScene } from './scene.js';

const COLOURS: Record<SceneElement['type'], number> = {
  helix: 0x6e8db6,
  strand: 0x6ea76d,
  coil: 0x888888,
};

// Cross-section dimensions (Å). Strand ribbon ~1 nm wide × 0.25 nm thick.
const STRAND_HALF_W = 5;
const STRAND_HALF_D = 1.25;
const ARROW_HALF_W = 8.5;
const ARROW_LEN = 9;
const HELIX_RADIUS = 2.6;
const COIL_RADIUS = 0.7;
const WAVEFRONT = 0.35;

interface ElementRender {
  type: SceneElement['type'];
  flat: THREE.Vector3[];
  solid: THREE.Vector3[];
  arcFrac: number[];
  /** Per-sample cross-section vertices count. */
  ring: number;
  /** Per-sample half-width (ribbon) / radius scale. */
  halfW: number[];
  halfD: number;
  geometry: THREE.BufferGeometry;
  mesh: THREE.Mesh;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class SpikeView {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly group = new THREE.Group();
  private membrane: THREE.Mesh | null = null;
  private elements: ElementRender[] = [];
  private topo: TopologyScene | null = null;
  private t = 0;
  private membraneHalf = 15;
  /** Radius of a sphere about the origin bounding all protein elements. */
  private sceneRadius = 60;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene.background = new THREE.Color(0xf4f6f8);
    this.scene.add(this.group);

    this.camera = new THREE.PerspectiveCamera(8, 1, 0.1, 50000);
    // Default to a gentle 3/4 view (azimuth ~30°, elevation ~14°) so the rolled
    // structure reads as 3-D; per-frame framing only rescales the distance, so
    // this orientation (and any the user orbits to) is preserved.
    const az = THREE.MathUtils.degToRad(30);
    const el = THREE.MathUtils.degToRad(14);
    this.camera.position.set(
      Math.sin(az) * Math.cos(el),
      Math.sin(el),
      Math.cos(az) * Math.cos(el),
    );

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    // Lighting: soft ambient + two directionals for shape readability.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(1, 1.4, 1);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-1, -0.5, -0.8);
    this.scene.add(fill);

    container.appendChild(this.renderer.domElement);
    this.resize();
    window.addEventListener('resize', this.resize);
    this.animate();
  }

  private resize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight || Math.round(w * 0.6);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  setScene(topo: TopologyScene): void {
    // Tear down previous.
    for (const el of this.elements) {
      this.group.remove(el.mesh);
      el.geometry.dispose();
      (el.mesh.material as THREE.Material).dispose();
    }
    this.elements = [];
    if (this.membrane) {
      this.group.remove(this.membrane);
      this.membrane.geometry.dispose();
    }

    this.topo = topo;
    this.membraneHalf = topo.membraneHalf;

    for (const el of topo.elements) {
      this.elements.push(this.buildElement(el, topo.arcSpan));
    }
    this.buildMembrane(topo);
    this.updateMorph();
  }

  private buildElement(el: SceneElement, arcSpan: number): ElementRender {
    const flat = el.samples.map((s) => new THREE.Vector3(...s.flat));
    const solid = el.samples.map((s) => new THREE.Vector3(...s.solid));
    const arcFrac = el.samples.map((s) => s.arc / (arcSpan || 1));

    let ring: number;
    let halfD = 0;
    const halfW: number[] = [];
    if (el.type === 'strand') {
      ring = 4; // rectangular ribbon section
      halfD = STRAND_HALF_D;
      const n = el.samples.length;
      // Reverse arc-distance from the C-terminal tip for the arrowhead taper.
      for (let i = 0; i < n; i++) {
        if (!el.arrow) {
          halfW.push(STRAND_HALF_W);
          continue;
        }
        const dToTip = (n - 1 - i) * (1 / (n - 1)) * approxLen(flat);
        halfW.push(dToTip > ARROW_LEN ? STRAND_HALF_W : ARROW_HALF_W * (dToTip / ARROW_LEN));
      }
    } else {
      ring = 10; // circular tube section
      const r = el.type === 'helix' ? HELIX_RADIUS : COIL_RADIUS;
      for (let i = 0; i < el.samples.length; i++) halfW.push(r);
      halfD = el.type === 'helix' ? HELIX_RADIUS : COIL_RADIUS;
    }

    const geometry = new THREE.BufferGeometry();
    const segs = el.samples.length - 1;
    const idx: number[] = [];
    for (let i = 0; i < segs; i++) {
      for (let k = 0; k < ring; k++) {
        const a = i * ring + k;
        const b = i * ring + ((k + 1) % ring);
        const c = (i + 1) * ring + k;
        const d = (i + 1) * ring + ((k + 1) % ring);
        idx.push(a, c, b, b, c, d);
      }
    }
    geometry.setIndex(idx);
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(el.samples.length * ring * 3), 3),
    );

    const material = new THREE.MeshStandardMaterial({
      color: COLOURS[el.type],
      roughness: 0.55,
      metalness: 0.0,
      side: THREE.DoubleSide,
      flatShading: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.group.add(mesh);
    return { type: el.type, flat, solid, arcFrac, ring, halfW, halfD, geometry, mesh };
  }

  private buildMembrane(topo: TopologyScene): void {
    const w = Math.max(topo.flatHalfWidth, topo.solidRadius) * 2.2;
    const depth = Math.max(topo.solidRadius * 2.2, 30);
    const geo = new THREE.BoxGeometry(w, topo.membraneHalf * 2, depth);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcfd6dd,
      transparent: true,
      opacity: 0.22,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    this.membrane = new THREE.Mesh(geo, mat);
    this.group.add(this.membrane);
  }

  setT(t: number): void {
    this.t = Math.max(0, Math.min(1, t));
    this.updateMorph();
  }

  /** Recompute morphed centrelines and rebuild swept geometry positions. */
  private updateMorph(): void {
    for (const el of this.elements) {
      const pts = el.flat.map((f, i) => {
        const local = THREE.MathUtils.clamp(
          (this.t * (1 + WAVEFRONT) - el.arcFrac[i]) / WAVEFRONT,
          0,
          1,
        );
        return new THREE.Vector3().lerpVectors(f, el.solid[i], smooth(local));
      });
      this.writeSweep(el, pts);
    }
    // Bounding sphere about the origin over all protein elements, for framing.
    let r = this.membraneHalf;
    for (const el of this.elements) {
      const bs = el.geometry.boundingSphere;
      if (bs) r = Math.max(r, bs.center.length() + bs.radius);
    }
    this.sceneRadius = r;
  }

  /** Sweep the cross-section along `pts`, writing into the element's geometry. */
  private writeSweep(el: ElementRender, pts: THREE.Vector3[]): void {
    const pos = el.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const up = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3();
    const bin = new THREE.Vector3();
    const nor = new THREE.Vector3();

    for (let i = 0; i < pts.length; i++) {
      // Tangent by central difference.
      if (i === 0) tangent.subVectors(pts[1], pts[0]);
      else if (i === pts.length - 1) tangent.subVectors(pts[i], pts[i - 1]);
      else tangent.subVectors(pts[i + 1], pts[i - 1]);
      tangent.normalize();
      // Frame seeded from world up so ribbon width stays roughly horizontal.
      bin.crossVectors(tangent, up);
      if (bin.lengthSq() < 1e-6) bin.set(1, 0, 0);
      bin.normalize();
      nor.crossVectors(bin, tangent).normalize();

      const base = i * el.ring * 3;
      const w = el.halfW[i];
      if (el.ring === 4) {
        // Rectangle: +w+d, +w-d, -w-d, -w+d
        const corners: [number, number][] = [
          [w, el.halfD],
          [w, -el.halfD],
          [-w, -el.halfD],
          [-w, el.halfD],
        ];
        for (let k = 0; k < 4; k++) {
          const [cw, cd] = corners[k];
          arr[base + k * 3] = pts[i].x + bin.x * cw + nor.x * cd;
          arr[base + k * 3 + 1] = pts[i].y + bin.y * cw + nor.y * cd;
          arr[base + k * 3 + 2] = pts[i].z + bin.z * cw + nor.z * cd;
        }
      } else {
        const r = w; // radius
        for (let k = 0; k < el.ring; k++) {
          const a = (k / el.ring) * Math.PI * 2;
          const cw = Math.cos(a) * r;
          const cd = Math.sin(a) * r;
          arr[base + k * 3] = pts[i].x + bin.x * cw + nor.x * cd;
          arr[base + k * 3 + 1] = pts[i].y + bin.y * cw + nor.y * cd;
          arr[base + k * 3 + 2] = pts[i].z + bin.z * cw + nor.z * cd;
        }
      }
    }
    pos.needsUpdate = true;
    el.geometry.computeVertexNormals();
    el.geometry.computeBoundingSphere();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    // Camera ease: near-orthographic (long lens) at the flat end → ~35 mm-equiv
    // perspective at the 3-D end.
    const e = smooth(this.t);
    const fov = lerp(8, 50, e);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    // Frame the bounding sphere of the current morph state: the flat layout is a
    // wide thin strip (large radius, seen edge-on), the rolled structure is
    // compact. Vertical fov is the tighter dimension (aspect ≥ 1), so it bounds.
    const fovR = THREE.MathUtils.degToRad(fov);
    const dist = (this.sceneRadius / Math.sin(fovR / 2)) * 1.06;
    this.camera.position.setLength(dist);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

/** Smoothstep for gentle ease at the wavefront edges. */
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Rough polyline length (Å), for the strand arrowhead taper. */
function approxLen(pts: THREE.Vector3[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]);
  return L;
}
